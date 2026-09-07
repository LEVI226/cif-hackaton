"""Charge le jeu de donnees synthetique du corpus CIF (clients, comptes, mandats,
listes de surveillance) - PAS les operations : celles-ci sont volontairement
laissees pour la demo live (POST /transactions reel, pas un import silencieux),
conformement au TDR ("demonstration live... pas seulement des diapositives").

Usage :
    python seed_corpus_demo.py [chemin_vers_dataset_demo]

Par defaut, lit depuis le corpus prepare pour le hackathon :
    C:/Users/ulric/Documents/cifHackathon/corpusCIF/topic1_lbc_ft/05_jeu_donnees_synthetique/dataset_demo
"""
from __future__ import annotations

import csv
import sys
from datetime import date, datetime
from pathlib import Path

from app.database import Base, SessionLocal, engine
from app.models.account import Account, AccountStatus
from app.models.client import Client
from app.models.mandat import Mandat, MandatStatut
from app.models.sanctions import PPEEntry, SanctionEntry
from app.models.sfd import SFD, Country
from app.models.user import StaffUser
from app.services.fid_allocator import allocate_fid
from app.services.screening_service import run_screening
from app.services.security import Role, hash_password

DEFAULT_DATASET_DIR = Path(
    r"C:/Users/ulric/Documents/cifHackathon/corpusCIF/topic1_lbc_ft/05_jeu_donnees_synthetique/dataset_demo"
)

# caisse_id (dataset) -> (code SFD 4 chiffres, zone-appropriate defaults deja
# dans caisses.csv, mais le code lui-meme n'existe pas dans le corpus - on
# l'attribue ici, une seule fois, de facon stable).
CAISSE_CODE = {
    "CAISSE_DORI": "0100",
    "CAISSE_BANFORA": "0200",
    "CAISSE_OUAGA": "0300",
    "CAISSE_COTONOU": "0400",
}

COUNTRY_NAME_TO_CODE = {
    "Burkina Faso": "BF",
    "Benin": "BJ",
    "Mali": "ML",  # nationalites de clients, pas forcement une caisse du dataset
}

DEMO_PASSWORD = "Demo2026!"


def _read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def _split_nom_prenom(full_name: str, type_client: str) -> tuple[str, str]:
    if type_client == "MORALE":
        return full_name.strip(), ""
    parts = full_name.strip().split(" ", 1)
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


def _parse_date(value: str) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def main(dataset_dir: Path) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    countries_needed = set(COUNTRY_NAME_TO_CODE.values())
    for code in countries_needed:
        if db.get(Country, code) is None:
            name = next(n for n, c in COUNTRY_NAME_TO_CODE.items() if c == code)
            db.add(Country(code=code, name=name))
    db.flush()

    sfd_by_caisse_id: dict[str, SFD] = {}
    for row in _read_csv(dataset_dir / "caisses.csv"):
        code = CAISSE_CODE[row["caisse_id"]]
        sfd = db.query(SFD).filter(SFD.code == code).first()
        if sfd is None:
            sfd = SFD(
                code=code,
                name=row["nom"],
                country_code=COUNTRY_NAME_TO_CODE[row["pays"]],
                next_client_seq=1,
            )
        sfd.zone_risque = row["zone_risque"]
        sfd.seuil_depot = float(row["seuil_depot"])
        sfd.seuil_retrait = float(row["seuil_retrait"])
        db.add(sfd)
        db.flush()
        sfd_by_caisse_id[row["caisse_id"]] = sfd
    db.commit()
    print(f"Caisses: {len(sfd_by_caisse_id)}")

    fid_by_global_id: dict[str, str] = {}
    for row in _read_csv(dataset_dir / "clients.csv"):
        sfd = sfd_by_caisse_id[row["caisse_origine"]]
        type_client = "MORALE" if row["type_client"] == "personne_morale" else "PHYSIQUE"
        nom, prenom = _split_nom_prenom(row["nom"], type_client)
        fid = allocate_fid(db, sfd)
        score = int(row["score_risque_initial"])
        niveau = "ELEVE" if score >= 70 else "MOYEN" if score >= 40 else "FAIBLE"
        db.add(
            Client(
                fid=fid,
                nom=nom,
                prenom=prenom,
                date_naissance=_parse_date(row["date_naissance"]),
                nationalite=COUNTRY_NAME_TO_CODE.get(row["nationalite"], row["nationalite"][:2].upper()),
                type_client=type_client,
                profession=row["activite"] or None,
                secteur_activite=row["activite"] or None,
                est_ppe=row["statut_ppe"] == "true",
                niveau_risque_initial=niveau,
                created_by_sfd_id=sfd.id,
                external_ids={
                    "corpus_global_client_id": row["global_client_id"],
                    "corpus_score_risque_initial": row["score_risque_initial"],
                },
            )
        )
        fid_by_global_id[row["global_client_id"]] = fid
    db.commit()
    print(f"Clients: {len(fid_by_global_id)}")

    for row in _read_csv(dataset_dir / "pieces_identite.csv"):
        fid = fid_by_global_id.get(row["global_client_id"])
        if fid is None:
            continue
        client = db.get(Client, fid)
        client.type_piece = row["type_piece"].upper()
        client.numero_piece = row["numero_fictif"]
        client.date_expiration_piece = _parse_date(row["date_expiration"])
        db.add(client)
    db.commit()
    print("Pieces d'identite rattachees.")

    be_by_client: dict[str, list[dict]] = {}
    for row in _read_csv(dataset_dir / "beneficiaires_effectifs.csv"):
        be_by_client.setdefault(row["global_client_id"], []).append(row)
    for global_id, entries in be_by_client.items():
        fid = fid_by_global_id.get(global_id)
        if fid is None:
            continue
        client = db.get(Client, fid)
        # Priorite au BE marque PPE (c'est celui qui compte pour le filtrage) -
        # sinon le detenteur majoritaire.
        chosen = next((e for e in entries if e["statut_ppe"] == "true"), entries[0])
        client.beneficiaire_effectif_nom = chosen["nom"]
        client.beneficiaire_effectif_part = float(chosen["part_detention"])
        client.beneficiaire_effectif_ppe = chosen["statut_ppe"] == "true"
        db.add(client)
    db.commit()
    print(f"Beneficiaires effectifs rattaches: {len(be_by_client)} client(s) morale(s).")

    account_by_compte_id: dict[str, Account] = {}
    for row in _read_csv(dataset_dir / "comptes.csv"):
        fid = fid_by_global_id[row["global_client_id"]]
        sfd = sfd_by_caisse_id[row["caisse_id"]]
        account = Account(
            numero_compte=row["compte_id"],
            client_fid=fid,
            sfd_id=sfd.id,
            type_compte=row["type_produit"],
            statut=AccountStatus.ACTIF if row["statut"] == "actif" else AccountStatus.BLOQUE,
            date_ouverture=_parse_date(row["date_ouverture"]) or date.today(),
            solde=float(row["solde"]),
        )
        db.add(account)
        db.flush()
        account_by_compte_id[row["compte_id"]] = account
    db.commit()
    print(f"Comptes: {len(account_by_compte_id)}")

    mandat_count = 0
    for row in _read_csv(dataset_dir / "mandats_procurations.csv"):
        fid = fid_by_global_id.get(row["global_client_id"])
        if fid is None:
            continue
        db.add(
            Mandat(
                client_fid=fid,
                mandataire_nom=row["mandataire_nom"],
                mandataire_piece=row["mandataire_piece"],
                date_debut=_parse_date(row["date_debut"]),
                date_fin=_parse_date(row["date_fin"]),
                plafond=float(row["plafond"]),
                statut=MandatStatut.VALIDE if row["statut"] == "valide" else MandatStatut.EXPIRE,
            )
        )
        mandat_count += 1
    db.commit()
    print(f"Mandats: {mandat_count}")

    sanction_count = ppe_count = 0
    for row in _read_csv(dataset_dir / "listes_surveillance_synthetiques.csv"):
        aliases = [row["alias"]] if row["alias"] else []
        if row["type_liste"] == "sanction":
            db.add(SanctionEntry(source="CORPUS_DEMO", full_name=row["nom"], aliases=aliases))
            sanction_count += 1
        else:
            db.add(
                PPEEntry(
                    full_name=row["nom"],
                    fonction="PPE (jeu de donnees demo)",
                    pays=COUNTRY_NAME_TO_CODE.get(row["pays"], "BF"),
                )
            )
            ppe_count += 1
    db.commit()
    print(f"Listes de surveillance: {sanction_count} sanctions, {ppe_count} PPE.")

    # Filtrage automatique de chaque client importe, comme le ferait
    # POST /clients en conditions reelles - sans ce passage, aucune alerte
    # n'existerait avant le tout premier appel de la demo live.
    alert_count = 0
    for global_id, fid in fid_by_global_id.items():
        client = db.get(Client, fid)
        _result, alert = run_screening(db, f"{client.prenom} {client.nom}", client_fid=fid)
        if alert is not None:
            alert_count += 1
    db.commit()
    print(f"Filtrage initial : {alert_count} alerte(s) ouverte(s) sur {len(fid_by_global_id)} client(s).")

    staff_count = 0
    for caisse_id, sfd in sfd_by_caisse_id.items():
        slug = caisse_id.replace("CAISSE_", "").lower()
        for role, suffix in [
            (Role.AGENT_GUICHET, "guichet"),
            (Role.AGENT_CONFORMITE, "conformite"),
            (Role.SUPERVISEUR_SFD, "superviseur"),
        ]:
            username = f"{suffix}_{slug}"
            if db.query(StaffUser).filter(StaffUser.username == username).first():
                continue
            db.add(
                StaffUser(
                    username=username,
                    password_hash=hash_password(DEMO_PASSWORD),
                    role=role,
                    sfd_id=sfd.id,
                )
            )
            staff_count += 1
    for username, role in [
        ("conformite_reseau", Role.CONFORMITE_RESEAU),
        ("auditeur_reseau", Role.AUDITEUR),
        ("admin_reseau", Role.ADMIN_RESEAU),
    ]:
        if db.query(StaffUser).filter(StaffUser.username == username).first():
            continue
        db.add(StaffUser(username=username, password_hash=hash_password(DEMO_PASSWORD), role=role, sfd_id=None))
        staff_count += 1
    db.commit()
    print(f"Comptes utilisateurs demo: {staff_count} (mot de passe unique : {DEMO_PASSWORD})")

    print()
    print("FID par client (pour le script de demo) :")
    for global_id, fid in fid_by_global_id.items():
        print(f"  {global_id} -> {fid}")

    print()
    print("Cas a retenir pour la demo :")
    print("  GCLI_001 KABORE AMADOU : comptes a Dori + Banfora, solde consolide 1 405 000 FCFA")
    print("  GCLI_001 nom proche de la sanction 'KABRE AMADOU' (homonymie)")
    print("  GCLI_002 OUEDRAOGO SALIFOU : mandat MAND_002 EXPIRE (retrait par procuration a bloquer)")
    print("  GCLI_002 piece CNIB expiree (2026-08-31)")
    print("  GCLI_003 DIALLO MAMADOU : alias JALLO MAMADOU sur la liste de sanctions")
    print("  GCLI_006 SOCIETE SAHEL TRADING (personne morale) : beneficiaire effectif SANKARA MARIAM, PPE")
    print("  GCLI_008 MAIGA OUSMANE : alias proche de la sanction 'MAIGA OUMAR / OUMAR MAIGA'")
    print()
    print("Operations (operations.csv) : a rejouer EN DIRECT via POST /transactions pendant la")
    print("demo, pas importees ici - c'est la demonstration live exigee par le TDR.")

    db.close()


if __name__ == "__main__":
    dataset_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DATASET_DIR
    if not dataset_dir.exists():
        raise SystemExit(f"Dataset introuvable : {dataset_dir}")
    main(dataset_dir)

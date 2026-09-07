from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.client import Client
from app.models.sfd import SFD
from app.models.transaction import Transaction
from app.schemas.client import (
    AccountBalance,
    ActiviteClientOut,
    ClientCreate,
    ClientOut,
    MouvementOut,
    SoldeGlobalOut,
)
from app.services.anomaly import FENETRE_CLASSIFICATION_JOURS, classify_client_activity
from app.services.audit import log_action
from app.services.fid_allocator import allocate_fid
from app.services.fuzzy_match import normalize_name
from app.services.idempotency import with_idempotency
from app.services.kyc import beneficiaire_effectif_manquant, piece_expiree
from app.services.screening_service import run_screening
from app.services.security import LOCAL_ROLES, Role, TokenPayload, require_roles
from app.services.visibility import (
    client_has_live_alert,
    client_visible_to_local_role,
    mask_name,
    resolve_view,
)

router = APIRouter(prefix="/clients", tags=["clients"])

_CAN_CREATE = require_roles(Role.AGENT_GUICHET, Role.SUPERVISEUR_SFD)
# Deliberement SANS ADMIN_RESEAU : separation des taches - l'admin gere les listes
# et les seuils, pas la donnee client (cf. corpus, matrice de visibilite).
_CAN_READ = require_roles(
    Role.AGENT_GUICHET,
    Role.AGENT_CONFORMITE,
    Role.SUPERVISEUR_SFD,
    Role.CONFORMITE_RESEAU,
    Role.AUDITEUR,
)


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_CREATE),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict:
    if user.sfd_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Utilisateur non rattache a une SFD")
    sfd = db.get(SFD, int(user.sfd_id))
    if sfd is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "SFD introuvable pour cet utilisateur")

    def _create() -> dict:
        fid = allocate_fid(db, sfd)
        # Tous les champs de la fiche KYC (etat civil, piece, coordonnees,
        # activite, filtrage AML, personne morale) partagent leur nom entre le
        # schema et le modele - cf. app.schemas.client.ClientFieldsOptional.
        client = Client(
            fid=fid,
            created_by_sfd_id=sfd.id,
            **payload.model_dump(),
        )
        if piece_expiree(client):
            raise HTTPException(status.HTTP_409_CONFLICT, "Piece d'identite expiree - ouverture bloquee")
        if beneficiaire_effectif_manquant(client):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Beneficiaire effectif manquant - ouverture personne morale bloquee",
            )
        db.add(client)

        # Filtrage automatique du nom a la creation (F1/F2 du Plan) - le resultat et
        # une eventuelle alerte sont persistes, mais ne bloquent jamais la creation :
        # une alerte BLOQUANTE verrouillera les comptes, pas l'enregistrement du client.
        run_screening(db, f"{payload.prenom} {payload.nom}", client_fid=fid)
        log_action(db, user, "CREATE_CLIENT", "Client", fid, {"nom": payload.nom}, sfd_id=sfd.id)

        db.commit()
        db.refresh(client)
        return ClientOut.model_validate(client).model_dump(mode="json")

    # Rejeu sur reconnexion (cf. Idempotency-Key) : ne re-attribue jamais un
    # deuxieme FID pour la meme creation posee hors-ligne.
    return with_idempotency(db, idempotency_key, "POST /clients", _create)


@router.get("/search", response_model=list[ClientOut])
def search_clients(
    q: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> list[dict]:
    normalized_query = normalize_name(q)
    query_upper = q.strip().upper()
    results: list[dict] = []
    for client in db.query(Client).all():
        if user.role in LOCAL_ROLES:
            if not client_visible_to_local_role(db, user.sfd_id, client):
                continue
            if normalized_query not in normalize_name(f"{client.prenom} {client.nom}"):
                continue
            results.append(ClientOut.model_validate(client).model_dump(mode="json"))
            continue

        # Role reseau : le nom reel n'est jamais expose par une recherche texte -
        # on peut retrouver un client par FID (venant par ex. d'une alerte), et le
        # nom n'est en clair que si une alerte vivante justifie de le voir
        # ("Nom client local : masque sauf alerte critique").
        fid_match = query_upper in client.fid
        has_live_alert = client_has_live_alert(db, client.fid)
        name_match = has_live_alert and normalized_query in normalize_name(
            f"{client.prenom} {client.nom}"
        )
        if not (fid_match or name_match):
            continue

        record = ClientOut.model_validate(client).model_dump(mode="json")
        if not has_live_alert:
            record["nom"], record["prenom"] = mask_name(client.nom, client.prenom)
            record["nom_masque"] = True
        results.append(record)
    return results


@router.get("/{fid}", response_model=ClientOut)
def get_client(
    fid: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> dict:
    """Fiche client complete (KYC) - soumise a la meme visibilite differenciee
    que la recherche : un role local doit avoir un compte dans sa SFD, un role
    reseau ne voit le nom en clair que si une alerte vivante le justifie."""
    client = db.get(Client, fid)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")

    if user.role in LOCAL_ROLES:
        if not client_visible_to_local_role(db, user.sfd_id, client):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Client hors perimetre SFD")
        return ClientOut.model_validate(client).model_dump(mode="json")

    record = ClientOut.model_validate(client).model_dump(mode="json")
    if not client_has_live_alert(db, fid):
        record["nom"], record["prenom"] = mask_name(client.nom, client.prenom)
        record["nom_masque"] = True
    return record


@router.get("/{fid}/solde-global", response_model=SoldeGlobalOut)
def get_solde_global(
    fid: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> SoldeGlobalOut:
    client = db.get(Client, fid)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")
    if user.role in LOCAL_ROLES and not client_visible_to_local_role(db, user.sfd_id, client):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Client hors perimetre SFD")

    vue = resolve_view(db, user.role, user.sfd_id, fid)
    accounts = db.query(Account).filter(Account.client_fid == fid).all()

    comptes: list[AccountBalance] = []
    masques = 0
    for a in accounts:
        is_local = user.sfd_id is not None and a.sfd_id == int(user.sfd_id)
        visible = vue == "RESEAU" or is_local
        if visible:
            comptes.append(
                AccountBalance(
                    numero_compte=a.numero_compte, sfd_code=a.sfd.code, statut=a.statut,
                    solde=float(a.solde), visible=True,
                )
            )
        else:
            comptes.append(
                AccountBalance(
                    numero_compte="***", sfd_code=a.sfd.code, statut=a.statut,
                    solde=None, visible=False,
                )
            )
            masques += 1

    # "Solde global reseau : Non" pour un role local sans deblocage - le total
    # affiche reste celui de la SFD de l'utilisateur, jamais le vrai total reseau.
    solde_total = sum(c.solde for c in comptes if c.solde is not None)

    if masques:
        from app.services.audit import log_action

        log_action(
            db, user, "CONSULTATION_SENSIBLE", "Client", fid,
            {"endpoint": "solde-global", "vue": vue, "comptes_masques": masques},
        )
        db.commit()

    return SoldeGlobalOut(
        fid=fid, vue=vue, solde_total=solde_total, comptes=comptes, comptes_masques=masques,
    )


@router.get("/{fid}/mouvements", response_model=ActiviteClientOut)
def get_activite_client(
    fid: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> ActiviteClientOut:
    """Suivi des mouvements + classification occasionnel/habituel, a travers
    toutes les SFD ou le client detient un compte (cf. TDR, Thematique 01)."""
    client = db.get(Client, fid)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")
    if user.role in LOCAL_ROLES and not client_visible_to_local_role(db, user.sfd_id, client):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Client hors perimetre SFD")

    vue = resolve_view(db, user.role, user.sfd_id, fid)
    accounts = db.query(Account).filter(Account.client_fid == fid).all()
    account_by_id = {a.id: a for a in accounts}

    transactions = (
        db.query(Transaction)
        .filter(Transaction.account_id.in_(account_by_id.keys()))
        .order_by(Transaction.date.desc())
        .all()
        if account_by_id
        else []
    )

    window_start = datetime.now(timezone.utc) - timedelta(days=FENETRE_CLASSIFICATION_JOURS)
    # SQLite ne conserve pas l'offset de fuseau : une valeur relue peut revenir
    # naive meme si elle a ete ecrite avec tzinfo=utc. On la re-attache avant de
    # comparer plutot que de laisser Python lever TypeError.
    # La classification occasionnel/habituel porte sur TOUT le reseau, meme
    # masque - c'est un compte, pas une donnee client (cf. TDR : recensement
    # reseau explicitement demande, indépendant de la visibilite differenciee).
    recent_count = sum(
        1
        for t in transactions
        if (t.date if t.date.tzinfo else t.date.replace(tzinfo=timezone.utc)) >= window_start
    )

    mouvements: list[MouvementOut] = []
    masques = 0
    for t in transactions:
        account = account_by_id[t.account_id]
        is_local = user.sfd_id is not None and account.sfd_id == int(user.sfd_id)
        if vue == "RESEAU" or is_local:
            if len(mouvements) < 50:
                mouvements.append(
                    MouvementOut(
                        numero_compte=account.numero_compte, sfd_code=account.sfd.code,
                        montant=float(t.montant), type=t.type, date=t.date,
                    )
                )
        else:
            masques += 1

    if masques:
        from app.services.audit import log_action

        log_action(
            db, user, "CONSULTATION_SENSIBLE", "Client", fid,
            {"endpoint": "mouvements", "vue": vue, "mouvements_masques": masques},
        )
        db.commit()

    return ActiviteClientOut(
        fid=fid,
        vue=vue,
        mouvements_masques=masques,
        classification=classify_client_activity(recent_count),
        nb_operations_recentes=recent_count,
        fenetre_jours=FENETRE_CLASSIFICATION_JOURS,
        mouvements=mouvements,
    )

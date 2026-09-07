from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import JSON, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Client(Base):
    """La personne physique - identifiee par son FID, seule entite qui traverse les SFD.

    external_ids conserve un NIP national ou un futur WURI des qu'il est disponible,
    sans que le reseau CIF en depende (cf. PRD, section Identifiant unique).
    """

    __tablename__ = "clients"

    fid: Mapped[str] = mapped_column(String(32), primary_key=True)
    nom: Mapped[str] = mapped_column(String(128))
    prenom: Mapped[str] = mapped_column(String(128))
    date_naissance: Mapped[date | None] = mapped_column(Date, nullable=True)
    nationalite: Mapped[str | None] = mapped_column(String(2), nullable=True)
    type_client: Mapped[str] = mapped_column(String(16), default="PHYSIQUE")  # PHYSIQUE | MORALE
    statut_relation: Mapped[str] = mapped_column(String(16), default="CLIENT")  # MEMBRE | CLIENT | OCCASIONNEL

    # --- Etat civil (fiche KYC, section 2) ---
    sexe: Mapped[str | None] = mapped_column(String(1), nullable=True)  # M | F
    lieu_naissance: Mapped[str | None] = mapped_column(String(128), nullable=True)
    situation_matrimoniale: Mapped[str | None] = mapped_column(String(16), nullable=True)
    nb_personnes_charge: Mapped[int | None] = mapped_column(nullable=True)
    nom_pere: Mapped[str | None] = mapped_column(String(128), nullable=True)
    nom_mere: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # --- Piece d'identite (section 3) - regle R004 : une piece expiree bloque
    # l'ouverture de compte et le retrait (cf. services/kyc.py). ---
    type_piece: Mapped[str | None] = mapped_column(String(16), nullable=True)
    numero_piece: Mapped[str | None] = mapped_column(String(64), nullable=True)
    date_delivrance_piece: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_expiration_piece: Mapped[date | None] = mapped_column(Date, nullable=True)
    lieu_delivrance_piece: Mapped[str | None] = mapped_column(String(128), nullable=True)
    copie_piece_verifiee: Mapped[bool] = mapped_column(default=False)

    # --- Coordonnees (section 4) ---
    telephone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(128), nullable=True)
    adresse: Mapped[str | None] = mapped_column(String(256), nullable=True)
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    province: Mapped[str | None] = mapped_column(String(64), nullable=True)
    commune: Mapped[str | None] = mapped_column(String(64), nullable=True)
    secteur_quartier: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # --- Activite et revenus (section 5) - alimente le score de risque KYC. ---
    profession: Mapped[str | None] = mapped_column(String(128), nullable=True)
    secteur_activite: Mapped[str | None] = mapped_column(String(32), nullable=True)
    employeur_activite: Mapped[str | None] = mapped_column(String(256), nullable=True)
    revenu_mensuel_estime: Mapped[float | None] = mapped_column(nullable=True)
    autres_revenus: Mapped[str | None] = mapped_column(String(256), nullable=True)
    patrimoine_estime: Mapped[float | None] = mapped_column(nullable=True)

    # --- Relation d'affaires attendue (section 6) - sert de reference pour
    # detecter un flux incoherent avec le profil declare (regle R013). ---
    source_fonds: Mapped[str | None] = mapped_column(String(32), nullable=True)
    destination_fonds: Mapped[str | None] = mapped_column(String(256), nullable=True)
    frequence_attendue: Mapped[str | None] = mapped_column(String(16), nullable=True)  # FAIBLE | MOYENNE | ELEVEE

    # --- Filtrage AML/CFT/PPE (section 7) ---
    est_ppe: Mapped[bool] = mapped_column(default=False)
    proche_ppe: Mapped[bool] = mapped_column(default=False)
    zone_haut_risque: Mapped[str | None] = mapped_column(String(128), nullable=True)
    niveau_risque_initial: Mapped[str] = mapped_column(String(16), default="FAIBLE")  # FAIBLE | MOYEN | ELEVE

    # --- Personne morale (section 8) ---
    forme_juridique: Mapped[str | None] = mapped_column(String(16), nullable=True)
    rccm: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ifu: Mapped[str | None] = mapped_column(String(64), nullable=True)
    siege_social: Mapped[str | None] = mapped_column(String(256), nullable=True)
    representant_legal_nom: Mapped[str | None] = mapped_column(String(128), nullable=True)
    representant_legal_prenom: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Beneficiaire effectif principal (regle R015 : ouverture bloquee sans BE
    # renseigne). Un seul slot ici - une personne morale a plusieurs BE dans la
    # vraie fiche, mais le MVP retient celui qui pese sur la decision (le PPE
    # quand il y en a un, sinon le detenteur majoritaire).
    beneficiaire_effectif_nom: Mapped[str | None] = mapped_column(String(256), nullable=True)
    beneficiaire_effectif_part: Mapped[float | None] = mapped_column(nullable=True)
    beneficiaire_effectif_ppe: Mapped[bool] = mapped_column(default=False)

    external_ids: Mapped[dict] = mapped_column(JSON, default=dict)  # {"nip": "...", "wuri": "..."}
    created_by_sfd_id: Mapped[int] = mapped_column(ForeignKey("sfds.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    accounts = relationship("Account", back_populates="client")

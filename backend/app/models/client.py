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
    # Piece d'identite (CNIB/Passeport/RCCM) - regle R004 du catalogue : une piece
    # expiree bloque l'ouverture de compte et le retrait (cf. services/kyc.py).
    type_piece: Mapped[str | None] = mapped_column(String(16), nullable=True)
    numero_piece: Mapped[str | None] = mapped_column(String(64), nullable=True)
    date_expiration_piece: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Personne morale uniquement (regle R015) : ouverture bloquee sans BE renseigne.
    beneficiaire_effectif_nom: Mapped[str | None] = mapped_column(String(256), nullable=True)
    beneficiaire_effectif_ppe: Mapped[bool] = mapped_column(default=False)
    external_ids: Mapped[dict] = mapped_column(JSON, default=dict)  # {"nip": "...", "wuri": "..."}
    created_by_sfd_id: Mapped[int] = mapped_column(ForeignKey("sfds.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    accounts = relationship("Account", back_populates="client")

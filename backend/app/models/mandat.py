from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MandatStatut(str, Enum):
    VALIDE = "VALIDE"
    EXPIRE = "EXPIRE"
    REVOQUE = "REVOQUE"


class Mandat(Base):
    """Une procuration : un mandataire autorise a retirer au nom d'un client,
    dans une limite de plafond et une fenetre de validite (regles R010/R011)."""

    __tablename__ = "mandats"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_fid: Mapped[str] = mapped_column(ForeignKey("clients.fid"), index=True)
    mandataire_nom: Mapped[str] = mapped_column(String(256))
    mandataire_piece: Mapped[str] = mapped_column(String(64), index=True)
    date_debut: Mapped[date] = mapped_column(Date)
    date_fin: Mapped[date] = mapped_column(Date)
    plafond: Mapped[float] = mapped_column(Numeric(14, 2))
    statut: Mapped[MandatStatut] = mapped_column(String(16), default=MandatStatut.VALIDE)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    client = relationship("Client")

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TransactionType(str, Enum):
    DEPOT = "DEPOT"
    RETRAIT = "RETRAIT"
    VIREMENT = "VIREMENT"


class TransactionStatus(str, Enum):
    EN_ATTENTE = "EN_ATTENTE"
    VALIDEE = "VALIDEE"
    BLOQUEE = "BLOQUEE"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    montant: Mapped[float] = mapped_column(Numeric(14, 2))
    devise: Mapped[str] = mapped_column(String(8), default="FCFA")
    type: Mapped[TransactionType] = mapped_column(String(16))
    statut: Mapped[TransactionStatus] = mapped_column(String(16), default=TransactionStatus.EN_ATTENTE)
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    screening_result_id: Mapped[int | None] = mapped_column(
        ForeignKey("screening_results.id"), nullable=True
    )
    # Renseigne uniquement pour un VIREMENT : le tiers beneficiaire doit etre filtre
    # au meme titre qu'un client, meme s'il n'a pas de compte dans le reseau CIF.
    beneficiaire_nom: Mapped[str | None] = mapped_column(String(256), nullable=True)
    beneficiaire_compte: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Renseigne uniquement pour un retrait par procuration.
    mandataire_nom: Mapped[str | None] = mapped_column(String(256), nullable=True)
    mandataire_piece: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mandat_id: Mapped[int | None] = mapped_column(ForeignKey("mandats.id"), nullable=True)

    account = relationship("Account", back_populates="transactions")
    screening_result = relationship("ScreeningResult")
    mandat = relationship("Mandat")

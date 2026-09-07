from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AccountStatus(str, Enum):
    ACTIF = "ACTIF"
    BLOQUE = "BLOQUE"
    CLOTURE = "CLOTURE"


class Account(Base):
    """Un compte appartient a une seule SFD ; un Client peut en detenir plusieurs,
    dans plusieurs SFD - c'est ce rattachement qui permet le solde global consolide."""

    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    numero_compte: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    client_fid: Mapped[str] = mapped_column(ForeignKey("clients.fid"), index=True)
    sfd_id: Mapped[int] = mapped_column(ForeignKey("sfds.id"))
    type_compte: Mapped[str] = mapped_column(String(32), default="EPARGNE")
    statut: Mapped[AccountStatus] = mapped_column(String(16), default=AccountStatus.ACTIF)
    date_ouverture: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    # Solde en cache, mis a jour a chaque transaction validee (cf. services/transaction_service.py) -
    # evite de resommer tout l'historique a chaque lecture du solde global.
    solde: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    client = relationship("Client", back_populates="accounts")
    sfd = relationship("SFD")
    transactions = relationship("Transaction", back_populates="account")

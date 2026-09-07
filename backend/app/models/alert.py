from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AlertStatus(str, Enum):
    OUVERTE = "OUVERTE"
    EN_COURS = "EN_COURS"
    LEVEE = "LEVEE"
    CONFIRMEE = "CONFIRMEE"


class Alert(Base):
    """Une alerte issue d'un ScreeningResult - traitee par l'agent conformite ou le superviseur."""

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    screening_result_id: Mapped[int] = mapped_column(ForeignKey("screening_results.id"), unique=True)
    statut: Mapped[AlertStatus] = mapped_column(String(16), default=AlertStatus.OUVERTE)
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    screening_result = relationship("ScreeningResult", back_populates="alert")
    assigned_to = relationship("StaffUser")

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.services.fuzzy_match import ScreeningDecision


class ScreeningResult(Base):
    """Le resultat d'un filtrage - a la creation d'un client ou a chaque transaction."""

    __tablename__ = "screening_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_fid: Mapped[str | None] = mapped_column(ForeignKey("clients.fid"), nullable=True)
    query_nom: Mapped[str] = mapped_column(String(256))
    matched_entry_type: Mapped[str | None] = mapped_column(String(16), nullable=True)  # "SANCTION" | "PPE"
    matched_entry_id: Mapped[int | None] = mapped_column(nullable=True)
    matched_on: Mapped[str | None] = mapped_column(String(256), nullable=True)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    decision: Mapped[ScreeningDecision] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    alert = relationship("Alert", back_populates="screening_result", uselist=False)

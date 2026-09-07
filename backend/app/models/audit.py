from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AuditLog(Base):
    """Journal d'audit append-only - jamais modifie, jamais supprime."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id"))
    action: Mapped[str] = mapped_column(String(64))
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str] = mapped_column(String(64))
    payload_diff: Mapped[dict] = mapped_column(JSON, default=dict)
    sfd_id: Mapped[int | None] = mapped_column(ForeignKey("sfds.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    actor = relationship("StaffUser")

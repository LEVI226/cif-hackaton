from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.services.security import Role


class StaffUser(Base):
    """Un utilisateur interne : agent de guichet, agent conformite, superviseur ou admin reseau."""

    __tablename__ = "staff_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[Role] = mapped_column(String(32))
    # NULL pour un admin reseau CIF, transverse a toutes les SFD.
    sfd_id: Mapped[int | None] = mapped_column(ForeignKey("sfds.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    sfd = relationship("SFD")

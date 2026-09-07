from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SanctionEntry(Base):
    """Une entree d'une liste de sanctions (ONU, OFAC, UE)."""

    __tablename__ = "sanction_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(16))  # "ONU" | "OFAC" | "UE"
    full_name: Mapped[str] = mapped_column(String(256))
    aliases: Mapped[list[str]] = mapped_column(JSON, default=list)
    date_maj: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class PPEEntry(Base):
    """Une Personne Politiquement Exposee."""

    __tablename__ = "ppe_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(256))
    fonction: Mapped[str] = mapped_column(String(256))
    pays: Mapped[str] = mapped_column(String(2))
    date_maj: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

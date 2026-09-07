from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class IdempotencyRecord(Base):
    """Memorise la reponse d'une ecriture deja traitee, indexee par la cle
    d'idempotence que la PWA genere avant de poser l'operation dans sa file
    hors-ligne (cf. Plan, section Synchronisation hors-ligne). Rejouer la meme
    cle renvoie la reponse d'origine au lieu de recreer l'enregistrement.
    """

    __tablename__ = "idempotency_records"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    endpoint: Mapped[str] = mapped_column(String(64))
    status_code: Mapped[int] = mapped_column(default=200)
    response_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

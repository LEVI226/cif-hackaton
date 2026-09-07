from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.alert import AlertStatus


class AlertOut(BaseModel):
    id: int
    statut: AlertStatus
    score: float
    matched_on: str | None
    client_fid: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertResolve(BaseModel):
    statut: AlertStatus
    resolution_note: str

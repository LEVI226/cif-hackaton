from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.alert import AlertStatus
from app.services.fuzzy_match import ScreeningDecision


class AlertOut(BaseModel):
    id: int
    statut: AlertStatus
    # La gravite vient du screening (BLOQUANT / INFORMATIF) : elle est exposee
    # telle quelle plutot que rededuite d'un seuil recopie dans l'interface -
    # les seuils vivent a un seul endroit, app.services.fuzzy_match.
    decision: ScreeningDecision
    score: float
    matched_on: str | None
    client_fid: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertResolve(BaseModel):
    statut: AlertStatus
    resolution_note: str

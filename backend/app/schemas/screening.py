from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.services.fuzzy_match import ScreeningDecision


class ScreeningRequest(BaseModel):
    nom: str
    client_fid: str | None = None


class ScreeningResultOut(BaseModel):
    decision: ScreeningDecision
    score: float
    matched_on: str | None
    matched_entry_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

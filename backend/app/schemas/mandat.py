from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class MandatCreate(BaseModel):
    client_fid: str
    mandataire_nom: str
    mandataire_piece: str
    date_debut: date
    date_fin: date
    plafond: float


class MandatOut(BaseModel):
    id: int
    client_fid: str
    mandataire_nom: str
    mandataire_piece: str
    date_debut: date
    date_fin: date
    plafond: float
    statut: str
    created_at: datetime

    model_config = {"from_attributes": True}

from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class AccountCreate(BaseModel):
    client_fid: str
    numero_compte: str
    type_compte: str = "EPARGNE"
    solde: float = 0


class AccountOut(BaseModel):
    id: int
    numero_compte: str
    client_fid: str
    sfd_id: int
    type_compte: str
    statut: str
    date_ouverture: date
    solde: float

    model_config = {"from_attributes": True}

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, model_validator

from app.models.transaction import TransactionStatus, TransactionType


class TransactionCreate(BaseModel):
    numero_compte: str
    montant: float
    type: TransactionType
    beneficiaire_nom: str | None = None
    beneficiaire_compte: str | None = None
    mandataire_nom: str | None = None
    mandataire_piece: str | None = None

    @model_validator(mode="after")
    def _virement_requires_beneficiaire(self) -> "TransactionCreate":
        if self.type == TransactionType.VIREMENT and not self.beneficiaire_nom:
            raise ValueError("beneficiaire_nom est requis pour un VIREMENT (filtrage du tiers)")
        if self.montant <= 0:
            raise ValueError("montant doit etre strictement positif")
        return self


class TransactionOut(BaseModel):
    id: int
    numero_compte: str
    montant: float
    devise: str
    type: TransactionType
    statut: TransactionStatus
    date: datetime
    beneficiaire_nom: str | None
    mandataire_nom: str | None = None
    mandat_id: int | None = None
    alert_reasons: list[str] = []

    model_config = {"from_attributes": True}

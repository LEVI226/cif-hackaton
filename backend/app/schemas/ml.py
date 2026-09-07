from __future__ import annotations

from pydantic import BaseModel

from app.models.transaction import TransactionType


class RiskScoreRequest(BaseModel):
    type_operation: TransactionType
    montant: float
    solde_compte: float
    nb_ops_24h: int = 0
    nb_ops_30j: int = 0
    montant_moyen_30j: float = 0
    a_mandat: bool = False
    client_ppe: bool = False
    piece_expiree: bool = False
    score_risque_client: float = 0


class RiskScoreResponse(BaseModel):
    prediction: str
    probabilites: dict[str, float]
    model_version: str
    explication: list[str]

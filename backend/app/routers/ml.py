from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.ml import RiskScoreRequest, RiskScoreResponse
from app.services.ml_risk import predict_transaction_risk
from app.services.security import Role, TokenPayload, require_roles

router = APIRouter(prefix="/ml", tags=["ml"])

_CAN_SCORE = require_roles(
    Role.AGENT_GUICHET,
    Role.AGENT_CONFORMITE,
    Role.SUPERVISEUR_SFD,
    Role.CONFORMITE_RESEAU,
    Role.AUDITEUR,
)


@router.post("/risk-score", response_model=RiskScoreResponse)
def score_transaction_risk(
    payload: RiskScoreRequest,
    user: TokenPayload = Depends(_CAN_SCORE),
) -> dict:
    return predict_transaction_risk(payload)

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.screening import ScreeningRequest, ScreeningResultOut
from app.services.screening_service import run_screening
from app.services.security import Role, TokenPayload, require_roles

router = APIRouter(prefix="/screening", tags=["screening"])

_CAN_SCREEN = require_roles(
    Role.AGENT_GUICHET, Role.AGENT_CONFORMITE, Role.SUPERVISEUR_SFD
)


@router.post("", response_model=ScreeningResultOut)
def screen_name(
    payload: ScreeningRequest,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_SCREEN),
) -> ScreeningResultOut:
    """Filtrage ad-hoc d'un nom (ex : beneficiaire d'un virement), hors creation de client."""
    result, _alert = run_screening(db, payload.nom, client_fid=payload.client_fid)
    db.commit()
    return ScreeningResultOut.model_validate(result)

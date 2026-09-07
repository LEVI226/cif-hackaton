from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut
from app.services.security import Role, TokenPayload, require_roles

router = APIRouter(prefix="/audit", tags=["audit"])

_CAN_READ_AUDIT = require_roles(
    Role.AGENT_CONFORMITE,
    Role.SUPERVISEUR_SFD,
    Role.CONFORMITE_RESEAU,
    Role.AUDITEUR,
    Role.ADMIN_RESEAU,
)


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ_AUDIT),
) -> list[AuditLog]:
    query = db.query(AuditLog)
    if user.sfd_id is not None:
        query = query.filter(AuditLog.sfd_id == int(user.sfd_id))
    return query.order_by(AuditLog.created_at.desc()).limit(min(limit, 200)).all()

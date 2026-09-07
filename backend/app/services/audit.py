from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import StaffUser
from app.services.security import TokenPayload


def log_action(
    db: Session,
    user: TokenPayload,
    action: str,
    entity_type: str,
    entity_id: str,
    payload_diff: dict | None = None,
    sfd_id: int | None = None,
) -> None:
    """Ecrit une trace audit lisible et minimale pour la demo conformité."""
    actor = db.query(StaffUser).filter(StaffUser.username == user.sub).first()
    if actor is None:
        return
    db.add(
        AuditLog(
            actor_id=actor.id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            payload_diff=payload_diff or {},
            sfd_id=sfd_id if sfd_id is not None else actor.sfd_id,
        )
    )

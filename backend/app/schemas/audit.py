from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    actor_id: int
    action: str
    entity_type: str
    entity_id: str
    payload_diff: dict
    sfd_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}

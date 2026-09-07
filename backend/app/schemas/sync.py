from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


SyncOperationType = Literal["CREATE_CLIENT", "CREATE_ACCOUNT", "CREATE_TRANSACTION", "CREATE_MANDAT"]


class SyncPushOperation(BaseModel):
    operation_id: str
    type: SyncOperationType
    payload: dict


class SyncPushRequest(BaseModel):
    device_id: str
    operations: list[SyncPushOperation]


class SyncOperationResult(BaseModel):
    operation_id: str
    type: SyncOperationType
    status: Literal["APPLIED", "REPLAYED", "FAILED"]
    response: dict | None = None
    error: str | None = None


class SyncPushResponse(BaseModel):
    device_id: str
    accepted: int
    failed: int
    results: list[SyncOperationResult]


class SyncPullResponse(BaseModel):
    server_time: datetime
    alerts: list[dict]
    audit_logs: list[dict]

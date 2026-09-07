from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert
from app.models.audit import AuditLog
from app.models.idempotency import IdempotencyRecord
from app.routers.accounts import create_account
from app.routers.clients import create_client
from app.routers.mandats import create_mandat
from app.routers.transactions import create_transaction
from app.schemas.account import AccountCreate
from app.schemas.client import ClientCreate
from app.schemas.mandat import MandatCreate
from app.schemas.sync import SyncOperationResult, SyncPullResponse, SyncPushRequest, SyncPushResponse
from app.schemas.transaction import TransactionCreate
from app.services.security import Role, TokenPayload, require_roles

router = APIRouter(prefix="/sync", tags=["sync"])

_CAN_SYNC = require_roles(Role.AGENT_GUICHET, Role.AGENT_CONFORMITE, Role.SUPERVISEUR_SFD)


@router.post("/push", response_model=SyncPushResponse)
def push_offline_operations(
    payload: SyncPushRequest,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_SYNC),
) -> SyncPushResponse:
    """Rejoue une file d'operations creees hors-ligne par la PWA.

    Chaque operation a son propre `operation_id`, utilise comme cle d'idempotence.
    Si une coupure reseau arrive apres traitement serveur mais avant reception par
    l'appareil, le prochain push renvoie la meme reponse au lieu de doubler l'effet.
    """

    results: list[SyncOperationResult] = []

    for op in payload.operations:
        sync_key = f"{payload.device_id}:{op.operation_id}"
        existing = db.get(IdempotencyRecord, sync_key)
        if existing is not None:
            results.append(
                SyncOperationResult(
                    operation_id=op.operation_id,
                    type=op.type,
                    status="REPLAYED",
                    response=existing.response_json,
                )
            )
            continue

        try:
            if op.type == "CREATE_CLIENT":
                response = create_client(
                    ClientCreate.model_validate(op.payload),
                    db=db,
                    user=user,
                    idempotency_key=sync_key,
                )
            elif op.type == "CREATE_ACCOUNT":
                response_obj = create_account(AccountCreate.model_validate(op.payload), db=db, user=user)
                response = {
                    "id": response_obj.id,
                    "numero_compte": response_obj.numero_compte,
                    "client_fid": response_obj.client_fid,
                    "sfd_id": response_obj.sfd_id,
                    "type_compte": response_obj.type_compte,
                    "statut": str(response_obj.statut),
                    "date_ouverture": response_obj.date_ouverture.isoformat(),
                    "solde": float(response_obj.solde),
                }
            elif op.type == "CREATE_TRANSACTION":
                response = create_transaction(
                    TransactionCreate.model_validate(op.payload),
                    db=db,
                    user=user,
                    idempotency_key=sync_key,
                )
            elif op.type == "CREATE_MANDAT":
                response_obj = create_mandat(MandatCreate.model_validate(op.payload), db=db, user=user)
                response = {
                    "id": response_obj.id,
                    "client_fid": response_obj.client_fid,
                    "mandataire_nom": response_obj.mandataire_nom,
                    "mandataire_piece": response_obj.mandataire_piece,
                    "date_debut": response_obj.date_debut.isoformat(),
                    "date_fin": response_obj.date_fin.isoformat(),
                    "plafond": float(response_obj.plafond),
                    "statut": str(response_obj.statut),
                    "created_at": response_obj.created_at.isoformat(),
                }
            else:  # pragma: no cover - Literal validation should make this unreachable.
                raise ValueError(f"Type operation inconnu: {op.type}")

            if op.type in ("CREATE_ACCOUNT", "CREATE_MANDAT"):
                db.add(IdempotencyRecord(key=sync_key, endpoint=f"SYNC {op.type}", response_json=response))
                db.commit()

            results.append(
                SyncOperationResult(
                    operation_id=op.operation_id,
                    type=op.type,
                    status="APPLIED",
                    response=response,
                )
            )
        except Exception as exc:  # noqa: BLE001 - batch sync must isolate failed operations.
            db.rollback()
            message = str(exc)
            if isinstance(exc, ValidationError):
                message = exc.errors()[0]["msg"]
            results.append(
                SyncOperationResult(operation_id=op.operation_id, type=op.type, status="FAILED", error=message)
            )

    accepted = sum(1 for result in results if result.status in ("APPLIED", "REPLAYED"))
    failed = sum(1 for result in results if result.status == "FAILED")
    return SyncPushResponse(device_id=payload.device_id, accepted=accepted, failed=failed, results=results)


@router.get("/pull", response_model=SyncPullResponse)
def pull_recent_changes(
    since: datetime | None = None,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_SYNC),
) -> SyncPullResponse:
    """Renvoie les signaux conformite recents utiles a une PWA apres reconnexion."""

    alert_query = db.query(Alert)
    audit_query = db.query(AuditLog)
    if since is not None:
        alert_query = alert_query.filter(Alert.created_at > since)
        audit_query = audit_query.filter(AuditLog.created_at > since)
    if user.sfd_id is not None:
        audit_query = audit_query.filter(AuditLog.sfd_id == int(user.sfd_id))

    alerts = [
        {
            "id": alert.id,
            "statut": str(alert.statut),
            "screening_result_id": alert.screening_result_id,
            "created_at": alert.created_at.isoformat(),
        }
        for alert in alert_query.order_by(Alert.created_at.desc()).limit(100).all()
    ]
    audit_logs = [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "payload_diff": log.payload_diff,
            "sfd_id": log.sfd_id,
            "created_at": log.created_at.isoformat(),
        }
        for log in audit_query.order_by(AuditLog.created_at.desc()).limit(100).all()
    ]
    return SyncPullResponse(server_time=datetime.now(timezone.utc), alerts=alerts, audit_logs=audit_logs)

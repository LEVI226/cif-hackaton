from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert, AlertStatus
from app.models.client import Client
from app.schemas.alert import AlertOut, AlertResolve
from app.services.security import LOCAL_ROLES, Role, TokenPayload, require_roles
from app.services.visibility import client_visible_to_local_role

router = APIRouter(prefix="/alerts", tags=["alerts"])

_CAN_MANAGE = require_roles(
    Role.AGENT_CONFORMITE, Role.SUPERVISEUR_SFD, Role.CONFORMITE_RESEAU
)
_CAN_READ = require_roles(
    Role.AGENT_CONFORMITE, Role.SUPERVISEUR_SFD, Role.CONFORMITE_RESEAU, Role.AUDITEUR
)


@router.get("", response_model=list[AlertOut])
def list_alerts(
    statut: AlertStatus | None = None,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> list[AlertOut]:
    query = db.query(Alert)
    if statut is not None:
        query = query.filter(Alert.statut == statut)
    alerts = query.order_by(Alert.created_at.desc()).all()

    # Meme principe de visibilite differenciee que pour les clients (cf.
    # app.services.visibility.client_visible_to_local_role) : un role local ne
    # voit que les alertes liees a un client de sa propre SFD - une alerte sans
    # client rattache (ex: un screening ad-hoc de beneficiaire) reste visible
    # partout, il n'y a pas de perimetre SFD a appliquer dessus.
    if user.role in LOCAL_ROLES and user.sfd_id:
        client_cache: dict[str, bool] = {}

        def _visible(fid: str) -> bool:
            if fid not in client_cache:
                c = db.get(Client, fid)
                client_cache[fid] = c is not None and client_visible_to_local_role(db, user.sfd_id, c)
            return client_cache[fid]

        alerts = [
            a
            for a in alerts
            if a.screening_result.client_fid is None or _visible(a.screening_result.client_fid)
        ]

    return [
        AlertOut(
            id=a.id,
            statut=a.statut,
            decision=a.screening_result.decision,
            score=a.screening_result.score,
            matched_on=a.screening_result.matched_on,
            client_fid=a.screening_result.client_fid,
            created_at=a.created_at,
        )
        for a in alerts
    ]


@router.patch("/{alert_id}", response_model=AlertOut)
def resolve_alert(
    alert_id: int,
    payload: AlertResolve,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_MANAGE),
) -> AlertOut:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alerte introuvable")

    alert.statut = payload.statut
    alert.resolution_note = payload.resolution_note
    if payload.statut in (AlertStatus.LEVEE, AlertStatus.CONFIRMEE):
        alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)

    return AlertOut(
        id=alert.id,
        statut=alert.statut,
        decision=alert.screening_result.decision,
        score=alert.screening_result.score,
        matched_on=alert.screening_result.matched_on,
        client_fid=alert.screening_result.client_fid,
        created_at=alert.created_at,
    )

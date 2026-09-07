from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client import Client
from app.models.mandat import Mandat
from app.schemas.mandat import MandatCreate, MandatOut
from app.services.audit import log_action
from app.services.security import Role, TokenPayload, require_roles

router = APIRouter(prefix="/mandats", tags=["mandats"])

_CAN_MANAGE = require_roles(Role.AGENT_CONFORMITE, Role.SUPERVISEUR_SFD)


@router.post("", response_model=MandatOut, status_code=status.HTTP_201_CREATED)
def create_mandat(
    payload: MandatCreate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_MANAGE),
) -> Mandat:
    client = db.get(Client, payload.client_fid)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")
    if payload.date_fin < payload.date_debut:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "date_fin doit etre apres date_debut")
    if payload.plafond <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "plafond doit etre strictement positif")

    mandat = Mandat(**payload.model_dump())
    db.add(mandat)
    db.flush()
    log_action(
        db,
        user,
        "CREATE_MANDAT",
        "Mandat",
        str(mandat.id),
        {"client_fid": payload.client_fid, "plafond": payload.plafond},
        sfd_id=client.created_by_sfd_id,
    )
    db.commit()
    db.refresh(mandat)
    return mandat


@router.get("/client/{fid}", response_model=list[MandatOut])
def list_client_mandats(
    fid: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_MANAGE),
) -> list[Mandat]:
    return db.query(Mandat).filter(Mandat.client_fid == fid).order_by(Mandat.created_at.desc()).all()

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.client import Client
from app.schemas.account import AccountCreate, AccountOut
from app.services.audit import log_action
from app.services.kyc import piece_expiree
from app.services.security import Role, TokenPayload, require_roles

router = APIRouter(prefix="/accounts", tags=["accounts"])

_CAN_CREATE = require_roles(Role.AGENT_GUICHET, Role.SUPERVISEUR_SFD)


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_CREATE),
) -> Account:
    if user.sfd_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Utilisateur non rattache a une SFD")
    if payload.solde < 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "solde initial ne peut pas etre negatif")
    existing = db.query(Account).filter(Account.numero_compte == payload.numero_compte).first()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Numero de compte deja utilise")
    client = db.get(Client, payload.client_fid)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")
    # Deliberement PAS de controle "client cree par ma SFD" ici : c'est tout le
    # point du FID reseau qu'un client identifie a Dori puisse ouvrir un second
    # compte a Banfora (cf. TDR "comptes dans plusieurs caisses", scenario de
    # demo recommande par le corpus CIF). Le controle qui compte est le KYC.
    if piece_expiree(client):
        raise HTTPException(status.HTTP_409_CONFLICT, "Piece d'identite expiree - ouverture compte bloquee")

    account = Account(
        numero_compte=payload.numero_compte,
        client_fid=payload.client_fid,
        sfd_id=int(user.sfd_id),
        type_compte=payload.type_compte,
        solde=payload.solde,
    )
    db.add(account)
    db.flush()
    log_action(
        db,
        user,
        "CREATE_ACCOUNT",
        "Account",
        account.numero_compte,
        {"client_fid": payload.client_fid, "solde": payload.solde},
        sfd_id=account.sfd_id,
    )
    db.commit()
    db.refresh(account)
    return account

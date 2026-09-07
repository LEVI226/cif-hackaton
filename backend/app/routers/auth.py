from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import StaffUser
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.security import TokenPayload, create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(StaffUser).filter(StaffUser.username == payload.username).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
        )
    token = create_access_token(
        TokenPayload(sub=user.username, role=user.role, sfd_id=str(user.sfd_id) if user.sfd_id else None)
    )
    return TokenResponse(access_token=token, role=user.role, sfd_id=user.sfd_id)

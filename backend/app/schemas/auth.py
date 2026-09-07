from __future__ import annotations

from pydantic import BaseModel

from app.services.security import Role


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    sfd_id: int | None = None

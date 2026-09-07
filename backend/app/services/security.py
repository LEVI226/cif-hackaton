"""Authentification (JWT) et RBAC applique cote serveur.

Chaque endpoint declare les roles autorises via `require_roles(...)` - le controle
se fait toujours sur le serveur, jamais seulement dans l'interface (cf. PRD, section
Securite : "RBAC applique cote serveur").
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from enum import Enum

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

# En production, SENTINEL_JWT_SECRET doit venir de l'environnement (jamais commite).
# La valeur par defaut n'existe que pour que la demo et les tests tournent sans config.
JWT_SECRET = os.environ.get("SENTINEL_JWT_SECRET", "dev-only-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

_hasher = PasswordHasher()
_bearer_scheme = HTTPBearer(auto_error=True)


class Role(str, Enum):
    """Cf. corpus CIF 07_rbac_anonymisation_visibilite.md - le jury a explicitement
    souleve la visibilite differenciee : un role local (rattache a une SFD) ne voit
    jamais le detail complet d'une autre caisse, un role reseau voit le signal
    consolide mais le nom du client reste masque sauf alerte confirmee."""

    AGENT_GUICHET = "AGENT_GUICHET"  # local - agent de caisse
    AGENT_CONFORMITE = "AGENT_CONFORMITE"  # local - responsable conformite caisse
    SUPERVISEUR_SFD = "SUPERVISEUR_SFD"  # local - chef de caisse
    CONFORMITE_RESEAU = "CONFORMITE_RESEAU"  # reseau - responsable conformite reseau
    AUDITEUR = "AUDITEUR"  # reseau - lecture seule, journal d'audit
    ADMIN_RESEAU = "ADMIN_RESEAU"  # parametrage (listes, seuils) - pas de donnee client


LOCAL_ROLES = (Role.AGENT_GUICHET, Role.AGENT_CONFORMITE, Role.SUPERVISEUR_SFD)
RESEAU_ROLES = (Role.CONFORMITE_RESEAU, Role.AUDITEUR)
# Roles locaux qui peuvent debloquer la vue reseau complete sur alerte confirmee -
# l'agent de guichet seul n'obtient jamais ce deblocage (cf. matrice de visibilite).
LOCAL_ROLES_WITH_ALERT_UNLOCK = (Role.AGENT_CONFORMITE, Role.SUPERVISEUR_SFD)


class TokenPayload(BaseModel):
    sub: str  # username
    role: Role
    sfd_id: str | None = None  # None pour un admin reseau (transverse a toutes les SFD)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_access_token(payload: TokenPayload, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    claims = payload.model_dump()
    claims["exp"] = expire
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> TokenPayload:
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton invalide ou expire",
        ) from exc
    return TokenPayload(**claims)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> TokenPayload:
    return decode_access_token(credentials.credentials)


def require_roles(*allowed_roles: Role):
    """Fabrique une dependance FastAPI qui rejette (403) tout role hors de la liste."""

    def _check(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role.value}' non autorise pour cette operation",
            )
        return user

    return _check

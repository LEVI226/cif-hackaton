from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sanctions import PPEEntry, SanctionEntry
from app.schemas.admin import PPEEntryCreate, PPEEntryOut, SanctionEntryCreate, SanctionEntryOut
from app.services.security import Role, TokenPayload, require_roles

router = APIRouter(prefix="/admin", tags=["admin"])

_ADMIN_ONLY = require_roles(Role.ADMIN_RESEAU)

# Note TDR : "les modifications relatives a la mise en oeuvre des sanctions ciblees
# sont prises en compte sans delai" - satisfait ici par construction, pas par une
# tache planifiee : le moteur de filtrage (app.services.screening_service) lit ces
# tables directement a chaque appel, jamais un instantane mis en cache. Un ajout
# via ces endpoints est donc immediatement visible au prochain filtrage.


@router.post("/sanctions", response_model=SanctionEntryOut, status_code=status.HTTP_201_CREATED)
def create_sanction_entry(
    payload: SanctionEntryCreate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_ADMIN_ONLY),
) -> SanctionEntry:
    entry = SanctionEntry(source=payload.source, full_name=payload.full_name, aliases=payload.aliases)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/sanctions", response_model=list[SanctionEntryOut])
def list_sanction_entries(
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_ADMIN_ONLY),
) -> list[SanctionEntry]:
    return db.query(SanctionEntry).order_by(SanctionEntry.date_maj.desc()).all()


@router.delete("/sanctions/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_sanction_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_ADMIN_ONLY),
) -> None:
    entry = db.get(SanctionEntry, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entree introuvable")
    db.delete(entry)
    db.commit()


@router.post("/ppe", response_model=PPEEntryOut, status_code=status.HTTP_201_CREATED)
def create_ppe_entry(
    payload: PPEEntryCreate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_ADMIN_ONLY),
) -> PPEEntry:
    entry = PPEEntry(full_name=payload.full_name, fonction=payload.fonction, pays=payload.pays)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/ppe", response_model=list[PPEEntryOut])
def list_ppe_entries(
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_ADMIN_ONLY),
) -> list[PPEEntry]:
    return db.query(PPEEntry).order_by(PPEEntry.date_maj.desc()).all()


@router.delete("/ppe/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_ppe_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_ADMIN_ONLY),
) -> None:
    entry = db.get(PPEEntry, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entree introuvable")
    db.delete(entry)
    db.commit()

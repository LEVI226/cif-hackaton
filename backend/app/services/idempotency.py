"""Rejeu sans danger des ecritures posees hors-ligne.

La PWA genere un UUID cote appareil au moment ou elle place une operation dans sa
file locale (cf. frontend/src/offline/queue.ts). A la synchronisation, cet UUID
voyage en en-tete `Idempotency-Key` : si la meme cle a deja ete traitee (parce que
la reponse precedente n'a jamais atteint l'appareil avant une coupure), on renvoie
la reponse enregistree au lieu de rejouer l'effet de bord.

`compute` doit retourner un dict serialisable (typiquement `SchemaOut(...).model_dump(mode="json")`)
- jamais un objet ORM - pour que la reponse rejouee puisse etre reconstruite sans
toucher a nouveau la base.
"""
from __future__ import annotations

from typing import Callable

from sqlalchemy.orm import Session

from app.models.idempotency import IdempotencyRecord


def with_idempotency(
    db: Session,
    key: str | None,
    endpoint: str,
    compute: Callable[[], dict],
) -> dict:
    if key is None:
        return compute()

    existing = db.get(IdempotencyRecord, key)
    if existing is not None:
        return existing.response_json

    result = compute()
    db.add(IdempotencyRecord(key=key, endpoint=endpoint, response_json=result))
    db.flush()
    return result

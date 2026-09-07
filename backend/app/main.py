from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import *  # noqa: F401,F403 - enregistre tous les modeles sur Base.metadata
from app.routers import (
    accounts,
    admin,
    alerts,
    audit,
    auth,
    clients,
    dashboard,
    mandats,
    ml,
    screening,
    sync,
    transactions,
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # create_all suffit pour la demo hackathon ; un deploiement partage voudrait
    # des migrations Alembic versionnees a la place (cf. Plan, section Depot).
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SentinelleCoop API",
    description="Filtrage LBC/FT/PPE pour les SFD membres du reseau CIF - DigiCoop-WA+ 2026",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # a restreindre a l'origine de la PWA avant tout deploiement partage
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(clients.router)
app.include_router(screening.router)
app.include_router(alerts.router)
app.include_router(audit.router)
app.include_router(transactions.router)
app.include_router(mandats.router)
app.include_router(ml.router)
app.include_router(sync.router)
app.include_router(admin.router)
app.include_router(dashboard.router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}

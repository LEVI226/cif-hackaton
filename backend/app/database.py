"""Configuration SQLAlchemy - SQLite par defaut (demo/dev hors-ligne), PostgreSQL en prod.

Le meme jeu de modeles sert aux deux moteurs : aucun type specifique a un dialecte
n'est utilise dans les modeles (cf. Plan, section Stack technique).
"""
from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.environ.get("SENTINEL_DATABASE_URL", "sqlite:///./sentinel.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

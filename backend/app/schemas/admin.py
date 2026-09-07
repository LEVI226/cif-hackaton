from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SanctionEntryCreate(BaseModel):
    source: str  # "ONU" | "OFAC" | "UE"
    full_name: str
    aliases: list[str] = []


class SanctionEntryOut(BaseModel):
    id: int
    source: str
    full_name: str
    aliases: list[str]
    date_maj: datetime

    model_config = {"from_attributes": True}


class PPEEntryCreate(BaseModel):
    full_name: str
    fonction: str
    pays: str


class PPEEntryOut(BaseModel):
    id: int
    full_name: str
    fonction: str
    pays: str
    date_maj: datetime

    model_config = {"from_attributes": True}

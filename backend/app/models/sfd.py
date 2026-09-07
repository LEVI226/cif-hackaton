from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Country(Base):
    __tablename__ = "countries"

    code: Mapped[str] = mapped_column(String(2), primary_key=True)  # ISO 3166-1 alpha-2
    name: Mapped[str] = mapped_column(String(64))


class SFD(Base):
    """Une caisse (Institution de Microfinance) membre du reseau CIF."""

    __tablename__ = "sfds"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(4), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    country_code: Mapped[str] = mapped_column(ForeignKey("countries.code"))
    # Compteur de sequence pour la generation de FID (cf. app.services.fid) -
    # incremente atomiquement a chaque nouveau client rattache a cette SFD.
    next_client_seq: Mapped[int] = mapped_column(default=1)

    country: Mapped[Country] = relationship()

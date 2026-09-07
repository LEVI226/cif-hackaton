from __future__ import annotations

from sqlalchemy import ForeignKey, Numeric, String
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

    # Parametrage local par zone (regles R005/R006, corpus CIF
    # 09_risque_geographique_et_parametrage_local.md : Dori zone rouge exige des
    # seuils plus bas que Banfora zone verte - un seuil global unique manquerait
    # exactement le cas que le jury veut voir).
    zone_risque: Mapped[str] = mapped_column(String(16), default="verte")  # rouge | orange | verte
    seuil_depot: Mapped[float] = mapped_column(Numeric(14, 2), default=1_000_000)
    seuil_retrait: Mapped[float] = mapped_column(Numeric(14, 2), default=1_000_000)

    country: Mapped[Country] = relationship()

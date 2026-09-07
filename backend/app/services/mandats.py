from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models.mandat import Mandat, MandatStatut


def find_valid_mandat(
    db: Session,
    client_fid: str,
    mandataire_piece: str,
    montant: float,
    reference_date: date | None = None,
) -> Mandat | None:
    today = reference_date or date.today()
    mandat = (
        db.query(Mandat)
        .filter(
            Mandat.client_fid == client_fid,
            Mandat.mandataire_piece == mandataire_piece,
            Mandat.statut == MandatStatut.VALIDE,
            Mandat.date_debut <= today,
            Mandat.date_fin >= today,
        )
        .first()
    )
    if mandat is None:
        return None
    if montant > float(mandat.plafond):
        return None
    return mandat

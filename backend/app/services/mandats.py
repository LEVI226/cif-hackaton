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


def clients_lies_au_mandataire(db: Session, mandataire_piece: str) -> set[str]:
    """R011 : un mandataire rattache a plusieurs clients differents est un motif
    d'alerte informative (un meme intermediaire peut servir a masquer plusieurs
    beneficiaires reels)."""
    rows = (
        db.query(Mandat.client_fid)
        .filter(Mandat.mandataire_piece == mandataire_piece, Mandat.statut == MandatStatut.VALIDE)
        .distinct()
        .all()
    )
    return {row[0] for row in rows}

"""Controle KYC minimal - regle R004 (piece expiree) et R015 (personne morale
sans beneficiaire effectif) du catalogue d'alertes.
"""
from __future__ import annotations

from datetime import date

from app.models.client import Client


def piece_expiree(client: Client, reference_date: date | None = None) -> bool:
    """R004 : une piece d'identite dont la date d'expiration est depassee bloque
    l'ouverture de compte et le retrait. Un client sans piece renseignee n'est
    pas bloque ici - l'absence de piece est une lacune KYC distincte, pas une
    expiration."""
    if client.date_expiration_piece is None:
        return False
    today = reference_date or date.today()
    return client.date_expiration_piece < today


def beneficiaire_effectif_manquant(client: Client) -> bool:
    """R015 : une personne morale sans beneficiaire effectif declare est bloquee
    a l'ouverture."""
    return client.type_client == "MORALE" and not client.beneficiaire_effectif_nom

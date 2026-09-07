from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SeriePoint(BaseModel):
    """Un point d'une serie journaliere - alimente les sparklines du tableau de bord."""

    date: str  # ISO (AAAA-MM-JJ)
    total: int


class DashboardStats(BaseModel):
    vue: str  # "RESEAU" | "LOCALE"
    sfd_nom: str | None = None  # renseigne seulement en vue LOCALE

    total_clients: int
    total_comptes: int
    solde_total: float

    total_screenings: int
    alertes_ouvertes: int
    alertes_bloquantes_ouvertes: int
    alertes_informatives_ouvertes: int
    dernier_screening_at: datetime | None = None

    clients_ppe: int
    clients_risque_eleve: int

    total_transactions: int
    transactions_bloquees: int
    volume_transactions: float

    sanctions_listees: int
    ppe_listees: int

    # --- Series journalieres (fenetre glissante de 7 jours, zeros inclus) ---
    serie_clients: list[SeriePoint] = []
    serie_screenings: list[SeriePoint] = []
    serie_alertes: list[SeriePoint] = []

    # --- Score de conformite : moyenne des trois taux ci-dessous, tous calcules
    # sur les donnees reelles du perimetre visible (pas une valeur decorative). ---
    score_conformite: int
    taux_traitement_alertes: int  # alertes levees ou confirmees / total
    taux_kyc_valide: int  # clients sans piece expiree / total (regle R004)
    taux_couverture_screening: int  # clients filtres au moins une fois / total

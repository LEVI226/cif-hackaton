from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


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

    sanctions_listees: int
    ppe_listees: int

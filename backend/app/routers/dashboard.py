"""Statistiques agregees pour l'ecran d'accueil - jamais de detail client nominatif
ici, seulement des comptes : la visibilite differenciee (cf. app.services.visibility)
s'applique au perimetre agrege (quelle SFD est comptee), pas a un nom qui fuiterait.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.alert import Alert, AlertStatus
from app.models.client import Client
from app.models.sanctions import PPEEntry, SanctionEntry
from app.models.screening import ScreeningResult
from app.models.sfd import SFD
from app.services.fuzzy_match import ScreeningDecision
from app.services.security import LOCAL_ROLES, TokenPayload, get_current_user
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_OPEN_STATUSES = (AlertStatus.OUVERTE, AlertStatus.EN_COURS)


def _local_visible_client_fids(db: Session, sfd_id: int) -> set[str]:
    """Meme regle que client_visible_to_local_role, en version ensembliste pour
    ne pas boucler client par client sur un tableau de bord."""
    created = db.query(Client.fid).filter(Client.created_by_sfd_id == sfd_id)
    via_account = db.query(Account.client_fid).filter(Account.sfd_id == sfd_id)
    return {fid for (fid,) in created.union(via_account).all()}


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
) -> DashboardStats:
    sanctions_listees = db.query(SanctionEntry).count()
    ppe_listees = db.query(PPEEntry).count()

    if user.role in LOCAL_ROLES and user.sfd_id:
        sfd_id = int(user.sfd_id)
        sfd = db.get(SFD, sfd_id)
        fids = _local_visible_client_fids(db, sfd_id)

        clients_q = db.query(Client).filter(Client.fid.in_(fids)) if fids else db.query(Client).filter(False)
        accounts_q = db.query(Account).filter(Account.sfd_id == sfd_id)
        screenings_q = db.query(ScreeningResult).filter(ScreeningResult.client_fid.in_(fids)) if fids else db.query(ScreeningResult).filter(False)
        alerts_q = (
            db.query(Alert)
            .join(ScreeningResult, Alert.screening_result_id == ScreeningResult.id)
            .filter(ScreeningResult.client_fid.in_(fids))
            if fids
            else db.query(Alert).filter(False)
        )

        return DashboardStats(
            vue="LOCALE",
            sfd_nom=sfd.name if sfd else None,
            total_clients=clients_q.count(),
            total_comptes=accounts_q.count(),
            solde_total=float(sum(a.solde for a in accounts_q.all())),
            total_screenings=screenings_q.count(),
            alertes_ouvertes=alerts_q.filter(Alert.statut.in_(_OPEN_STATUSES)).count(),
            alertes_bloquantes_ouvertes=alerts_q.filter(
                Alert.statut.in_(_OPEN_STATUSES), ScreeningResult.decision == ScreeningDecision.BLOQUANT
            ).count(),
            alertes_informatives_ouvertes=alerts_q.filter(
                Alert.statut.in_(_OPEN_STATUSES), ScreeningResult.decision == ScreeningDecision.INFORMATIF
            ).count(),
            dernier_screening_at=(
                screenings_q.order_by(ScreeningResult.created_at.desc()).first().created_at
                if screenings_q.first()
                else None
            ),
            clients_ppe=clients_q.filter(Client.est_ppe.is_(True)).count(),
            clients_risque_eleve=clients_q.filter(Client.niveau_risque_initial == "ELEVE").count(),
            sanctions_listees=sanctions_listees,
            ppe_listees=ppe_listees,
        )

    # Vue reseau (CONFORMITE_RESEAU, AUDITEUR, ADMIN_RESEAU) : pas de perimetre SFD.
    accounts_q = db.query(Account)
    alerts_q = db.query(Alert).join(ScreeningResult, Alert.screening_result_id == ScreeningResult.id)

    return DashboardStats(
        vue="RESEAU",
        sfd_nom=None,
        total_clients=db.query(Client).count(),
        total_comptes=accounts_q.count(),
        solde_total=float(sum(a.solde for a in accounts_q.all())),
        total_screenings=db.query(ScreeningResult).count(),
        alertes_ouvertes=alerts_q.filter(Alert.statut.in_(_OPEN_STATUSES)).count(),
        alertes_bloquantes_ouvertes=alerts_q.filter(
            Alert.statut.in_(_OPEN_STATUSES), ScreeningResult.decision == ScreeningDecision.BLOQUANT
        ).count(),
        alertes_informatives_ouvertes=alerts_q.filter(
            Alert.statut.in_(_OPEN_STATUSES), ScreeningResult.decision == ScreeningDecision.INFORMATIF
        ).count(),
        dernier_screening_at=(
            db.query(ScreeningResult).order_by(ScreeningResult.created_at.desc()).first().created_at
            if db.query(ScreeningResult).first()
            else None
        ),
        clients_ppe=db.query(Client).filter(Client.est_ppe.is_(True)).count(),
        clients_risque_eleve=db.query(Client).filter(Client.niveau_risque_initial == "ELEVE").count(),
        sanctions_listees=sanctions_listees,
        ppe_listees=ppe_listees,
    )

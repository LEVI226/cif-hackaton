"""Statistiques agregees pour l'ecran d'accueil - jamais de detail client nominatif
ici, seulement des compteurs : la visibilite differenciee (cf. app.services.visibility)
s'applique au perimetre agrege (quelle SFD est comptee), pas a un nom qui fuiterait.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import false
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.alert import Alert, AlertStatus
from app.models.client import Client
from app.models.sanctions import PPEEntry, SanctionEntry
from app.models.screening import ScreeningResult
from app.models.sfd import SFD
from app.models.transaction import Transaction, TransactionStatus
from app.schemas.dashboard import DashboardStats, SeriePoint
from app.services.fuzzy_match import ScreeningDecision
from app.services.kyc import piece_expiree
from app.services.security import LOCAL_ROLES, TokenPayload, get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_OPEN_STATUSES = (AlertStatus.OUVERTE, AlertStatus.EN_COURS)
_CLOSED_STATUSES = (AlertStatus.LEVEE, AlertStatus.CONFIRMEE)
JOURS_SERIE = 7


def _local_visible_client_fids(db: Session, sfd_id: int) -> set[str]:
    """Meme regle que client_visible_to_local_role, en version ensembliste pour
    ne pas boucler client par client sur un tableau de bord."""
    created = db.query(Client.fid).filter(Client.created_by_sfd_id == sfd_id)
    via_account = db.query(Account.client_fid).filter(Account.sfd_id == sfd_id)
    return {fid for (fid,) in created.union(via_account).all()}


def _serie_par_jour(valeurs: list[datetime | None], jours: int = JOURS_SERIE) -> list[SeriePoint]:
    """Compte les elements par jour sur une fenetre glissante, jours vides inclus -
    une sparkline sans ses zeros ment sur le rythme reel."""
    aujourdhui = datetime.now(timezone.utc).date()
    paniers: dict[date, int] = {
        aujourdhui - timedelta(days=ecart): 0 for ecart in range(jours - 1, -1, -1)
    }
    for valeur in valeurs:
        if valeur is None:
            continue
        # SQLite rend des datetime naifs ; on ne compare que des dates ici, donc
        # aucun melange naif/aware n'est possible (cf. services/transaction_service).
        jour = valeur.date() if isinstance(valeur, datetime) else valeur
        if jour in paniers:
            paniers[jour] += 1
    return [SeriePoint(date=jour.isoformat(), total=total) for jour, total in sorted(paniers.items())]


def _pourcentage(numerateur: int, denominateur: int) -> int:
    """100 % quand il n'y a rien a controler : une caisse sans alerte ouverte
    n'est pas une caisse en faute."""
    if denominateur <= 0:
        return 100
    return round(numerateur * 100 / denominateur)


def _compute_stats(
    db: Session,
    *,
    vue: str,
    sfd_nom: str | None,
    fids: set[str] | None,
    sfd_id: int | None,
) -> DashboardStats:
    """`fids`/`sfd_id` a None = vue reseau (aucun filtre). Sinon vue locale :
    `fids` borne les clients visibles, `sfd_id` borne les comptes et operations.
    Les deux branches passent par ce meme calcul pour qu'elles ne puissent pas
    diverger silencieusement quand on ajoute un indicateur."""
    clients_q = db.query(Client)
    accounts_q = db.query(Account)
    screenings_q = db.query(ScreeningResult)
    alerts_q = db.query(Alert).join(ScreeningResult, Alert.screening_result_id == ScreeningResult.id)
    tx_q = db.query(Transaction).join(Account, Transaction.account_id == Account.id)

    if fids is not None:
        if fids:
            clients_q = clients_q.filter(Client.fid.in_(fids))
            screenings_q = screenings_q.filter(ScreeningResult.client_fid.in_(fids))
            alerts_q = alerts_q.filter(ScreeningResult.client_fid.in_(fids))
        else:
            # Aucun client visible : on neutralise les requetes plutot que de
            # laisser un `in_([])` au comportement dependant du dialecte.
            clients_q = clients_q.filter(false())
            screenings_q = screenings_q.filter(false())
            alerts_q = alerts_q.filter(false())
    if sfd_id is not None:
        accounts_q = accounts_q.filter(Account.sfd_id == sfd_id)
        tx_q = tx_q.filter(Account.sfd_id == sfd_id)

    clients = clients_q.all()
    comptes = accounts_q.all()
    total_clients = len(clients)

    # --- Taux de conformite, tous calcules sur le perimetre visible ---
    total_alertes = alerts_q.count()
    alertes_traitees = alerts_q.filter(Alert.statut.in_(_CLOSED_STATUSES)).count()
    taux_traitement = _pourcentage(alertes_traitees, total_alertes)

    aujourdhui = datetime.now(timezone.utc).date()
    clients_piece_valide = sum(1 for c in clients if not piece_expiree(c, aujourdhui))
    taux_kyc = _pourcentage(clients_piece_valide, total_clients)

    fids_filtres = {
        fid for (fid,) in screenings_q.with_entities(ScreeningResult.client_fid).distinct().all() if fid
    }
    taux_screening = _pourcentage(len(fids_filtres), total_clients)

    return DashboardStats(
        vue=vue,
        sfd_nom=sfd_nom,
        total_clients=total_clients,
        total_comptes=len(comptes),
        solde_total=float(sum(compte.solde for compte in comptes)),
        total_screenings=screenings_q.count(),
        alertes_ouvertes=alerts_q.filter(Alert.statut.in_(_OPEN_STATUSES)).count(),
        alertes_bloquantes_ouvertes=alerts_q.filter(
            Alert.statut.in_(_OPEN_STATUSES),
            ScreeningResult.decision == ScreeningDecision.BLOQUANT,
        ).count(),
        alertes_informatives_ouvertes=alerts_q.filter(
            Alert.statut.in_(_OPEN_STATUSES),
            ScreeningResult.decision == ScreeningDecision.INFORMATIF,
        ).count(),
        dernier_screening_at=(
            dernier.created_at
            if (dernier := screenings_q.order_by(ScreeningResult.created_at.desc()).first())
            else None
        ),
        clients_ppe=sum(1 for c in clients if c.est_ppe),
        clients_risque_eleve=sum(1 for c in clients if c.niveau_risque_initial == "ELEVE"),
        total_transactions=tx_q.count(),
        transactions_bloquees=tx_q.filter(Transaction.statut == TransactionStatus.BLOQUEE).count(),
        volume_transactions=float(sum(tx.montant for tx in tx_q.all())),
        sanctions_listees=db.query(SanctionEntry).count(),
        ppe_listees=db.query(PPEEntry).count(),
        serie_clients=_serie_par_jour([c.created_at for c in clients]),
        serie_screenings=_serie_par_jour(
            [created for (created,) in screenings_q.with_entities(ScreeningResult.created_at).all()]
        ),
        serie_alertes=_serie_par_jour(
            [created for (created,) in alerts_q.with_entities(Alert.created_at).all()]
        ),
        score_conformite=round((taux_traitement + taux_kyc + taux_screening) / 3),
        taux_traitement_alertes=taux_traitement,
        taux_kyc_valide=taux_kyc,
        taux_couverture_screening=taux_screening,
    )


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
) -> DashboardStats:
    if user.role in LOCAL_ROLES and user.sfd_id:
        sfd_id = int(user.sfd_id)
        sfd = db.get(SFD, sfd_id)
        return _compute_stats(
            db,
            vue="LOCALE",
            sfd_nom=sfd.name if sfd else None,
            fids=_local_visible_client_fids(db, sfd_id),
            sfd_id=sfd_id,
        )

    # Vue reseau (CONFORMITE_RESEAU, AUDITEUR, ADMIN_RESEAU) : pas de perimetre SFD.
    return _compute_stats(db, vue="RESEAU", sfd_nom=None, fids=None, sfd_id=None)

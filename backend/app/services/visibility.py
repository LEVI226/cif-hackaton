"""Visibilite differenciee par role (cf. corpus CIF 07_rbac_anonymisation_visibilite.md
- le jury a explicitement souleve ce point : "ne pas construire une demo ou tout le
monde voit tous les clients du reseau").

Regle appliquee :
- role local (agent guichet / conformite caisse / superviseur SFD) : detail complet
  uniquement sur les comptes de SA propre SFD ; les comptes d'autres SFD sont
  indiques (existence, statut) mais le solde et les mouvements restent masques.
- exception : agent conformite / superviseur avec une alerte ouverte ou confirmee
  sur ce client -> deblocage complet ("Solde global reseau : Oui si alerte"). Un
  agent de guichet seul n'obtient jamais ce deblocage.
- role reseau (conformite reseau / auditeur) : detail complet sur tout le reseau,
  mais le nom du client reste masque dans les resultats de recherche sauf alerte
  bloquante confirmee sur ce client ("Nom client local : masque sauf alerte critique").
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.alert import Alert, AlertStatus
from app.models.client import Client
from app.models.screening import ScreeningResult
from app.services.security import LOCAL_ROLES_WITH_ALERT_UNLOCK, RESEAU_ROLES, Role


def client_has_live_alert(db: Session, client_fid: str) -> bool:
    """Une alerte ouverte, en cours ou confirmee sur ce client - declenche les
    deblocages de visibilite prevus par la matrice ("sauf alerte critique/confirmee")."""
    return (
        db.query(Alert)
        .join(ScreeningResult, Alert.screening_result_id == ScreeningResult.id)
        .filter(
            ScreeningResult.client_fid == client_fid,
            Alert.statut.in_(
                [AlertStatus.OUVERTE, AlertStatus.EN_COURS, AlertStatus.CONFIRMEE]
            ),
        )
        .first()
        is not None
    )


def resolve_view(db: Session, role: Role, sfd_id: str | None, client_fid: str) -> str:
    """Retourne "RESEAU" (detail complet, tout le reseau) ou "LOCALE" (detail
    complet sur la SFD de l'utilisateur seulement, le reste masque)."""
    if role in RESEAU_ROLES:
        return "RESEAU"
    if role in LOCAL_ROLES_WITH_ALERT_UNLOCK and client_has_live_alert(db, client_fid):
        return "RESEAU"
    return "LOCALE"


def client_visible_to_local_role(db: Session, sfd_id: str | None, client: Client) -> bool:
    """Un role local voit un client s'il l'a cree OU s'il y detient un compte -
    corrige le cas multi-caisse (client cree a Dori, compte ouvert plus tard a
    Banfora : l'agent de Banfora doit voir SA part, pas etre bloque en entier)."""
    if sfd_id is None:
        return False
    sfd_id_int = int(sfd_id)
    if client.created_by_sfd_id == sfd_id_int:
        return True
    return (
        db.query(Account)
        .filter(Account.client_fid == client.fid, Account.sfd_id == sfd_id_int)
        .first()
        is not None
    )


def mask_name(nom: str, prenom: str) -> tuple[str, str]:
    nom_masque = f"{nom[0].upper()}." if nom else "?"
    prenom_masque = f"{prenom[0].upper()}." if prenom else "?"
    return nom_masque, prenom_masque

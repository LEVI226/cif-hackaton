"""Detection de motifs inhabituels sur une transaction - heuristiques simples et
explicites, pas un modele de scoring de risque.

Les seuils ci-dessous sont des constantes de depart ajustables par un agent
conformite (via /admin a terme) - ce ne sont PAS des seuils reglementaires BCEAO
verifies, juste une base raisonnable et documentee pour la demo (cf. TDR : "une
estimation assumee suffit").
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.transaction import Transaction, TransactionType

SEUIL_FRACTIONNEMENT_FCFA = 1_000_000
FENETRE_FRACTIONNEMENT_HEURES = 24
NB_MIN_OPERATIONS_FRACTIONNEMENT = 3

FACTEUR_MONTANT_INHABITUEL = 5
NB_MIN_HISTORIQUE_POUR_MOYENNE = 3

NB_OPERATIONS_CLIENT_HABITUEL = 5
FENETRE_CLASSIFICATION_JOURS = 30


def detect_anomalies(
    db: Session, account: Account, montant: float, type_: TransactionType
) -> list[str]:
    """Retourne la liste des motifs d'alerte informative declenches par cette
    operation, avant qu'elle ne soit persistee. Liste vide = rien d'inhabituel."""
    reasons: list[str] = []

    if type_ in (TransactionType.DEPOT, TransactionType.RETRAIT) and montant < SEUIL_FRACTIONNEMENT_FCFA:
        window_start = datetime.now(timezone.utc) - timedelta(hours=FENETRE_FRACTIONNEMENT_HEURES)
        recent_small_count = (
            db.query(Transaction)
            .filter(
                Transaction.account_id == account.id,
                Transaction.type == type_,
                Transaction.montant < SEUIL_FRACTIONNEMENT_FCFA,
                Transaction.date >= window_start,
            )
            .count()
        )
        total_including_this_one = recent_small_count + 1
        if total_including_this_one >= NB_MIN_OPERATIONS_FRACTIONNEMENT:
            reasons.append(
                f"fractionnement possible : {total_including_this_one} operations "
                f"sous {SEUIL_FRACTIONNEMENT_FCFA:,.0f} FCFA en "
                f"{FENETRE_FRACTIONNEMENT_HEURES}h sur ce compte".replace(",", " ")
            )

    history = (
        db.query(Transaction)
        .filter(Transaction.account_id == account.id)
        .order_by(Transaction.date.desc())
        .limit(90)
        .all()
    )
    if len(history) >= NB_MIN_HISTORIQUE_POUR_MOYENNE:
        moyenne = sum(float(t.montant) for t in history) / len(history)
        if moyenne > 0 and montant > moyenne * FACTEUR_MONTANT_INHABITUEL:
            reasons.append(
                f"montant inhabituel : {montant:,.0f} FCFA contre une moyenne "
                f"recente de {moyenne:,.0f} FCFA sur ce compte".replace(",", " ")
            )

    return reasons


def classify_client_activity(transaction_count_recent: int) -> str:
    """'HABITUEL' si le client a depasse le seuil d'operations recentes, sinon
    'OCCASIONNEL' - repond a l'exigence TDR de recensement client occasionnel/habituel."""
    return "HABITUEL" if transaction_count_recent >= NB_OPERATIONS_CLIENT_HABITUEL else "OCCASIONNEL"

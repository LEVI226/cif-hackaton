"""Orchestration du filtrage : charge les listes depuis la base, applique le moteur
flou (app.services.fuzzy_match), persiste le ScreeningResult et ouvre une Alert si
la decision n'est pas AUCUN. Point d'entree unique utilise par les routers clients,
transactions et screening.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.sanctions import PPEEntry, SanctionEntry
from app.models.screening import ScreeningResult
from app.services.fuzzy_match import MatchCandidate, ScreeningDecision, screen


def _load_candidates(db: Session) -> list[MatchCandidate]:
    candidates: list[MatchCandidate] = []
    for entry in db.query(SanctionEntry).all():
        candidates.append(
            MatchCandidate(
                entry_id=f"sanction:{entry.id}",
                source=entry.source,
                full_name=entry.full_name,
                aliases=tuple(entry.aliases or ()),
            )
        )
    for entry in db.query(PPEEntry).all():
        candidates.append(
            MatchCandidate(
                entry_id=f"ppe:{entry.id}",
                source="PPE",
                full_name=entry.full_name,
                aliases=(),
            )
        )
    return candidates


def run_screening(
    db: Session,
    query_nom: str,
    client_fid: str | None = None,
) -> tuple[ScreeningResult, Alert | None]:
    """Filtre `query_nom`, persiste le resultat, et ouvre une alerte si necessaire."""
    candidates = _load_candidates(db)
    decision, match = screen(query_nom, candidates)

    result = ScreeningResult(
        client_fid=client_fid,
        query_nom=query_nom,
        matched_entry_type=match.candidate.source if match else None,
        matched_entry_id=(
            int(match.candidate.entry_id.split(":")[1]) if match else None
        ),
        matched_on=match.matched_on if match else None,
        score=match.score if match else 0.0,
        decision=decision,
    )
    db.add(result)
    db.flush()  # obtient result.id sans committer

    alert: Alert | None = None
    if decision != ScreeningDecision.AUCUN:
        alert = Alert(screening_result_id=result.id)
        db.add(alert)
        db.flush()

    return result, alert


def open_pattern_alert(
    db: Session, reasons: list[str], client_fid: str | None = None
) -> tuple[ScreeningResult, Alert]:
    """Ouvre une alerte a partir d'un motif comportemental (fractionnement, montant
    inhabituel - cf. app.services.anomaly) plutot que d'une correspondance de nom.

    Toujours INFORMATIF, jamais BLOQUANT : une heuristique de motif ne verrouille
    pas un compte a elle seule, contrairement a une correspondance de sanction
    confirmee (cf. app.services.fuzzy_match.screen) - choix deliberement prudent
    pour eviter de bloquer une operation legitime sur une simple statistique.
    """
    result = ScreeningResult(
        client_fid=client_fid,
        query_nom="",
        matched_entry_type="COMPORTEMENT",
        matched_entry_id=None,
        matched_on="; ".join(reasons),
        score=1.0,
        decision=ScreeningDecision.INFORMATIF,
    )
    db.add(result)
    db.flush()

    alert = Alert(screening_result_id=result.id)
    db.add(alert)
    db.flush()

    return result, alert

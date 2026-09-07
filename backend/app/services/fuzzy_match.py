"""Moteur de filtrage flou - rapprochement de noms contre listes de sanctions et PPE.

Utilise RapidFuzz (WRatio, base sur Jaro-Winkler/Levenshtein ponderes) pour tolerer
les homonymies et variations de translitteration (ex: "Mohamed" vs "Muhammad"),
apres normalisation (minuscules, accents retires, espaces multiples) pour ne pas
penaliser des differences purement typographiques.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field
from enum import Enum

from rapidfuzz import fuzz


class ScreeningDecision(str, Enum):
    AUCUN = "AUCUN"
    INFORMATIF = "INFORMATIF"
    BLOQUANT = "BLOQUANT"


DEFAULT_THRESHOLD_BLOQUANT = 0.92
DEFAULT_THRESHOLD_INFORMATIF = 0.75


def normalize_name(name: str) -> str:
    """Normalise un nom pour la comparaison : minuscules, sans accents, espaces uniques."""
    decomposed = unicodedata.normalize("NFKD", name)
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(without_accents.lower().split())


@dataclass(frozen=True)
class MatchCandidate:
    entry_id: str
    source: str  # "ONU" | "OFAC" | "UE" | "PPE"
    full_name: str
    aliases: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ScreeningMatch:
    candidate: MatchCandidate
    score: float
    matched_on: str  # le nom/alias qui a produit le meilleur score


def best_match(query: str, candidates: list[MatchCandidate]) -> ScreeningMatch | None:
    """Retourne la meilleure correspondance floue, ou None si la liste est vide."""
    if not candidates:
        return None
    normalized_query = normalize_name(query)
    best: ScreeningMatch | None = None
    for candidate in candidates:
        for name in (candidate.full_name, *candidate.aliases):
            score = fuzz.WRatio(normalized_query, normalize_name(name)) / 100.0
            if best is None or score > best.score:
                best = ScreeningMatch(candidate=candidate, score=score, matched_on=name)
    return best


def decide(
    match: ScreeningMatch | None,
    threshold_bloquant: float = DEFAULT_THRESHOLD_BLOQUANT,
    threshold_informatif: float = DEFAULT_THRESHOLD_INFORMATIF,
) -> ScreeningDecision:
    """Applique les seuils reseau a un score de correspondance pour decider l'issue."""
    if match is None or match.score < threshold_informatif:
        return ScreeningDecision.AUCUN
    if match.score >= threshold_bloquant:
        return ScreeningDecision.BLOQUANT
    return ScreeningDecision.INFORMATIF


def screen(
    query: str,
    candidates: list[MatchCandidate],
    threshold_bloquant: float = DEFAULT_THRESHOLD_BLOQUANT,
    threshold_informatif: float = DEFAULT_THRESHOLD_INFORMATIF,
) -> tuple[ScreeningDecision, ScreeningMatch | None]:
    """Point d'entree unique du module : filtre `query` contre `candidates`."""
    match = best_match(query, candidates)
    decision = decide(match, threshold_bloquant, threshold_informatif)
    return decision, match

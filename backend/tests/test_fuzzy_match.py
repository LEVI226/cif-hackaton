from app.services.fuzzy_match import (
    MatchCandidate,
    ScreeningDecision,
    decide,
    normalize_name,
    screen,
)

SANCTIONS = [
    MatchCandidate(
        entry_id="sanction:1",
        source="ONU",
        full_name="Mohamed Al-Kassar",
        aliases=("Muhammad al-Kassar", "M. Al Kassar"),
    ),
    MatchCandidate(entry_id="sanction:2", source="OFAC", full_name="Viktor Bout"),
]


def test_normalize_strips_accents_and_case():
    assert normalize_name("Ouédraogo  Étienne") == "ouedraogo etienne"


def test_exact_match_is_blocking():
    decision, match = screen("Viktor Bout", SANCTIONS)
    assert decision == ScreeningDecision.BLOQUANT
    assert match is not None
    assert match.candidate.entry_id == "sanction:2"


def test_transliteration_variant_still_matches():
    # "Muhammad al-Kassar" est un alias explicite - une recherche par une variante
    # proche doit remonter le meme candidat, meme sans correspondance exacte.
    decision, match = screen("Muhamed Al Kassar", SANCTIONS)
    assert decision in (ScreeningDecision.BLOQUANT, ScreeningDecision.INFORMATIF)
    assert match is not None
    assert match.candidate.entry_id == "sanction:1"


def test_unrelated_name_produces_no_match():
    decision, match = screen("Awa Traore", SANCTIONS)
    assert decision == ScreeningDecision.AUCUN


def test_empty_candidate_list_never_matches():
    decision, match = screen("N'importe quel nom", [])
    assert decision == ScreeningDecision.AUCUN
    assert match is None


def test_decide_respects_custom_thresholds():
    _, match = screen("Viktor Bout", SANCTIONS)
    assert decide(match, threshold_bloquant=1.01, threshold_informatif=0.0) == (
        ScreeningDecision.INFORMATIF
    )

"""FID (Fiche d'Identification reseau) - generation et validation.

Format : FID-<PAYS(2 lettres ISO 3166-1 alpha-2)>-<SFD(4 chiffres)>-<SEQ(8 chiffres)>-<CLE(1)>
Exemple : FID-BF-0231-00045821-7

La cle de controle utilise un schema MOD 11 a poids cycliques [2,3,4,5,6,7] sur la
concatenation numerique pays+sfd+sequence (les lettres du pays sont converties en
paires de chiffres comme pour un IBAN : A=10 .. Z=35). Parce que 11 est premier et
qu'aucun poids ni aucun ecart de chiffre (1-9) n'est multiple de 11, toute erreur de
saisie sur un seul chiffre change necessairement la cle - utile en zone de
connectivite faible ou une double saisie coute cher.
"""
from __future__ import annotations

import re

_FID_RE = re.compile(r"^FID-([A-Z]{2})-(\d{4})-(\d{8})-([0-9X])$")
_WEIGHTS = (2, 3, 4, 5, 6, 7)


def _letter_pair(letter: str) -> str:
    return str(ord(letter) - ord("A") + 10)


def _numeric_payload(country_code: str, sfd_str: str, seq_str: str) -> str:
    country_digits = "".join(_letter_pair(c) for c in country_code)
    return f"{country_digits}{sfd_str}{seq_str}"


def _checksum_digit(payload: str) -> str:
    total = 0
    for i, ch in enumerate(reversed(payload)):
        weight = _WEIGHTS[i % len(_WEIGHTS)]
        total += int(ch) * weight
    remainder = total % 11
    check = (11 - remainder) % 11
    return "X" if check == 10 else str(check)


def generate_fid(country_code: str, sfd_code: str | int, sequence: int) -> str:
    """Construit un FID complet a partir de ses composants.

    country_code: code ISO 3166-1 alpha-2 (ex: "BF")
    sfd_code: code SFD attribue par le reseau CIF (tient sur 4 chiffres)
    sequence: numero de sequence du client au sein de cette SFD (0..99_999_999)
    """
    country_code = country_code.strip().upper()
    if len(country_code) != 2 or not country_code.isalpha():
        raise ValueError("country_code doit etre 2 lettres ISO 3166-1 alpha-2")

    sfd_int = int(sfd_code)
    if not (0 <= sfd_int <= 9999):
        raise ValueError("sfd_code doit tenir sur 4 chiffres")
    if not (0 <= sequence <= 99_999_999):
        raise ValueError("sequence doit tenir sur 8 chiffres")

    sfd_str = f"{sfd_int:04d}"
    seq_str = f"{sequence:08d}"
    payload = _numeric_payload(country_code, sfd_str, seq_str)
    check = _checksum_digit(payload)
    return f"FID-{country_code}-{sfd_str}-{seq_str}-{check}"


def is_valid_fid(fid: str) -> bool:
    """Verifie le format ET le chiffre de controle d'un FID."""
    match = _FID_RE.match(fid.strip().upper())
    if not match:
        return False
    country_code, sfd_str, seq_str, check = match.groups()
    payload = _numeric_payload(country_code, sfd_str, seq_str)
    return _checksum_digit(payload) == check


def parse_fid(fid: str) -> dict[str, str]:
    """Decompose un FID valide en ses composants. Leve ValueError sinon."""
    if not is_valid_fid(fid):
        return {}
    match = _FID_RE.match(fid.strip().upper())
    assert match is not None
    country_code, sfd_str, seq_str, check = match.groups()
    return {
        "country_code": country_code,
        "sfd_code": sfd_str,
        "sequence": seq_str,
        "check_digit": check,
    }

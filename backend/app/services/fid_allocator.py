"""Attribution d'un nouveau FID pour une SFD donnee.

Note hackathon : l'increment de `SFD.next_client_seq` se fait dans la meme
transaction que la creation du client, ce qui suffit a la demo mono-processus.
Un deploiement multi-instance a plus forte concurrence voudrait un
`SELECT ... FOR UPDATE` (Postgres) sur la ligne SFD avant l'increment.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.sfd import SFD
from app.services.fid import generate_fid


def allocate_fid(db: Session, sfd: SFD) -> str:
    sequence = sfd.next_client_seq
    fid = generate_fid(sfd.country_code, sfd.code, sequence)
    sfd.next_client_seq = sequence + 1
    db.add(sfd)
    return fid

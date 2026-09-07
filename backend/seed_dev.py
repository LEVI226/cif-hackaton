"""Jeu de donnees minimal pour un test manuel/smoke - PAS un script de demo final."""
from app.database import Base, SessionLocal, engine
from app.models.sfd import SFD, Country
from app.models.user import StaffUser
from app.services.security import Role, hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if not db.get(Country, "BF"):
    db.add(Country(code="BF", name="Burkina Faso"))

sfd = db.query(SFD).filter(SFD.code == "0231").first()
if not sfd:
    sfd = SFD(code="0231", name="Caisse Ouaga Centre", country_code="BF", next_client_seq=1)
    db.add(sfd)
    db.flush()

for username, role in [
    ("agent1", Role.AGENT_GUICHET),
    ("conformite1", Role.AGENT_CONFORMITE),
    ("admin1", Role.ADMIN_RESEAU),
]:
    if not db.query(StaffUser).filter(StaffUser.username == username).first():
        db.add(
            StaffUser(
                username=username,
                password_hash=hash_password("Test1234!"),
                role=role,
                sfd_id=sfd.id if role != Role.ADMIN_RESEAU else None,
            )
        )

db.commit()
print("seed ok")

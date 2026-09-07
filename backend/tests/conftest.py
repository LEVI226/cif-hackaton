import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.sfd import SFD, Country
from app.models.user import StaffUser
from app.services.security import Role, hash_password


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_sfd(db_session):
    country = Country(code="BF", name="Burkina Faso")
    sfd = SFD(code="0231", name="Caisse Ouaga Centre", country_code="BF", next_client_seq=1)
    db_session.add_all([country, sfd])
    db_session.commit()
    db_session.refresh(sfd)
    return sfd


@pytest.fixture()
def agent_guichet(db_session, seeded_sfd):
    user = StaffUser(
        username="agent1",
        password_hash=hash_password("motdepasse-test"),
        role=Role.AGENT_GUICHET,
        sfd_id=seeded_sfd.id,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def agent_conformite(db_session, seeded_sfd):
    user = StaffUser(
        username="conformite1",
        password_hash=hash_password("motdepasse-test"),
        role=Role.AGENT_CONFORMITE,
        sfd_id=seeded_sfd.id,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def admin_reseau(db_session):
    user = StaffUser(
        username="admin1",
        password_hash=hash_password("motdepasse-test"),
        role=Role.ADMIN_RESEAU,
        sfd_id=None,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def seeded_sfd_banfora(db_session, seeded_sfd):
    sfd = SFD(code="0450", name="Caisse Banfora", country_code="BF", next_client_seq=1)
    db_session.add(sfd)
    db_session.commit()
    db_session.refresh(sfd)
    return sfd


@pytest.fixture()
def agent_guichet_banfora(db_session, seeded_sfd_banfora):
    user = StaffUser(
        username="agent_banfora",
        password_hash=hash_password("motdepasse-test"),
        role=Role.AGENT_GUICHET,
        sfd_id=seeded_sfd_banfora.id,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def conformite_reseau(db_session):
    user = StaffUser(
        username="conformite_reseau1",
        password_hash=hash_password("motdepasse-test"),
        role=Role.CONFORMITE_RESEAU,
        sfd_id=None,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def auditeur(db_session):
    user = StaffUser(
        username="auditeur1",
        password_hash=hash_password("motdepasse-test"),
        role=Role.AUDITEUR,
        sfd_id=None,
    )
    db_session.add(user)
    db_session.commit()
    return user


def auth_headers(client: TestClient, username: str, password: str = "motdepasse-test") -> dict:
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

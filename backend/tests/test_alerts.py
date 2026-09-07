from app.models.sanctions import SanctionEntry
from conftest import auth_headers


def _seed_sanction(db_session):
    entry = SanctionEntry(source="ONU", full_name="Mohamed Al-Kassar", aliases=[])
    db_session.add(entry)
    db_session.commit()
    return entry


def test_client_creation_on_sanctioned_name_opens_alert(
    client, agent_guichet, agent_conformite, db_session
):
    _seed_sanction(db_session)
    guichet_headers = auth_headers(client, "agent1")

    created = client.post(
        "/clients",
        json={"nom": "Al-Kassar", "prenom": "Mohamed"},
        headers=guichet_headers,
    )
    assert created.status_code == 201

    conformite_headers = auth_headers(client, "conformite1")
    alerts = client.get("/alerts", headers=conformite_headers)
    assert alerts.status_code == 200
    body = alerts.json()
    assert len(body) == 1
    assert body[0]["statut"] == "OUVERTE"
    assert body[0]["client_fid"] == created.json()["fid"]


def test_unrelated_name_creates_no_alert(client, agent_guichet, agent_conformite, db_session):
    _seed_sanction(db_session)
    guichet_headers = auth_headers(client, "agent1")

    client.post(
        "/clients", json={"nom": "Traore", "prenom": "Awa"}, headers=guichet_headers
    )

    conformite_headers = auth_headers(client, "conformite1")
    alerts = client.get("/alerts", headers=conformite_headers)
    assert alerts.json() == []


def test_agent_guichet_cannot_resolve_alerts(client, agent_guichet, db_session):
    _seed_sanction(db_session)
    headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients", json={"nom": "Al-Kassar", "prenom": "Mohamed"}, headers=headers
    )
    assert created.status_code == 201

    alert_id = 1  # premiere alerte de la base de test
    response = client.patch(
        f"/alerts/{alert_id}",
        json={"statut": "LEVEE", "resolution_note": "faux positif"},
        headers=headers,
    )
    assert response.status_code == 403


def test_resolve_alert_records_note_and_timestamp(
    client, agent_guichet, agent_conformite, db_session
):
    _seed_sanction(db_session)
    guichet_headers = auth_headers(client, "agent1")
    client.post(
        "/clients", json={"nom": "Al-Kassar", "prenom": "Mohamed"}, headers=guichet_headers
    )

    conformite_headers = auth_headers(client, "conformite1")
    alert_id = client.get("/alerts", headers=conformite_headers).json()[0]["id"]

    response = client.patch(
        f"/alerts/{alert_id}",
        json={"statut": "LEVEE", "resolution_note": "Homonyme confirme, dossier different"},
        headers=conformite_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["statut"] == "LEVEE"

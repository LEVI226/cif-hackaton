from app.models.alert import Alert
from conftest import auth_headers


def _make_client(client, headers, nom, prenom):
    return client.post("/clients", json={"nom": nom, "prenom": prenom}, headers=headers).json()


def test_mandataire_linked_to_two_clients_opens_informative_alert(
    client, agent_guichet, agent_conformite, seeded_sfd
):
    guichet_headers = auth_headers(client, "agent1")
    conformite_headers = auth_headers(client, "conformite1")

    client_a = _make_client(client, guichet_headers, "Traore", "Awa")
    client_b = _make_client(client, guichet_headers, "Kabore", "Issa")

    first = client.post(
        "/mandats",
        json={
            "client_fid": client_a["fid"],
            "mandataire_nom": "Some Paul",
            "mandataire_piece": "CNIB-MAND-002",
            "date_debut": "2026-01-01",
            "date_fin": "2026-12-31",
            "plafond": 200_000,
        },
        headers=conformite_headers,
    )
    assert first.status_code == 201

    second = client.post(
        "/mandats",
        json={
            "client_fid": client_b["fid"],
            "mandataire_nom": "Some Paul",
            "mandataire_piece": "CNIB-MAND-002",
            "date_debut": "2026-01-01",
            "date_fin": "2026-12-31",
            "plafond": 500_000,
        },
        headers=conformite_headers,
    )
    assert second.status_code == 201

    alerts = client.get("/alerts", params={"statut": "OUVERTE"}, headers=conformite_headers)
    reasons = [a["matched_on"] for a in alerts.json()]
    assert any("deja lie a" in (r or "") for r in reasons)


def test_single_client_mandataire_opens_no_alert(client, agent_guichet, agent_conformite, seeded_sfd):
    guichet_headers = auth_headers(client, "agent1")
    conformite_headers = auth_headers(client, "conformite1")
    created = _make_client(client, guichet_headers, "Sawadogo", "Boureima")

    client.post(
        "/mandats",
        json={
            "client_fid": created["fid"],
            "mandataire_nom": "Issa Kabore",
            "mandataire_piece": "CNIB-UNIQUE",
            "date_debut": "2026-01-01",
            "date_fin": "2026-12-31",
            "plafond": 100_000,
        },
        headers=conformite_headers,
    )

    alerts = client.get("/alerts", params={"statut": "OUVERTE"}, headers=conformite_headers)
    assert alerts.json() == []

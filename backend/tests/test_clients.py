from app.models.account import Account
from app.services.fid import is_valid_fid
from conftest import auth_headers


def test_create_client_generates_valid_fid(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    response = client.post(
        "/clients",
        json={"nom": "Traore", "prenom": "Awa", "nationalite": "BF"},
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert is_valid_fid(body["fid"])
    assert body["fid"].startswith("FID-BF-0231-")


def test_create_client_rejects_expired_piece(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    response = client.post(
        "/clients",
        json={
            "nom": "Traore",
            "prenom": "Awa",
            "type_piece": "CNIB",
            "numero_piece": "B123456",
            "date_expiration_piece": "2020-01-01",
        },
        headers=headers,
    )
    assert response.status_code == 409
    assert "expiree" in response.json()["detail"]


def test_create_personne_morale_requires_beneficiaire_effectif(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    response = client.post(
        "/clients",
        json={"nom": "Societe Sahel", "prenom": "", "type_client": "MORALE"},
        headers=headers,
    )
    assert response.status_code == 409
    assert "Beneficiaire effectif" in response.json()["detail"]


def test_sequence_increments_across_clients(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    first = client.post(
        "/clients", json={"nom": "Traore", "prenom": "Awa"}, headers=headers
    ).json()
    second = client.post(
        "/clients", json={"nom": "Kabore", "prenom": "Issa"}, headers=headers
    ).json()
    assert first["fid"] != second["fid"]
    assert first["fid"].split("-")[3] != second["fid"].split("-")[3]


def test_agent_conformite_cannot_create_client(client, agent_conformite):
    headers = auth_headers(client, "conformite1")
    response = client.post(
        "/clients", json={"nom": "Traore", "prenom": "Awa"}, headers=headers
    )
    assert response.status_code == 403


def test_search_finds_client_by_partial_name(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    client.post("/clients", json={"nom": "Ouedraogo", "prenom": "Awa"}, headers=headers)

    response = client.get("/clients/search", params={"q": "awa"}, headers=headers)
    assert response.status_code == 200
    results = response.json()
    assert any(c["nom"] == "Ouedraogo" for c in results)


def test_solde_global_aggregates_multiple_accounts(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients", json={"nom": "Sawadogo", "prenom": "Boureima"}, headers=headers
    ).json()
    fid = created["fid"]

    db_session.add_all(
        [
            Account(numero_compte="CPT-001", client_fid=fid, sfd_id=seeded_sfd.id, solde=340_000),
            Account(numero_compte="CPT-002", client_fid=fid, sfd_id=seeded_sfd.id, solde=90_000),
        ]
    )
    db_session.commit()

    response = client.get(f"/clients/{fid}/solde-global", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["solde_total"] == 430_000
    assert len(body["comptes"]) == 2


def test_solde_global_unknown_fid_404(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    response = client.get("/clients/FID-BF-0231-99999999-0/solde-global", headers=headers)
    assert response.status_code == 404

from conftest import auth_headers


def test_create_account_for_client(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients",
        json={"nom": "Traore", "prenom": "Awa"},
        headers=headers,
    ).json()

    response = client.post(
        "/accounts",
        json={"client_fid": created["fid"], "numero_compte": "CPT-DEMO-001", "solde": 100_000},
        headers=headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["numero_compte"] == "CPT-DEMO-001"
    assert body["client_fid"] == created["fid"]
    assert body["solde"] == 100_000


def test_create_account_rejects_duplicate_number(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients",
        json={"nom": "Traore", "prenom": "Awa"},
        headers=headers,
    ).json()
    payload = {"client_fid": created["fid"], "numero_compte": "CPT-DEMO-001", "solde": 0}

    first = client.post("/accounts", json=payload, headers=headers)
    second = client.post("/accounts", json=payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 409

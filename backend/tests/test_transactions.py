from app.models.account import Account
from app.models.sanctions import SanctionEntry
from conftest import auth_headers


def _create_account(db_session, seeded_sfd, client_fid, numero="CPT-100", solde=0):
    account = Account(numero_compte=numero, client_fid=client_fid, sfd_id=seeded_sfd.id, solde=solde)
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account


def _make_client(client, headers, nom="Traore", prenom="Awa"):
    return client.post("/clients", json={"nom": nom, "prenom": prenom}, headers=headers).json()


def test_depot_increases_solde(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    account = _create_account(db_session, seeded_sfd, created["fid"])

    response = client.post(
        "/transactions",
        json={"numero_compte": account.numero_compte, "montant": 50_000, "type": "DEPOT"},
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["statut"] == "VALIDEE"

    db_session.refresh(account)
    assert float(account.solde) == 50_000


def test_retrait_insufficient_funds_rejected(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    account = _create_account(db_session, seeded_sfd, created["fid"], solde=10_000)

    response = client.post(
        "/transactions",
        json={"numero_compte": account.numero_compte, "montant": 50_000, "type": "RETRAIT"},
        headers=headers,
    )
    assert response.status_code == 400


def test_retrait_decreases_solde(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    account = _create_account(db_session, seeded_sfd, created["fid"], solde=100_000)

    response = client.post(
        "/transactions",
        json={"numero_compte": account.numero_compte, "montant": 30_000, "type": "RETRAIT"},
        headers=headers,
    )
    assert response.status_code == 201
    db_session.refresh(account)
    assert float(account.solde) == 70_000


def test_retrait_par_procuration_requires_valid_mandat(
    client, agent_guichet, agent_conformite, db_session, seeded_sfd
):
    guichet_headers = auth_headers(client, "agent1")
    conformite_headers = auth_headers(client, "conformite1")
    created = _make_client(client, guichet_headers)
    account = _create_account(db_session, seeded_sfd, created["fid"], solde=100_000)

    rejected = client.post(
        "/transactions",
        json={
            "numero_compte": account.numero_compte,
            "montant": 30_000,
            "type": "RETRAIT",
            "mandataire_nom": "Issa Kabore",
            "mandataire_piece": "CNIB-ISSA",
        },
        headers=guichet_headers,
    )
    assert rejected.status_code == 409

    mandat_response = client.post(
        "/mandats",
        json={
            "client_fid": created["fid"],
            "mandataire_nom": "Issa Kabore",
            "mandataire_piece": "CNIB-ISSA",
            "date_debut": "2026-01-01",
            "date_fin": "2026-12-31",
            "plafond": 50_000,
        },
        headers=conformite_headers,
    )
    assert mandat_response.status_code == 201

    accepted = client.post(
        "/transactions",
        json={
            "numero_compte": account.numero_compte,
            "montant": 30_000,
            "type": "RETRAIT",
            "mandataire_nom": "Issa Kabore",
            "mandataire_piece": "CNIB-ISSA",
        },
        headers=guichet_headers,
    )
    assert accepted.status_code == 201
    body = accepted.json()
    assert body["mandat_id"] == mandat_response.json()["id"]
    assert any("procuration" in reason for reason in body["alert_reasons"])

    db_session.refresh(account)
    assert float(account.solde) == 70_000


def test_virement_missing_beneficiaire_rejected(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    account = _create_account(db_session, seeded_sfd, created["fid"], solde=100_000)

    response = client.post(
        "/transactions",
        json={"numero_compte": account.numero_compte, "montant": 10_000, "type": "VIREMENT"},
        headers=headers,
    )
    assert response.status_code == 422


def test_virement_to_sanctioned_name_blocks_account(
    client, agent_guichet, agent_conformite, db_session, seeded_sfd
):
    db_session.add(SanctionEntry(source="ONU", full_name="Viktor Bout", aliases=[]))
    db_session.commit()

    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    account = _create_account(db_session, seeded_sfd, created["fid"], solde=100_000)

    response = client.post(
        "/transactions",
        json={
            "numero_compte": account.numero_compte,
            "montant": 10_000,
            "type": "VIREMENT",
            "beneficiaire_nom": "Viktor Bout",
        },
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["statut"] == "BLOQUEE"
    assert any("bloquant" in reason for reason in body["alert_reasons"])

    db_session.refresh(account)
    assert account.statut == "BLOQUE"
    assert float(account.solde) == 100_000  # le solde n'a pas bouge

    # Une seconde operation sur ce compte doit maintenant etre refusee.
    second = client.post(
        "/transactions",
        json={"numero_compte": account.numero_compte, "montant": 1_000, "type": "DEPOT"},
        headers=headers,
    )
    assert second.status_code == 409


def test_structuring_pattern_flagged(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    account = _create_account(db_session, seeded_sfd, created["fid"], solde=0)

    last_response = None
    for _ in range(3):
        last_response = client.post(
            "/transactions",
            json={"numero_compte": account.numero_compte, "montant": 400_000, "type": "DEPOT"},
            headers=headers,
        )
        assert last_response.status_code == 201

    body = last_response.json()
    assert any("fractionnement" in reason for reason in body["alert_reasons"])


def test_unrelated_transaction_amount_not_flagged(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    account = _create_account(db_session, seeded_sfd, created["fid"], solde=0)

    response = client.post(
        "/transactions",
        json={"numero_compte": account.numero_compte, "montant": 5_000, "type": "DEPOT"},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["alert_reasons"] == []


def test_mouvements_endpoint_classifies_client(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    fid = created["fid"]
    account = _create_account(db_session, seeded_sfd, fid, solde=0)

    for _ in range(5):
        client.post(
            "/transactions",
            json={"numero_compte": account.numero_compte, "montant": 5_000, "type": "DEPOT"},
            headers=headers,
        )

    response = client.get(f"/clients/{fid}/mouvements", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["classification"] == "HABITUEL"
    assert body["nb_operations_recentes"] == 5
    assert len(body["mouvements"]) == 5


def test_mouvements_occasionnel_by_default(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    fid = created["fid"]
    _create_account(db_session, seeded_sfd, fid, solde=0)

    response = client.get(f"/clients/{fid}/mouvements", headers=headers)
    assert response.status_code == 200
    assert response.json()["classification"] == "OCCASIONNEL"


def test_read_transactions_requires_role(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = _make_client(client, headers)
    account = _create_account(db_session, seeded_sfd, created["fid"])

    response = client.get(f"/transactions/compte/{account.numero_compte}", headers=headers)
    assert response.status_code == 200
    assert response.json() == []


def test_transaction_writes_audit_log(client, agent_guichet, agent_conformite, db_session, seeded_sfd):
    guichet_headers = auth_headers(client, "agent1")
    conformite_headers = auth_headers(client, "conformite1")
    created = _make_client(client, guichet_headers)
    account = _create_account(db_session, seeded_sfd, created["fid"])

    response = client.post(
        "/transactions",
        json={"numero_compte": account.numero_compte, "montant": 25_000, "type": "DEPOT"},
        headers=guichet_headers,
    )
    assert response.status_code == 201

    audit_response = client.get("/audit", headers=conformite_headers)
    assert audit_response.status_code == 200
    logs = audit_response.json()
    assert any(log["action"] == "CREATE_TRANSACTION" for log in logs)

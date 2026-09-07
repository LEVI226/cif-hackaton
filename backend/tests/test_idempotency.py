from app.models.account import Account
from app.models.client import Client
from app.models.transaction import Transaction
from conftest import auth_headers


def test_replaying_client_creation_does_not_duplicate(client, agent_guichet, db_session):
    headers = {**auth_headers(client, "agent1"), "Idempotency-Key": "device-abc-op-1"}
    payload = {"nom": "Traore", "prenom": "Awa"}

    first = client.post("/clients", json=payload, headers=headers)
    second = client.post("/clients", json=payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json() == second.json()
    assert db_session.query(Client).count() == 1


def test_different_keys_create_different_clients(client, agent_guichet, db_session):
    headers1 = {**auth_headers(client, "agent1"), "Idempotency-Key": "op-a"}
    headers2 = {**auth_headers(client, "agent1"), "Idempotency-Key": "op-b"}
    payload = {"nom": "Traore", "prenom": "Awa"}

    client.post("/clients", json=payload, headers=headers1)
    client.post("/clients", json=payload, headers=headers2)

    assert db_session.query(Client).count() == 2


def test_replaying_transaction_does_not_double_debit(client, agent_guichet, db_session, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = client.post("/clients", json={"nom": "Kabore", "prenom": "Issa"}, headers=headers).json()
    account = Account(
        numero_compte="CPT-900", client_fid=created["fid"], sfd_id=seeded_sfd.id, solde=100_000
    )
    db_session.add(account)
    db_session.commit()

    replay_headers = {**headers, "Idempotency-Key": "device-xyz-op-7"}
    payload = {"numero_compte": "CPT-900", "montant": 30_000, "type": "RETRAIT"}

    first = client.post("/transactions", json=payload, headers=replay_headers)
    second = client.post("/transactions", json=payload, headers=replay_headers)

    assert first.status_code == 201
    assert second.json() == first.json()
    assert db_session.query(Transaction).count() == 1

    db_session.refresh(account)
    assert float(account.solde) == 70_000  # debite une seule fois, pas deux

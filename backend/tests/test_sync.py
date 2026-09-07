from app.models.account import Account
from app.models.client import Client
from app.models.transaction import Transaction
from conftest import auth_headers


def test_sync_push_replays_offline_operations_once(client, agent_guichet, db_session):
    headers = auth_headers(client, "agent1")
    payload = {
        "device_id": "tablet-ouaga-1",
        "operations": [
            {
                "operation_id": "op-client-1",
                "type": "CREATE_CLIENT",
                "payload": {"nom": "Traore", "prenom": "Awa", "nationalite": "BF"},
            }
        ],
    }

    first = client.post("/sync/push", json=payload, headers=headers)
    second = client.post("/sync/push", json=payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["results"][0]["status"] == "APPLIED"
    assert second.json()["results"][0]["status"] == "REPLAYED"
    assert db_session.query(Client).count() == 1


def test_sync_push_batch_client_account_transaction(client, agent_guichet, db_session):
    headers = auth_headers(client, "agent1")
    push_client = client.post(
        "/sync/push",
        json={
            "device_id": "tablet-ouaga-1",
            "operations": [
                {
                    "operation_id": "op-client-1",
                    "type": "CREATE_CLIENT",
                    "payload": {"nom": "Kabore", "prenom": "Issa", "nationalite": "BF"},
                }
            ],
        },
        headers=headers,
    )
    fid = push_client.json()["results"][0]["response"]["fid"]

    push_ops = client.post(
        "/sync/push",
        json={
            "device_id": "tablet-ouaga-1",
            "operations": [
                {
                    "operation_id": "op-account-1",
                    "type": "CREATE_ACCOUNT",
                    "payload": {"client_fid": fid, "numero_compte": "SYNC-CPT-001", "solde": 100_000},
                },
                {
                    "operation_id": "op-transaction-1",
                    "type": "CREATE_TRANSACTION",
                    "payload": {"numero_compte": "SYNC-CPT-001", "montant": 25_000, "type": "RETRAIT"},
                },
            ],
        },
        headers=headers,
    )

    assert push_ops.status_code == 200
    body = push_ops.json()
    assert body["accepted"] == 2
    assert body["failed"] == 0
    assert db_session.query(Account).count() == 1
    assert db_session.query(Transaction).count() == 1
    account = db_session.query(Account).filter(Account.numero_compte == "SYNC-CPT-001").first()
    assert float(account.solde) == 75_000


def test_sync_pull_returns_recent_audit(client, agent_guichet, agent_conformite):
    guichet_headers = auth_headers(client, "agent1")
    conformite_headers = auth_headers(client, "conformite1")
    client.post(
        "/sync/push",
        json={
            "device_id": "tablet-ouaga-1",
            "operations": [
                {
                    "operation_id": "op-client-1",
                    "type": "CREATE_CLIENT",
                    "payload": {"nom": "Sawadogo", "prenom": "Mariam"},
                }
            ],
        },
        headers=guichet_headers,
    )

    pulled = client.get("/sync/pull", headers=conformite_headers)

    assert pulled.status_code == 200
    assert pulled.json()["server_time"]
    assert any(log["action"] == "CREATE_CLIENT" for log in pulled.json()["audit_logs"])

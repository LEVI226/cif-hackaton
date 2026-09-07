"""R005/R006 : seuil de depot/retrait par caisse - une caisse en zone rouge
(seuil abaisse) doit alerter la ou une caisse en zone verte ne le ferait pas."""
from app.models.account import Account
from app.models.sfd import SFD
from conftest import auth_headers


def test_deposit_above_local_threshold_flagged_at_low_threshold_sfd(
    client, db_session, agent_guichet, seeded_sfd
):
    seeded_sfd.zone_risque = "rouge"
    seeded_sfd.seuil_depot = 500_000
    db_session.add(seeded_sfd)
    db_session.commit()

    headers = auth_headers(client, "agent1")
    created = client.post("/clients", json={"nom": "Kabore", "prenom": "Amadou"}, headers=headers).json()
    account = Account(numero_compte="CPT-DORI-1", client_fid=created["fid"], sfd_id=seeded_sfd.id, solde=0)
    db_session.add(account)
    db_session.commit()

    response = client.post(
        "/transactions",
        json={"numero_compte": "CPT-DORI-1", "montant": 700_000, "type": "DEPOT"},
        headers=headers,
    )
    assert response.status_code == 201
    assert any("seuil local" in r for r in response.json()["alert_reasons"])


def test_same_amount_not_flagged_at_high_threshold_sfd(client, db_session, agent_guichet, seeded_sfd):
    seeded_sfd.zone_risque = "verte"
    seeded_sfd.seuil_depot = 1_000_000
    db_session.add(seeded_sfd)
    db_session.commit()

    headers = auth_headers(client, "agent1")
    created = client.post("/clients", json={"nom": "Some", "prenom": "Paul"}, headers=headers).json()
    account = Account(
        numero_compte="CPT-BANFORA-1", client_fid=created["fid"], sfd_id=seeded_sfd.id, solde=0
    )
    db_session.add(account)
    db_session.commit()

    response = client.post(
        "/transactions",
        json={"numero_compte": "CPT-BANFORA-1", "montant": 700_000, "type": "DEPOT"},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["alert_reasons"] == []

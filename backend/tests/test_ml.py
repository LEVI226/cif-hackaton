from conftest import auth_headers


def test_ml_risk_score_predicts_transaction_risk(client, agent_guichet):
    headers = auth_headers(client, "agent1")

    response = client.post(
        "/ml/risk-score",
        json={
            "type_operation": "VIREMENT",
            "montant": 12_000_000,
            "solde_compte": 20_000_000,
            "nb_ops_24h": 1,
            "nb_ops_30j": 4,
            "montant_moyen_30j": 800_000,
            "a_mandat": False,
            "client_ppe": True,
            "piece_expiree": False,
            "score_risque_client": 82,
        },
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] in {"NORMAL", "SUSPECTE", "BLOQUANTE"}
    assert body["probabilites"]
    assert body["model_version"].startswith("risk-rf")
    assert any("seuil" in reason or "politiquement" in reason for reason in body["explication"])

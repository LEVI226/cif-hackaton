from conftest import auth_headers


def test_login_success(client, agent_guichet):
    response = client.post(
        "/auth/login", json={"username": "agent1", "password": "motdepasse-test"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "AGENT_GUICHET"
    assert "access_token" in body


def test_login_wrong_password(client, agent_guichet):
    response = client.post(
        "/auth/login", json={"username": "agent1", "password": "mauvais-mdp"}
    )
    assert response.status_code == 401


def test_login_unknown_user(client):
    response = client.post(
        "/auth/login", json={"username": "fantome", "password": "peu-importe"}
    )
    assert response.status_code == 401


def test_protected_endpoint_requires_token(client):
    response = client.get("/clients/search", params={"q": "test"})
    assert response.status_code in (401, 403)


def test_valid_token_grants_access(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    response = client.get("/clients/search", params={"q": "test"}, headers=headers)
    assert response.status_code == 200

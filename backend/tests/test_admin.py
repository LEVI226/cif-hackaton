from conftest import auth_headers


def test_admin_can_create_and_list_sanction_entry(client, admin_reseau):
    headers = auth_headers(client, "admin1")
    response = client.post(
        "/admin/sanctions",
        json={"source": "OFAC", "full_name": "Viktor Bout", "aliases": ["Butt", "Bont"]},
        headers=headers,
    )
    assert response.status_code == 201

    listed = client.get("/admin/sanctions", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_non_admin_cannot_manage_sanctions(client, agent_guichet):
    headers = auth_headers(client, "agent1")
    response = client.post(
        "/admin/sanctions",
        json={"source": "ONU", "full_name": "Test Name"},
        headers=headers,
    )
    assert response.status_code == 403


def test_sanction_update_is_immediately_visible_to_screening(client, admin_reseau, agent_guichet):
    admin_headers = auth_headers(client, "admin1")
    client.post(
        "/admin/sanctions",
        json={"source": "ONU", "full_name": "Nouvelle Entree Sanctionnee"},
        headers=admin_headers,
    )

    guichet_headers = auth_headers(client, "agent1")
    screened = client.post(
        "/screening", json={"nom": "Nouvelle Entree Sanctionnee"}, headers=guichet_headers
    )
    assert screened.status_code == 200
    assert screened.json()["decision"] == "BLOQUANT"


def test_delete_sanction_entry(client, admin_reseau):
    headers = auth_headers(client, "admin1")
    created = client.post(
        "/admin/sanctions", json={"source": "UE", "full_name": "A Supprimer"}, headers=headers
    ).json()

    deleted = client.delete(f"/admin/sanctions/{created['id']}", headers=headers)
    assert deleted.status_code == 204

    listed = client.get("/admin/sanctions", headers=headers).json()
    assert listed == []


def test_admin_ppe_crud(client, admin_reseau):
    headers = auth_headers(client, "admin1")
    created = client.post(
        "/admin/ppe",
        json={"full_name": "Un Ministre", "fonction": "Ministre des Finances", "pays": "BF"},
        headers=headers,
    )
    assert created.status_code == 201

    listed = client.get("/admin/ppe", headers=headers)
    assert len(listed.json()) == 1

    deleted = client.delete(f"/admin/ppe/{created.json()['id']}", headers=headers)
    assert deleted.status_code == 204

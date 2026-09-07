"""Visibilite differenciee par role - le scenario de demo recommande par le
corpus CIF : un client avec des comptes a Ouaga ET Banfora, un agent de Banfora
qui ne voit pas le detail confidentiel de Ouaga sauf alerte confirmee."""
from app.models.sanctions import SanctionEntry
from conftest import auth_headers


def _client_with_two_sfd_accounts(client, guichet_headers, guichet_banfora_headers, seeded_sfd, seeded_sfd_banfora):
    created = client.post(
        "/clients", json={"nom": "Kabore", "prenom": "Amadou"}, headers=guichet_headers
    ).json()
    fid = created["fid"]
    client.post(
        "/accounts",
        json={"client_fid": fid, "numero_compte": "CPT-OUAGA-1", "solde": 300_000},
        headers=guichet_headers,
    )
    client.post(
        "/accounts",
        json={"client_fid": fid, "numero_compte": "CPT-BANFORA-1", "solde": 90_000},
        headers=guichet_banfora_headers,
    )
    return fid


def test_account_can_be_opened_at_a_different_sfd_than_creation(
    client, agent_guichet, agent_guichet_banfora, seeded_sfd, seeded_sfd_banfora
):
    guichet_headers = auth_headers(client, "agent1")
    banfora_headers = auth_headers(client, "agent_banfora")
    fid = _client_with_two_sfd_accounts(
        client, guichet_headers, banfora_headers, seeded_sfd, seeded_sfd_banfora
    )
    assert fid.startswith("FID-BF-0231-")  # cree cote Ouaga, compte ouvert ailleurs sans probleme


def test_local_agent_cannot_view_client_with_no_local_account(
    client, agent_guichet, agent_guichet_banfora, seeded_sfd
):
    guichet_headers = auth_headers(client, "agent1")
    banfora_headers = auth_headers(client, "agent_banfora")
    created = client.post(
        "/clients", json={"nom": "Traore", "prenom": "Awa"}, headers=guichet_headers
    ).json()

    response = client.get(f"/clients/{created['fid']}/solde-global", headers=banfora_headers)
    assert response.status_code == 403


def test_local_agent_sees_own_sfd_account_but_masks_other_sfd(
    client, agent_guichet, agent_guichet_banfora, seeded_sfd, seeded_sfd_banfora
):
    guichet_headers = auth_headers(client, "agent1")
    banfora_headers = auth_headers(client, "agent_banfora")
    fid = _client_with_two_sfd_accounts(
        client, guichet_headers, banfora_headers, seeded_sfd, seeded_sfd_banfora
    )

    response = client.get(f"/clients/{fid}/solde-global", headers=banfora_headers)
    assert response.status_code == 200
    body = response.json()

    assert body["vue"] == "LOCALE"
    assert body["comptes_masques"] == 1
    # Solde total = seulement la part locale (Banfora), jamais le vrai total reseau.
    assert body["solde_total"] == 90_000

    by_numero = {c["numero_compte"]: c for c in body["comptes"] if c["visible"]}
    assert "CPT-BANFORA-1" in by_numero
    masked = [c for c in body["comptes"] if not c["visible"]]
    assert len(masked) == 1
    assert masked[0]["solde"] is None


def test_agent_conformite_unlocks_full_view_with_live_alert(
    client, agent_guichet, agent_guichet_banfora, agent_conformite, db_session,
    seeded_sfd, seeded_sfd_banfora,
):
    db_session.add(SanctionEntry(source="ONU", full_name="Kabore Amadou", aliases=[]))
    db_session.commit()

    guichet_headers = auth_headers(client, "agent1")
    banfora_headers = auth_headers(client, "agent_banfora")
    # Le nom sanctionne declenche une alerte automatiquement a la creation.
    fid = _client_with_two_sfd_accounts(
        client, guichet_headers, banfora_headers, seeded_sfd, seeded_sfd_banfora
    )

    conformite_headers = auth_headers(client, "conformite1")  # conformite de la SFD Ouaga
    response = client.get(f"/clients/{fid}/solde-global", headers=conformite_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["vue"] == "RESEAU"
    assert body["comptes_masques"] == 0
    assert body["solde_total"] == 390_000


def test_agent_guichet_never_unlocks_even_with_alert(
    client, agent_guichet, agent_guichet_banfora, db_session, seeded_sfd, seeded_sfd_banfora
):
    db_session.add(SanctionEntry(source="ONU", full_name="Kabore Amadou", aliases=[]))
    db_session.commit()

    guichet_headers = auth_headers(client, "agent1")
    banfora_headers = auth_headers(client, "agent_banfora")
    fid = _client_with_two_sfd_accounts(
        client, guichet_headers, banfora_headers, seeded_sfd, seeded_sfd_banfora
    )

    # L'agent de guichet cote Ouaga reste local meme avec une alerte vivante -
    # seuls conformite/superviseur obtiennent le deblocage (matrice de visibilite).
    response = client.get(f"/clients/{fid}/solde-global", headers=guichet_headers)
    assert response.status_code == 200
    assert response.json()["vue"] == "LOCALE"


def test_reseau_role_search_masks_name_without_live_alert(
    client, agent_guichet, conformite_reseau, seeded_sfd
):
    guichet_headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients", json={"nom": "Ouedraogo", "prenom": "Salifou"}, headers=guichet_headers
    ).json()

    reseau_headers = auth_headers(client, "conformite_reseau1")
    response = client.get(
        "/clients/search", params={"q": created["fid"]}, headers=reseau_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["nom_masque"] is True
    assert body[0]["nom"] != "Ouedraogo"


def test_reseau_role_search_reveals_name_with_live_alert(
    client, agent_guichet, conformite_reseau, db_session, seeded_sfd
):
    db_session.add(SanctionEntry(source="ONU", full_name="Salifou Ouedraogo", aliases=[]))
    db_session.commit()

    guichet_headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients", json={"nom": "Ouedraogo", "prenom": "Salifou"}, headers=guichet_headers
    ).json()

    reseau_headers = auth_headers(client, "conformite_reseau1")
    response = client.get(
        "/clients/search", params={"q": "Ouedraogo"}, headers=reseau_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["nom_masque"] is False
    assert body[0]["nom"] == "Ouedraogo"


def test_auditeur_can_search_by_fid_masked(client, agent_guichet, auditeur, seeded_sfd):
    guichet_headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients", json={"nom": "Sawadogo", "prenom": "Boureima"}, headers=guichet_headers
    ).json()

    auditeur_headers = auth_headers(client, "auditeur1")
    response = client.get(
        "/clients/search", params={"q": created["fid"]}, headers=auditeur_headers
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_admin_reseau_cannot_browse_clients(client, admin_reseau, seeded_sfd):
    headers = auth_headers(client, "admin1")
    response = client.get("/clients/search", params={"q": "a"}, headers=headers)
    assert response.status_code == 403


def test_get_client_fiche_visible_locally(client, agent_guichet, seeded_sfd):
    headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients", json={"nom": "Sawadogo", "prenom": "Boureima"}, headers=headers
    ).json()

    response = client.get(f"/clients/{created['fid']}", headers=headers)
    assert response.status_code == 200
    assert response.json()["nom"] == "Sawadogo"


def test_get_client_fiche_blocked_for_other_sfd(
    client, agent_guichet, agent_guichet_banfora, seeded_sfd
):
    guichet_headers = auth_headers(client, "agent1")
    banfora_headers = auth_headers(client, "agent_banfora")
    created = client.post(
        "/clients", json={"nom": "Sawadogo", "prenom": "Boureima"}, headers=guichet_headers
    ).json()

    response = client.get(f"/clients/{created['fid']}", headers=banfora_headers)
    assert response.status_code == 403


def test_get_client_fiche_masked_for_reseau_role_without_alert(
    client, agent_guichet, conformite_reseau, seeded_sfd
):
    guichet_headers = auth_headers(client, "agent1")
    created = client.post(
        "/clients", json={"nom": "Sawadogo", "prenom": "Boureima"}, headers=guichet_headers
    ).json()

    reseau_headers = auth_headers(client, "conformite_reseau1")
    response = client.get(f"/clients/{created['fid']}", headers=reseau_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["nom_masque"] is True
    assert body["nom"] != "Sawadogo"


def test_alerts_list_scoped_to_local_sfd(
    client, agent_guichet, agent_conformite, conformite_reseau, db_session, seeded_sfd,
    seeded_sfd_banfora,
):
    """Une alerte declenchee sur un client d'Ouaga ne doit pas apparaitre dans la
    file de l'agent conformite de Banfora - meme principe de visibilite que la
    fiche client (cf. corpus : le jury a explicitement souleve ce point)."""
    from app.models.user import StaffUser
    from app.services.security import Role, hash_password

    db_session.add(
        StaffUser(
            username="conformite_banfora",
            password_hash=hash_password("motdepasse-test"),
            role=Role.AGENT_CONFORMITE,
            sfd_id=seeded_sfd_banfora.id,
        )
    )
    db_session.add(SanctionEntry(source="ONU", full_name="Viktor Bout", aliases=[]))
    db_session.commit()

    guichet_headers = auth_headers(client, "agent1")
    client.post("/clients", json={"nom": "Bout", "prenom": "Viktor"}, headers=guichet_headers)

    conformite_ouaga_headers = auth_headers(client, "conformite1")
    ouaga_alerts = client.get("/alerts", headers=conformite_ouaga_headers).json()
    assert len(ouaga_alerts) == 1

    conformite_banfora_headers = auth_headers(client, "conformite_banfora")
    banfora_alerts = client.get("/alerts", headers=conformite_banfora_headers).json()
    assert banfora_alerts == []

    reseau_headers = auth_headers(client, "conformite_reseau1")
    reseau_alerts = client.get("/alerts", headers=reseau_headers).json()
    assert len(reseau_alerts) == 1

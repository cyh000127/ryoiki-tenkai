from fastapi.testclient import TestClient
from gesture_api.main import create_app


def create_configured_guest(client: TestClient, nickname: str) -> str:
    guest_response = client.post("/api/v1/players/guest", json={"nickname": nickname})
    assert guest_response.status_code == 201
    player_id = guest_response.json()["data"]["playerId"]

    loadout_response = client.post(
        "/api/v1/players/me/loadout",
        headers={"X-Player-Id": player_id},
        json={
            "skillsetId": "skillset_seal_basic",
            "animsetId": "animset_basic_2d",
        },
    )
    assert loadout_response.status_code == 200
    assert loadout_response.json()["data"]["loadoutConfigured"] is True
    return player_id


def test_profile_lookup_and_queue_require_saved_loadout() -> None:
    client = TestClient(create_app())

    guest_response = client.post("/api/v1/players/guest", json={"nickname": "new-player"})
    assert guest_response.status_code == 201
    player_id = guest_response.json()["data"]["playerId"]

    profile_response = client.get("/api/v1/players/me", headers={"X-Player-Id": player_id})
    assert profile_response.status_code == 200
    assert profile_response.json()["data"]["loadoutConfigured"] is False

    queue_response = client.post(
        "/api/v1/matchmaking/queue",
        headers={"X-Player-Id": player_id},
        json={"mode": "RANKED_1V1"},
    )
    assert queue_response.status_code == 400
    assert queue_response.json()["error"]["code"] == "LOADOUT_REQUIRED"


def test_animset_catalog_and_loadout_validation_are_stable() -> None:
    client = TestClient(create_app())
    guest_response = client.post("/api/v1/players/guest", json={"nickname": "catalog-player"})
    player_id = guest_response.json()["data"]["playerId"]

    animsets_response = client.get("/api/v1/animsets")
    assert animsets_response.status_code == 200
    assert [item["animsetId"] for item in animsets_response.json()["data"]] == [
        "animset_basic_2d",
        "animset_impact_2d",
    ]

    invalid_response = client.post(
        "/api/v1/players/me/loadout",
        headers={"X-Player-Id": player_id},
        json={
            "skillsetId": "skillset_missing",
            "animsetId": "animset_basic_2d",
        },
    )
    assert invalid_response.status_code == 400
    assert invalid_response.json()["error"]["code"] == "INVALID_LOADOUT"

    valid_response = client.post(
        "/api/v1/players/me/loadout",
        headers={"X-Player-Id": player_id},
        json={
            "skillsetId": "skillset_seal_basic",
            "animsetId": "animset_impact_2d",
        },
    )
    assert valid_response.status_code == 200
    assert valid_response.json()["data"]["equippedAnimsetId"] == "animset_impact_2d"
    assert valid_response.json()["data"]["loadoutConfigured"] is True

    profile_response = client.get("/api/v1/players/me", headers={"X-Player-Id": player_id})
    assert profile_response.status_code == 200
    assert profile_response.json()["data"]["equippedAnimsetId"] == "animset_impact_2d"
    assert profile_response.json()["data"]["loadoutConfigured"] is True


def test_guest_player_can_match_and_submit_turn_action() -> None:
    client = TestClient(create_app())

    player_id = create_configured_guest(client, "player-one")

    skillsets_response = client.get("/api/v1/skillsets")
    assert skillsets_response.status_code == 200
    skill = skillsets_response.json()["data"][0]["skills"][0]

    queue_response = client.post(
        "/api/v1/matchmaking/queue",
        headers={"X-Player-Id": player_id},
        json={"mode": "RANKED_1V1"},
    )
    assert queue_response.status_code == 200
    battle_session_id = queue_response.json()["data"]["battleSessionId"]

    battle_response = client.get(
        f"/api/v1/battles/{battle_session_id}",
        headers={"X-Player-Id": player_id},
    )
    assert battle_response.status_code == 200
    battle = battle_response.json()["data"]

    action_response = client.post(
        f"/api/v1/battles/{battle_session_id}/actions",
        json={
            "playerId": player_id,
            "turnNumber": battle["turnNumber"],
            "actionId": "act-1",
            "gestureSequence": skill["gestureSequence"],
            "submittedAt": "2026-04-27T00:00:00Z",
        },
    )

    assert action_response.status_code == 202
    assert action_response.json()["data"]["status"] == "ACCEPTED"
    assert action_response.json()["data"]["battle"]["opponent"]["hp"] == 75


def test_rejects_duplicate_action_id() -> None:
    client = TestClient(create_app())

    player_id = create_configured_guest(client, "player-two")
    battle_session_id = client.post(
        "/api/v1/matchmaking/queue",
        headers={"X-Player-Id": player_id},
        json={"mode": "RANKED_1V1"},
    ).json()["data"]["battleSessionId"]

    payload = {
        "playerId": player_id,
        "turnNumber": 1,
        "actionId": "act-duplicate",
        "gestureSequence": ["seal_1", "seal_3"],
        "submittedAt": "2026-04-27T00:00:00Z",
    }
    first_response = client.post(f"/api/v1/battles/{battle_session_id}/actions", json=payload)
    assert first_response.status_code == 202
    duplicate_response = client.post(f"/api/v1/battles/{battle_session_id}/actions", json=payload)

    assert duplicate_response.status_code == 202
    assert duplicate_response.json()["data"]["status"] == "REJECTED"
    assert duplicate_response.json()["data"]["reason"] == "DUPLICATE_ACTION"

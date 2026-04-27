from fastapi.testclient import TestClient
from gesture_api.main import create_app


def test_guest_player_can_match_and_submit_turn_action() -> None:
    client = TestClient(create_app())

    guest_response = client.post("/api/v1/players/guest", json={"nickname": "player-one"})
    assert guest_response.status_code == 201
    player_id = guest_response.json()["data"]["playerId"]

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

    guest_response = client.post("/api/v1/players/guest", json={"nickname": "player-two"})
    player_id = guest_response.json()["data"]["playerId"]
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

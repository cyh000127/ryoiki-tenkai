from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from gesture_api.main import create_app
from gesture_api.repositories.game_state import game_state_repository


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


def create_started_battle(client: TestClient, player_id: str) -> str:
    ws_token = client.get("/api/v1/ws-token", headers={"X-Player-Id": player_id}).json()["data"][
        "wsToken"
    ]

    with client.websocket_connect(f"/ws?token={ws_token}") as websocket:
        queue_response = client.post(
            "/api/v1/matchmaking/queue",
            headers={"X-Player-Id": player_id},
            json={"mode": "RANKED_1V1"},
        )
        assert queue_response.status_code == 200
        assert queue_response.json()["data"]["queueStatus"] == "MATCHED"

        ready_event = websocket.receive_json()
        found_event = websocket.receive_json()
        started_event = websocket.receive_json()

    assert ready_event["type"] == "battle.match_ready"
    assert found_event["type"] == "battle.match_found"
    assert started_event["type"] == "battle.started"
    return str(started_event["payload"]["battleSessionId"])


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


def test_queue_status_and_cancel_are_idempotent() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "queue-player")

    first_queue_response = client.post(
        "/api/v1/matchmaking/queue",
        headers={"X-Player-Id": player_id},
        json={"mode": "RANKED_1V1"},
    )
    assert first_queue_response.status_code == 200
    assert first_queue_response.json()["data"]["queueStatus"] == "SEARCHING"
    queued_at = first_queue_response.json()["data"]["queuedAt"]

    repeated_queue_response = client.post(
        "/api/v1/matchmaking/queue",
        headers={"X-Player-Id": player_id},
        json={"mode": "RANKED_1V1"},
    )
    assert repeated_queue_response.status_code == 200
    assert repeated_queue_response.json()["data"]["queueStatus"] == "SEARCHING"
    assert repeated_queue_response.json()["data"]["queuedAt"] == queued_at

    status_response = client.get("/api/v1/matchmaking/status", headers={"X-Player-Id": player_id})
    assert status_response.status_code == 200
    assert status_response.json()["data"]["queueStatus"] == "SEARCHING"
    assert status_response.json()["data"]["queuedAt"] == queued_at

    cancel_response = client.delete("/api/v1/matchmaking/queue", headers={"X-Player-Id": player_id})
    assert cancel_response.status_code == 200
    assert cancel_response.json()["data"]["queueStatus"] == "IDLE"

    repeated_cancel_response = client.delete(
        "/api/v1/matchmaking/queue",
        headers={"X-Player-Id": player_id},
    )
    assert repeated_cancel_response.status_code == 200
    assert repeated_cancel_response.json()["data"]["queueStatus"] == "IDLE"


def test_guest_player_can_match_and_submit_turn_action() -> None:
    client = TestClient(create_app())

    player_id = create_configured_guest(client, "player-one")

    skillsets_response = client.get("/api/v1/skillsets")
    assert skillsets_response.status_code == 200
    skill = skillsets_response.json()["data"][0]["skills"][0]

    battle_session_id = create_started_battle(client, player_id)

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
    assert action_response.json()["data"]["battle"]["self"]["hp"] == 75
    assert action_response.json()["data"]["battle"]["turnNumber"] == 3
    assert action_response.json()["data"]["battle"]["turnOwnerPlayerId"] == player_id


def test_rejects_duplicate_action_id() -> None:
    client = TestClient(create_app())

    player_id = create_configured_guest(client, "player-two")
    battle_session_id = create_started_battle(client, player_id)

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


def test_submit_action_after_deadline_returns_turn_timeout() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "player-timeout")
    battle_session_id = create_started_battle(client, player_id)

    battle = game_state_repository.get_battle(battle_session_id)
    assert battle is not None
    battle.action_deadline_at = datetime.now(UTC) - timedelta(seconds=1)

    response = client.post(
        f"/api/v1/battles/{battle_session_id}/actions",
        json={
            "playerId": player_id,
            "turnNumber": 1,
            "actionId": "act-timeout",
            "gestureSequence": ["seal_1", "seal_3"],
            "submittedAt": "2026-04-27T00:00:00Z",
        },
    )

    assert response.status_code == 202
    assert response.json()["data"]["status"] == "REJECTED"
    assert response.json()["data"]["reason"] == "TURN_TIMEOUT"
    assert response.json()["data"]["battle"]["status"] == "ENDED"
    assert response.json()["data"]["battle"]["endedReason"] == "TIMEOUT"


def test_surrender_ends_battle_and_emits_ended_event() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "player-surrender")
    ws_token = client.get("/api/v1/ws-token", headers={"X-Player-Id": player_id}).json()["data"][
        "wsToken"
    ]

    with client.websocket_connect(f"/ws?token={ws_token}") as websocket:
        queue_response = client.post(
            "/api/v1/matchmaking/queue",
            headers={"X-Player-Id": player_id},
            json={"mode": "RANKED_1V1"},
        )
        assert queue_response.status_code == 200

        websocket.receive_json()
        websocket.receive_json()
        started_event = websocket.receive_json()
        battle_session_id = started_event["payload"]["battleSessionId"]

        surrender_response = client.post(
            f"/api/v1/battles/{battle_session_id}/surrender",
            headers={"X-Player-Id": player_id},
        )
        surrendered_event = websocket.receive_json()
        ended_event = websocket.receive_json()

    assert surrender_response.status_code == 200
    assert surrender_response.json()["data"]["status"] == "ENDED"
    assert surrender_response.json()["data"]["result"] == "LOSE"
    assert surrendered_event["type"] == "battle.surrendered"
    assert surrendered_event["payload"]["surrenderedPlayerId"] == player_id
    assert ended_event["type"] == "battle.ended"
    assert ended_event["payload"]["loserPlayerId"] == player_id
    assert ended_event["payload"]["endedReason"] == "SURRENDER"
    assert ended_event["payload"]["battle"]["status"] == "ENDED"


def test_history_and_leaderboard_reflect_completed_battle_rating_updates() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "player-history")
    battle_session_id = create_started_battle(client, player_id)

    surrender_response = client.post(
        f"/api/v1/battles/{battle_session_id}/surrender",
        headers={"X-Player-Id": player_id},
    )
    assert surrender_response.status_code == 200

    profile_response = client.get("/api/v1/players/me", headers={"X-Player-Id": player_id})
    assert profile_response.status_code == 200
    profile = profile_response.json()["data"]
    assert profile["losses"] >= 1
    assert profile["rating"] < 1000

    history_response = client.get("/api/v1/matches/history", headers={"X-Player-Id": player_id})
    assert history_response.status_code == 200
    history_rows = history_response.json()["data"]
    assert history_rows
    latest_row = history_rows[0]
    assert latest_row["battleSessionId"] == battle_session_id
    assert latest_row["result"] == "LOSE"
    assert latest_row["endedReason"] == "SURRENDER"
    assert latest_row["ratingAfter"] == profile["rating"]
    assert latest_row["ratingChange"] < 0

    leaderboard_response = client.get("/api/v1/ratings/leaderboard")
    assert leaderboard_response.status_code == 200
    leaderboard_rows = leaderboard_response.json()["data"]
    ratings = [row["rating"] for row in leaderboard_rows]
    assert ratings == sorted(ratings, reverse=True)
    player_row = next(row for row in leaderboard_rows if row["playerId"] == player_id)
    assert player_row["rating"] == profile["rating"]

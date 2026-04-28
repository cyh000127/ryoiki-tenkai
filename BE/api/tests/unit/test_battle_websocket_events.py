from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from gesture_api.api.schemas.websocket import (
    BattleActionResultEvent,
    BattlePongEvent,
    BattleSubmitActionEvent,
    BattleSubmitActionPayload,
    deserialize_battle_event,
    serialize_battle_event,
)
from gesture_api.domain.catalog import SKILLSETS
from gesture_api.main import create_app
from gesture_api.repositories.game_state import InMemoryGameStateRepository, game_state_repository
from gesture_api.services.battle_websocket import BattleWebSocketEventHandler
from starlette.websockets import WebSocketDisconnect

DEFAULT_SKILL = SKILLSETS[0].skills[0]


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
    return player_id


def get_ws_token(client: TestClient, player_id: str) -> str:
    return str(
        client.get("/api/v1/ws-token", headers={"X-Player-Id": player_id}).json()["data"][
            "wsToken"
        ]
    )


def create_practice_battle(client: TestClient, player_id: str) -> str:
    queue_response = client.post(
        "/api/v1/matchmaking/queue",
        headers={"X-Player-Id": player_id},
        json={"mode": "RANKED_1V1"},
    )
    assert queue_response.status_code == 200
    assert queue_response.json()["data"]["queueStatus"] == "SEARCHING"
    battle = game_state_repository.create_match_for_player(player_id)
    assert battle is not None
    assert battle.player_ids[1] == "pl_practice"
    return battle.battle_session_id


def test_battle_event_serializer_uses_wire_aliases() -> None:
    event = deserialize_battle_event(
        {
            "type": "battle.submit_action",
            "requestId": "req-action",
            "payload": {
                "battleSessionId": "battle-1",
                "playerId": "player-1",
                "turnNumber": 1,
                "actionId": "act-1",
                "gestureSequence": DEFAULT_SKILL.gesture_sequence,
                "submittedAt": "2026-04-27T00:00:00Z",
            },
        }
    )

    assert isinstance(event, BattleSubmitActionEvent)
    assert event.request_id == "req-action"
    assert event.payload.battle_session_id == "battle-1"
    assert serialize_battle_event(BattlePongEvent(request_id="req-ping")) == {
        "type": "battle.pong",
        "requestId": "req-ping",
        "payload": {"ok": True},
    }


def test_battle_websocket_handler_submits_action_with_in_memory_engine() -> None:
    repository = InMemoryGameStateRepository()
    player = repository.create_guest_player("ws-player")
    player.loadout_configured = True
    queue_state = repository.enter_queue(player.player_id)
    assert queue_state is not None
    battle = repository.create_match_for_player(player.player_id)
    assert battle is not None
    assert battle.player_ids == (player.player_id, "pl_practice")
    handler = BattleWebSocketEventHandler(repository)
    event = BattleSubmitActionEvent(
        type="battle.submit_action",
        request_id="req-action",
        payload=BattleSubmitActionPayload(
            battle_session_id=battle.battle_session_id,
            player_id=player.player_id,
            turn_number=1,
            action_id="act-ws-1",
            gesture_sequence=DEFAULT_SKILL.gesture_sequence,
            submitted_at=datetime(2026, 4, 27, tzinfo=UTC),
        ),
    )

    response = handler.handle(event)

    assert isinstance(response, BattleActionResultEvent)
    assert response.request_id == "req-action"
    assert response.payload.status == "ACCEPTED"
    assert response.payload.battle is not None
    assert response.payload.battle.opponent.hp == 100 - DEFAULT_SKILL.damage
    assert response.payload.battle.self.hp == 100 - DEFAULT_SKILL.damage
    assert response.payload.battle.turn_number == 3
    assert response.payload.battle.turn_owner_player_id == player.player_id
    assert len(response.payload.battle.battle_log) == 2

    duplicate_response = handler.handle(event)

    assert isinstance(duplicate_response, BattleActionResultEvent)
    assert duplicate_response.payload.status == "REJECTED"
    assert duplicate_response.payload.reason == "DUPLICATE_ACTION"


def test_ws_endpoint_replays_practice_battle_and_handles_submit_action() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "ws-client")
    skill = client.get("/api/v1/skillsets").json()["data"][0]["skills"][0]
    battle_session_id = create_practice_battle(client, player_id)
    ws_token = get_ws_token(client, player_id)

    with client.websocket_connect(f"/ws?token={ws_token}") as websocket:
        found_event = websocket.receive_json()
        started_event = websocket.receive_json()

        assert found_event["type"] == "battle.match_found"
        assert started_event["type"] == "battle.started"
        assert started_event["payload"]["battleSessionId"] == battle_session_id

        websocket.send_json({"type": "battle.ping", "requestId": "req-ping"})
        assert websocket.receive_json() == {
            "type": "battle.pong",
            "requestId": "req-ping",
            "payload": {"ok": True},
        }

        websocket.send_json(
            {
                "type": "battle.submit_action",
                "requestId": "req-action",
                "payload": {
                    "battleSessionId": battle_session_id,
                    "playerId": player_id,
                    "turnNumber": 1,
                    "actionId": "act-ws-endpoint",
                    "gestureSequence": skill["gestureSequence"],
                    "submittedAt": "2026-04-27T00:00:00Z",
                },
            }
        )
        response = websocket.receive_json()
        state_updated_event = websocket.receive_json()

    assert response["type"] == "battle.action_result"
    assert response["requestId"] == "req-action"
    assert response["payload"]["status"] == "ACCEPTED"
    assert response["payload"]["battle"]["opponent"]["hp"] == 100 - skill["damage"]
    assert response["payload"]["battle"]["self"]["hp"] == 100 - skill["damage"]
    assert response["payload"]["battle"]["turnNumber"] == 3
    assert state_updated_event["type"] == "battle.state_updated"
    assert state_updated_event["payload"]["sourceActionId"] == "act-ws-endpoint"
    assert state_updated_event["payload"]["battle"]["turnOwnerPlayerId"] == player_id
    assert state_updated_event["payload"]["battle"]["self"]["hp"] == 100 - skill["damage"]
    assert state_updated_event["payload"]["battle"]["opponent"]["hp"] == 100 - skill["damage"]


def test_ws_endpoint_pairs_two_connected_players_without_practice_rival() -> None:
    client = TestClient(create_app())
    first_player_id = create_configured_guest(client, "player-one")
    second_player_id = create_configured_guest(client, "player-two")
    first_ws_token = get_ws_token(client, first_player_id)
    second_ws_token = get_ws_token(client, second_player_id)

    with client.websocket_connect(f"/ws?token={first_ws_token}") as first_socket:
        first_queue_response = client.post(
            "/api/v1/matchmaking/queue",
            headers={"X-Player-Id": first_player_id},
            json={"mode": "RANKED_1V1"},
        )
        assert first_queue_response.status_code == 200
        assert first_queue_response.json()["data"]["queueStatus"] == "SEARCHING"
        first_ready_event = first_socket.receive_json()
        assert first_ready_event["type"] == "battle.match_ready"

        repeated_queue_response = client.post(
            "/api/v1/matchmaking/queue",
            headers={"X-Player-Id": first_player_id},
            json={"mode": "RANKED_1V1"},
        )
        assert repeated_queue_response.status_code == 200
        assert repeated_queue_response.json()["data"]["queueStatus"] == "SEARCHING"
        assert (
            repeated_queue_response.json()["data"]["queuedAt"]
            == first_queue_response.json()["data"]["queuedAt"]
        )

        with client.websocket_connect(f"/ws?token={second_ws_token}") as second_socket:
            second_queue_response = client.post(
                "/api/v1/matchmaking/queue",
                headers={"X-Player-Id": second_player_id},
                json={"mode": "RANKED_1V1"},
            )
            assert second_queue_response.status_code == 200
            second_queue_data = second_queue_response.json()["data"]
            assert second_queue_data["queueStatus"] == "MATCHED"
            battle_session_id = second_queue_data["battleSessionId"]

            second_ready_event = second_socket.receive_json()
            first_found_event = first_socket.receive_json()
            first_started_event = first_socket.receive_json()
            second_found_event = second_socket.receive_json()
            second_started_event = second_socket.receive_json()

    assert second_ready_event["type"] == "battle.match_ready"
    assert first_found_event["type"] == "battle.match_found"
    assert second_found_event["type"] == "battle.match_found"
    assert first_found_event["payload"]["battleSessionId"] == battle_session_id
    assert second_found_event["payload"]["battleSessionId"] == battle_session_id
    assert first_found_event["payload"]["playerSeat"] == "PLAYER_ONE"
    assert second_found_event["payload"]["playerSeat"] == "PLAYER_TWO"
    assert first_started_event["type"] == "battle.started"
    assert second_started_event["type"] == "battle.started"
    assert first_started_event["payload"]["battleSessionId"] == battle_session_id
    assert second_started_event["payload"]["battleSessionId"] == battle_session_id
    assert first_started_event["payload"]["battle"]["self"]["playerId"] == first_player_id
    assert first_started_event["payload"]["battle"]["opponent"]["playerId"] == second_player_id
    assert second_started_event["payload"]["battle"]["self"]["playerId"] == second_player_id
    assert second_started_event["payload"]["battle"]["opponent"]["playerId"] == first_player_id
    assert first_started_event["payload"]["battle"]["turnOwnerPlayerId"] == first_player_id

    first_status_response = client.get(
        "/api/v1/matchmaking/status",
        headers={"X-Player-Id": first_player_id},
    )
    assert first_status_response.status_code == 200
    assert first_status_response.json()["data"]["queueStatus"] == "MATCHED"
    assert first_status_response.json()["data"]["battleSessionId"] == battle_session_id


def test_ws_endpoint_replays_latest_two_player_battle_snapshot_on_reconnect() -> None:
    client = TestClient(create_app())
    first_player_id = create_configured_guest(client, "replay-player-one")
    second_player_id = create_configured_guest(client, "replay-player-two")
    first_ws_token = get_ws_token(client, first_player_id)
    second_ws_token = get_ws_token(client, second_player_id)
    skill = client.get("/api/v1/skillsets").json()["data"][0]["skills"][0]

    with client.websocket_connect(f"/ws?token={first_ws_token}") as first_socket:
        first_queue_response = client.post(
            "/api/v1/matchmaking/queue",
            headers={"X-Player-Id": first_player_id},
            json={"mode": "RANKED_1V1"},
        )
        assert first_queue_response.status_code == 200
        assert first_socket.receive_json()["type"] == "battle.match_ready"

        with client.websocket_connect(f"/ws?token={second_ws_token}") as second_socket:
            second_queue_response = client.post(
                "/api/v1/matchmaking/queue",
                headers={"X-Player-Id": second_player_id},
                json={"mode": "RANKED_1V1"},
            )
            assert second_queue_response.status_code == 200
            battle_session_id = second_queue_response.json()["data"]["battleSessionId"]

            assert second_socket.receive_json()["type"] == "battle.match_ready"
            assert first_socket.receive_json()["type"] == "battle.match_found"
            assert first_socket.receive_json()["type"] == "battle.started"
            assert second_socket.receive_json()["type"] == "battle.match_found"
            assert second_socket.receive_json()["type"] == "battle.started"

            first_socket.send_json(
                {
                    "type": "battle.submit_action",
                    "requestId": "req-two-player-reconnect",
                    "payload": {
                        "battleSessionId": battle_session_id,
                        "playerId": first_player_id,
                        "turnNumber": 1,
                        "actionId": "act-two-player-reconnect",
                        "gestureSequence": skill["gestureSequence"],
                        "submittedAt": "2026-04-27T00:00:00Z",
                    },
                }
            )
            action_result = first_socket.receive_json()
            first_update = first_socket.receive_json()
            second_update = second_socket.receive_json()

    assert action_result["type"] == "battle.action_result"
    assert first_update["type"] == "battle.state_updated"
    assert second_update["type"] == "battle.state_updated"

    with client.websocket_connect(f"/ws?token={first_ws_token}") as replay_socket:
        replayed_found_event = replay_socket.receive_json()
        replayed_started_event = replay_socket.receive_json()

    replayed_battle = replayed_started_event["payload"]["battle"]
    assert replayed_found_event["type"] == "battle.match_found"
    assert replayed_started_event["type"] == "battle.started"
    assert replayed_started_event["payload"]["battleSessionId"] == battle_session_id
    assert replayed_battle["turnNumber"] == 2
    assert replayed_battle["turnOwnerPlayerId"] == second_player_id
    assert replayed_battle["self"]["playerId"] == first_player_id
    assert replayed_battle["self"]["hp"] == 100
    assert replayed_battle["self"]["mana"] == 100 - DEFAULT_SKILL.mana_cost
    assert replayed_battle["self"]["cooldowns"][DEFAULT_SKILL.skill_id] == DEFAULT_SKILL.cooldown_turn
    assert replayed_battle["opponent"]["playerId"] == second_player_id
    assert replayed_battle["opponent"]["hp"] == 100 - DEFAULT_SKILL.damage
    assert replayed_battle["opponent"]["mana"] == 100
    assert replayed_battle["battleLog"][0]["turnNumber"] == 1


def test_get_battle_resolves_timeout_and_fans_out_to_connected_opponent() -> None:
    client = TestClient(create_app())
    first_player_id = create_configured_guest(client, "timeout-owner")
    second_player_id = create_configured_guest(client, "timeout-opponent")
    first_ws_token = get_ws_token(client, first_player_id)
    second_ws_token = get_ws_token(client, second_player_id)

    with client.websocket_connect(f"/ws?token={first_ws_token}") as first_socket:
        first_queue_response = client.post(
            "/api/v1/matchmaking/queue",
            headers={"X-Player-Id": first_player_id},
            json={"mode": "RANKED_1V1"},
        )
        assert first_queue_response.status_code == 200
        assert first_socket.receive_json()["type"] == "battle.match_ready"

        with client.websocket_connect(f"/ws?token={second_ws_token}") as second_socket:
            second_queue_response = client.post(
                "/api/v1/matchmaking/queue",
                headers={"X-Player-Id": second_player_id},
                json={"mode": "RANKED_1V1"},
            )
            assert second_queue_response.status_code == 200
            battle_session_id = second_queue_response.json()["data"]["battleSessionId"]

            assert second_socket.receive_json()["type"] == "battle.match_ready"
            assert first_socket.receive_json()["type"] == "battle.match_found"
            assert first_socket.receive_json()["type"] == "battle.started"
            assert second_socket.receive_json()["type"] == "battle.match_found"
            assert second_socket.receive_json()["type"] == "battle.started"

            first_socket.close()
            battle = game_state_repository.get_battle(battle_session_id)
            assert battle is not None
            battle.action_deadline_at = datetime.now(UTC) - timedelta(seconds=1)

            lookup_response = client.get(
                f"/api/v1/battles/{battle_session_id}",
                headers={"X-Player-Id": first_player_id},
            )
            timeout_event = second_socket.receive_json()
            ended_event = second_socket.receive_json()

    assert lookup_response.status_code == 200
    lookup_battle = lookup_response.json()["data"]
    assert lookup_battle["status"] == "ENDED"
    assert lookup_battle["endedReason"] == "TIMEOUT"
    assert lookup_battle["loserPlayerId"] == first_player_id

    assert timeout_event["type"] == "battle.timeout"
    assert timeout_event["payload"]["battleSessionId"] == battle_session_id
    assert timeout_event["payload"]["timedOutPlayerId"] == first_player_id
    assert timeout_event["payload"]["battle"]["self"]["playerId"] == second_player_id
    assert timeout_event["payload"]["battle"]["endedReason"] == "TIMEOUT"
    assert ended_event["type"] == "battle.ended"
    assert ended_event["payload"]["winnerPlayerId"] == second_player_id
    assert ended_event["payload"]["loserPlayerId"] == first_player_id
    assert ended_event["payload"]["endedReason"] == "TIMEOUT"
    assert ended_event["payload"]["ratingChange"] is not None
    assert ended_event["payload"]["ratingChange"] > 0

    with client.websocket_connect(f"/ws?token={first_ws_token}") as replay_socket:
        replayed_ended_event = replay_socket.receive_json()

    assert replayed_ended_event["type"] == "battle.ended"
    assert replayed_ended_event["payload"]["winnerPlayerId"] == second_player_id
    assert replayed_ended_event["payload"]["loserPlayerId"] == first_player_id
    assert replayed_ended_event["payload"]["endedReason"] == "TIMEOUT"
    assert replayed_ended_event["payload"]["ratingChange"] is not None
    assert replayed_ended_event["payload"]["ratingChange"] < 0


def test_surrender_fanout_replays_ended_state_to_disconnected_opponent() -> None:
    client = TestClient(create_app())
    first_player_id = create_configured_guest(client, "surrender-owner")
    second_player_id = create_configured_guest(client, "surrender-opponent")
    first_ws_token = get_ws_token(client, first_player_id)
    second_ws_token = get_ws_token(client, second_player_id)

    with client.websocket_connect(f"/ws?token={first_ws_token}") as first_socket:
        first_queue_response = client.post(
            "/api/v1/matchmaking/queue",
            headers={"X-Player-Id": first_player_id},
            json={"mode": "RANKED_1V1"},
        )
        assert first_queue_response.status_code == 200
        assert first_socket.receive_json()["type"] == "battle.match_ready"

        second_queue_response = client.post(
            "/api/v1/matchmaking/queue",
            headers={"X-Player-Id": second_player_id},
            json={"mode": "RANKED_1V1"},
        )
        assert second_queue_response.status_code == 200
        battle_session_id = second_queue_response.json()["data"]["battleSessionId"]

        found_event = first_socket.receive_json()
        started_event = first_socket.receive_json()
        assert found_event["type"] == "battle.match_found"
        assert started_event["type"] == "battle.started"

        surrender_response = client.post(
            f"/api/v1/battles/{battle_session_id}/surrender",
            headers={"X-Player-Id": first_player_id},
        )
        surrendered_event = first_socket.receive_json()
        ended_event = first_socket.receive_json()

    assert surrender_response.status_code == 200
    assert surrender_response.json()["data"]["status"] == "ENDED"
    assert surrender_response.json()["data"]["result"] == "LOSE"
    assert surrendered_event["type"] == "battle.surrendered"
    assert surrendered_event["payload"]["surrenderedPlayerId"] == first_player_id
    assert ended_event["type"] == "battle.ended"
    assert ended_event["payload"]["winnerPlayerId"] == second_player_id
    assert ended_event["payload"]["loserPlayerId"] == first_player_id
    assert ended_event["payload"]["endedReason"] == "SURRENDER"
    assert ended_event["payload"]["ratingChange"] is not None
    assert ended_event["payload"]["ratingChange"] < 0

    with client.websocket_connect(f"/ws?token={second_ws_token}") as replay_socket:
        replayed_ended_event = replay_socket.receive_json()

    assert replayed_ended_event["type"] == "battle.ended"
    assert replayed_ended_event["payload"]["winnerPlayerId"] == second_player_id
    assert replayed_ended_event["payload"]["loserPlayerId"] == first_player_id
    assert replayed_ended_event["payload"]["endedReason"] == "SURRENDER"
    assert replayed_ended_event["payload"]["ratingChange"] is not None
    assert replayed_ended_event["payload"]["ratingChange"] > 0


def test_ws_endpoint_replays_latest_active_battle_snapshot_on_reconnect() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "ws-reconnect")
    skill = client.get("/api/v1/skillsets").json()["data"][0]["skills"][0]
    battle_session_id = create_practice_battle(client, player_id)
    ws_token = get_ws_token(client, player_id)

    with client.websocket_connect(f"/ws?token={ws_token}") as websocket:
        websocket.receive_json()
        started_event = websocket.receive_json()
        assert started_event["payload"]["battleSessionId"] == battle_session_id

        websocket.send_json(
            {
                "type": "battle.submit_action",
                "requestId": "req-reconnect-action",
                "payload": {
                    "battleSessionId": battle_session_id,
                    "playerId": player_id,
                    "turnNumber": 1,
                    "actionId": "act-reconnect",
                    "gestureSequence": skill["gestureSequence"],
                    "submittedAt": "2026-04-27T00:00:00Z",
                },
            }
        )
        websocket.receive_json()
        websocket.receive_json()

    with client.websocket_connect(f"/ws?token={ws_token}") as replay_socket:
        replayed_found_event = replay_socket.receive_json()
        replayed_started_event = replay_socket.receive_json()

    assert replayed_found_event["type"] == "battle.match_found"
    assert replayed_started_event["type"] == "battle.started"
    assert replayed_started_event["payload"]["battle"]["turnNumber"] == 3
    assert replayed_started_event["payload"]["battle"]["turnOwnerPlayerId"] == player_id
    assert replayed_started_event["payload"]["battle"]["self"]["hp"] == 100 - skill["damage"]
    assert replayed_started_event["payload"]["battle"]["opponent"]["hp"] == 100 - skill["damage"]


def test_ws_endpoint_resolves_due_timeout_before_reconnect_replay() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "ws-timeout-reconnect")
    battle_session_id = create_practice_battle(client, player_id)
    ws_token = get_ws_token(client, player_id)

    with client.websocket_connect(f"/ws?token={ws_token}") as websocket:
        assert websocket.receive_json()["type"] == "battle.match_found"
        started_event = websocket.receive_json()
        assert started_event["payload"]["battleSessionId"] == battle_session_id

    battle = game_state_repository.get_battle(battle_session_id)
    assert battle is not None
    battle.action_deadline_at = datetime.now(UTC) - timedelta(seconds=1)

    with client.websocket_connect(f"/ws?token={ws_token}") as replay_socket:
        replayed_timeout_event = replay_socket.receive_json()
        replayed_ended_event = replay_socket.receive_json()

    assert replayed_timeout_event["type"] == "battle.timeout"
    assert replayed_timeout_event["payload"]["battleSessionId"] == battle_session_id
    assert replayed_timeout_event["payload"]["timedOutPlayerId"] == player_id
    assert replayed_timeout_event["payload"]["battle"]["status"] == "ENDED"
    assert replayed_ended_event["type"] == "battle.ended"
    assert replayed_ended_event["payload"]["battleSessionId"] == battle_session_id
    assert replayed_ended_event["payload"]["loserPlayerId"] == player_id
    assert replayed_ended_event["payload"]["endedReason"] == "TIMEOUT"


def test_ws_endpoint_replays_latest_ended_battle_on_reconnect() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "ws-ended-reconnect")
    battle_session_id = create_practice_battle(client, player_id)
    ws_token = get_ws_token(client, player_id)

    with client.websocket_connect(f"/ws?token={ws_token}") as websocket:
        websocket.receive_json()
        started_event = websocket.receive_json()
        assert started_event["payload"]["battleSessionId"] == battle_session_id

        battle = game_state_repository.get_battle(battle_session_id)
        assert battle is not None
        battle.action_deadline_at = datetime.now(UTC) - timedelta(seconds=1)

        websocket.receive_json()
        websocket.receive_json()

    with client.websocket_connect(f"/ws?token={ws_token}") as replay_socket:
        replayed_ended_event = replay_socket.receive_json()

    assert replayed_ended_event["type"] == "battle.ended"
    assert replayed_ended_event["payload"]["loserPlayerId"] == player_id
    assert replayed_ended_event["payload"]["endedReason"] == "TIMEOUT"


def test_ws_endpoint_emits_timeout_and_ended_events_when_deadline_expires() -> None:
    client = TestClient(create_app())
    player_id = create_configured_guest(client, "ws-timeout")
    battle_session_id = create_practice_battle(client, player_id)
    ws_token = get_ws_token(client, player_id)

    with client.websocket_connect(f"/ws?token={ws_token}") as websocket:
        websocket.receive_json()
        started_event = websocket.receive_json()
        assert started_event["payload"]["battleSessionId"] == battle_session_id

        battle = game_state_repository.get_battle(battle_session_id)
        assert battle is not None
        battle.action_deadline_at = datetime.now(UTC) - timedelta(seconds=1)

        timeout_event = websocket.receive_json()
        ended_event = websocket.receive_json()

    assert timeout_event["type"] == "battle.timeout"
    assert timeout_event["payload"]["battleSessionId"] == battle_session_id
    assert timeout_event["payload"]["timedOutPlayerId"] == player_id
    assert timeout_event["payload"]["battle"]["endedReason"] == "TIMEOUT"
    assert ended_event["type"] == "battle.ended"
    assert ended_event["payload"]["loserPlayerId"] == player_id
    assert ended_event["payload"]["endedReason"] == "TIMEOUT"


def test_ws_endpoint_rejects_invalid_token() -> None:
    client = TestClient(create_app())

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws?token=wst_missing"):
            pass

    assert exc_info.value.code == 1008

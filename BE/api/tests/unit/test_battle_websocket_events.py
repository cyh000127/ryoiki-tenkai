from datetime import UTC, datetime

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
from gesture_api.main import create_app
from gesture_api.repositories.game_state import InMemoryGameStateRepository
from gesture_api.services.battle_websocket import BattleWebSocketEventHandler
from starlette.websockets import WebSocketDisconnect


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
                "gestureSequence": ["seal_1", "seal_3"],
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
    handler = BattleWebSocketEventHandler(repository)
    event = BattleSubmitActionEvent(
        type="battle.submit_action",
        request_id="req-action",
        payload=BattleSubmitActionPayload(
            battle_session_id=battle.battle_session_id,
            player_id=player.player_id,
            turn_number=1,
            action_id="act-ws-1",
            gesture_sequence=["seal_1", "seal_3"],
            submitted_at=datetime(2026, 4, 27, tzinfo=UTC),
        ),
    )

    response = handler.handle(event)

    assert isinstance(response, BattleActionResultEvent)
    assert response.request_id == "req-action"
    assert response.payload.status == "ACCEPTED"
    assert response.payload.battle is not None
    assert response.payload.battle.opponent.hp == 75
    assert response.payload.battle.self.hp == 75
    assert response.payload.battle.turn_number == 3
    assert response.payload.battle.turn_owner_player_id == player.player_id
    assert len(response.payload.battle.battle_log) == 2

    duplicate_response = handler.handle(event)

    assert isinstance(duplicate_response, BattleActionResultEvent)
    assert duplicate_response.payload.status == "REJECTED"
    assert duplicate_response.payload.reason == "DUPLICATE_ACTION"


def test_ws_endpoint_replays_queue_handoff_and_handles_submit_action() -> None:
    client = TestClient(create_app())
    guest_response = client.post("/api/v1/players/guest", json={"nickname": "ws-client"})
    player_id = guest_response.json()["data"]["playerId"]
    skill = client.get("/api/v1/skillsets").json()["data"][0]["skills"][0]
    loadout_response = client.post(
        "/api/v1/players/me/loadout",
        headers={"X-Player-Id": player_id},
        json={
            "skillsetId": "skillset_seal_basic",
            "animsetId": "animset_basic_2d",
        },
    )
    assert loadout_response.status_code == 200
    ws_token = client.get("/api/v1/ws-token", headers={"X-Player-Id": player_id}).json()["data"][
        "wsToken"
    ]

    queue_response = client.post(
        "/api/v1/matchmaking/queue",
        headers={"X-Player-Id": player_id},
        json={"mode": "RANKED_1V1"},
    )
    assert queue_response.status_code == 200
    assert queue_response.json()["data"]["queueStatus"] == "SEARCHING"

    with client.websocket_connect(f"/ws?token={ws_token}") as websocket:
        ready_event = websocket.receive_json()
        found_event = websocket.receive_json()
        started_event = websocket.receive_json()

        assert ready_event["type"] == "battle.match_ready"
        assert found_event["type"] == "battle.match_found"
        assert started_event["type"] == "battle.started"
        battle_session_id = started_event["payload"]["battleSessionId"]

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
    assert response["payload"]["battle"]["opponent"]["hp"] == 75
    assert response["payload"]["battle"]["self"]["hp"] == 75
    assert response["payload"]["battle"]["turnNumber"] == 3
    assert state_updated_event["type"] == "battle.state_updated"
    assert state_updated_event["payload"]["sourceActionId"] == "act-ws-endpoint"
    assert state_updated_event["payload"]["battle"]["turnOwnerPlayerId"] == player_id
    assert state_updated_event["payload"]["battle"]["self"]["hp"] == 75
    assert state_updated_event["payload"]["battle"]["opponent"]["hp"] == 75


def test_ws_endpoint_rejects_invalid_token() -> None:
    client = TestClient(create_app())

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws?token=wst_missing"):
            pass

    assert exc_info.value.code == 1008

from datetime import datetime
from typing import Literal, Protocol

from fastapi import WebSocket
from gesture_api.api.schemas.game import BattleActionResponse, BattleStateResponse
from gesture_api.api.schemas.websocket import (
    BattleActionResultEvent,
    BattleEndedEvent,
    BattleEndedPayload,
    BattleInboundEvent,
    BattleMatchFoundEvent,
    BattleMatchFoundPayload,
    BattleMatchReadyEvent,
    BattleMatchReadyPayload,
    BattlePingEvent,
    BattlePongEvent,
    BattleSurrenderedEvent,
    BattleSurrenderedPayload,
    BattleStateUpdatedEvent,
    BattleStateUpdatedPayload,
    BattleStartedEvent,
    BattleStartedPayload,
    BattleTimeoutEvent,
    BattleTimeoutPayload,
    BattleOutboundEvent,
    BattleSubmitActionEvent,
    serialize_battle_event,
)
from gesture_api.domain.game import BattleSession


class BattleActionRepository(Protocol):
    def submit_action(
        self,
        battle_session_id: str,
        player_id: str,
        turn_number: int,
        action_id: str,
        gesture_sequence: list[str],
    ) -> tuple[str, BattleSession | None, str | None]: ...


class BattleConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, player_id: str, websocket: WebSocket) -> None:
        self._connections[player_id] = websocket

    def disconnect(self, player_id: str, websocket: WebSocket | None = None) -> None:
        current = self._connections.get(player_id)
        if current is None:
            return
        if websocket is None or current == websocket:
            self._connections.pop(player_id, None)

    def is_connected(self, player_id: str) -> bool:
        return player_id in self._connections

    async def send_event(self, player_id: str, event: BattleOutboundEvent) -> bool:
        websocket = self._connections.get(player_id)
        if websocket is None:
            return False
        await websocket.send_json(serialize_battle_event(event))
        return True


class BattleWebSocketEventHandler:
    def __init__(self, repository: BattleActionRepository) -> None:
        self._repository = repository

    def handle(self, event: BattleInboundEvent) -> BattlePongEvent | BattleActionResultEvent:
        if isinstance(event, BattlePingEvent):
            return BattlePongEvent(request_id=event.request_id)
        if isinstance(event, BattleSubmitActionEvent):
            return self._submit_action(event)
        raise ValueError("Unsupported battle event.")

    def _submit_action(self, event: BattleSubmitActionEvent) -> BattleActionResultEvent:
        payload = event.payload
        action_status, battle, reason = self._repository.submit_action(
            battle_session_id=payload.battle_session_id,
            player_id=payload.player_id,
            turn_number=payload.turn_number,
            action_id=payload.action_id,
            gesture_sequence=payload.gesture_sequence,
        )
        response_status: Literal["ACCEPTED", "REJECTED"] = (
            "ACCEPTED" if action_status == "accepted" else "REJECTED"
        )
        battle_state = None
        if battle is not None and payload.player_id in battle.participants:
            battle_state = BattleStateResponse.from_session(battle, payload.player_id)
        return BattleActionResultEvent(
            request_id=event.request_id,
            payload=BattleActionResponse(
                battle_session_id=payload.battle_session_id,
                turn_number=payload.turn_number,
                action_id=payload.action_id,
                status=response_status,
                reason=reason,
                battle=battle_state,
            ),
        )


def get_player_seat(battle: BattleSession, player_id: str) -> Literal["PLAYER_ONE", "PLAYER_TWO"]:
    return "PLAYER_ONE" if battle.player_ids[0] == player_id else "PLAYER_TWO"


def build_match_ready_event(queued_at: datetime) -> BattleMatchReadyEvent:
    return BattleMatchReadyEvent(payload=BattleMatchReadyPayload(queued_at=queued_at))


def build_match_found_event(
    battle: BattleSession,
    player_id: str,
) -> BattleMatchFoundEvent:
    return BattleMatchFoundEvent(
        payload=BattleMatchFoundPayload(
            match_id=battle.match_id,
            battle_session_id=battle.battle_session_id,
            player_seat=get_player_seat(battle, player_id),
        )
    )


def build_started_event(
    battle: BattleSession,
    player_id: str,
) -> BattleStartedEvent:
    return BattleStartedEvent(
        payload=BattleStartedPayload(
            battle_session_id=battle.battle_session_id,
            player_seat=get_player_seat(battle, player_id),
            battle=BattleStateResponse.from_session(battle, player_id),
        )
    )


def build_state_updated_event(
    battle: BattleSession,
    player_id: str,
    source_action_id: str | None = None,
) -> BattleStateUpdatedEvent:
    return BattleStateUpdatedEvent(
        payload=BattleStateUpdatedPayload(
            battle_session_id=battle.battle_session_id,
            battle=BattleStateResponse.from_session(battle, player_id),
            source_action_id=source_action_id,
        )
    )


def build_timeout_event(
    battle: BattleSession,
    player_id: str,
    timed_out_player_id: str,
) -> BattleTimeoutEvent:
    return BattleTimeoutEvent(
        payload=BattleTimeoutPayload(
            battle_session_id=battle.battle_session_id,
            turn_number=battle.turn_number,
            timed_out_player_id=timed_out_player_id,
            battle=BattleStateResponse.from_session(battle, player_id),
        )
    )


def build_surrendered_event(
    battle: BattleSession,
    player_id: str,
    surrendered_player_id: str,
) -> BattleSurrenderedEvent:
    return BattleSurrenderedEvent(
        payload=BattleSurrenderedPayload(
            battle_session_id=battle.battle_session_id,
            surrendered_player_id=surrendered_player_id,
            battle=BattleStateResponse.from_session(battle, player_id),
        )
    )


def build_ended_event(
    battle: BattleSession,
    player_id: str,
) -> BattleEndedEvent:
    if battle.winner_player_id is None or battle.loser_player_id is None or battle.ended_reason is None:
        raise ValueError("Ended battle must include winner, loser, and ended reason.")
    rating_change = None
    if battle.rating_delta is not None:
        rating_change = battle.rating_delta if battle.winner_player_id == player_id else -battle.rating_delta
    return BattleEndedEvent(
        payload=BattleEndedPayload(
            battle_session_id=battle.battle_session_id,
            winner_player_id=battle.winner_player_id,
            loser_player_id=battle.loser_player_id,
            ended_reason=battle.ended_reason,
            battle=BattleStateResponse.from_session(battle, player_id),
            rating_change=rating_change,
        )
    )


battle_connection_manager = BattleConnectionManager()

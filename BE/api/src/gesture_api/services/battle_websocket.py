from typing import Literal, Protocol

from gesture_api.api.schemas.game import BattleActionResponse, BattleStateResponse
from gesture_api.api.schemas.websocket import (
    BattleActionResultEvent,
    BattleInboundEvent,
    BattlePingEvent,
    BattlePongEvent,
    BattleSubmitActionEvent,
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

from datetime import datetime
from typing import Annotated, Literal

from gesture_api.api.schemas.base import ApiSchema
from gesture_api.api.schemas.game import BattleActionResponse, BattleStateResponse
from pydantic import Field, TypeAdapter


class BattlePingPayload(ApiSchema):
    pass


class BattlePingEvent(ApiSchema):
    type: Literal["battle.ping"]
    request_id: str | None = None
    payload: BattlePingPayload = Field(default_factory=BattlePingPayload)


class BattleSubmitActionPayload(ApiSchema):
    battle_session_id: str
    player_id: str
    turn_number: int
    action_id: str = Field(min_length=1)
    gesture_sequence: list[str] = Field(min_length=1)
    submitted_at: datetime


class BattleSubmitActionEvent(ApiSchema):
    type: Literal["battle.submit_action"]
    request_id: str | None = None
    payload: BattleSubmitActionPayload


class BattlePongPayload(ApiSchema):
    ok: bool = True


class BattlePongEvent(ApiSchema):
    type: Literal["battle.pong"] = "battle.pong"
    request_id: str | None = None
    payload: BattlePongPayload = Field(default_factory=BattlePongPayload)


class BattleMatchReadyPayload(ApiSchema):
    queue_status: Literal["SEARCHING"] = "SEARCHING"
    queued_at: datetime


class BattleMatchReadyEvent(ApiSchema):
    type: Literal["battle.match_ready"] = "battle.match_ready"
    request_id: str | None = None
    payload: BattleMatchReadyPayload


class BattleMatchFoundPayload(ApiSchema):
    match_id: str
    battle_session_id: str
    player_seat: Literal["PLAYER_ONE", "PLAYER_TWO"]


class BattleMatchFoundEvent(ApiSchema):
    type: Literal["battle.match_found"] = "battle.match_found"
    request_id: str | None = None
    payload: BattleMatchFoundPayload


class BattleStartedPayload(ApiSchema):
    battle_session_id: str
    player_seat: Literal["PLAYER_ONE", "PLAYER_TWO"]
    battle: BattleStateResponse


class BattleStartedEvent(ApiSchema):
    type: Literal["battle.started"] = "battle.started"
    request_id: str | None = None
    payload: BattleStartedPayload


class BattleActionResultEvent(ApiSchema):
    type: Literal["battle.action_result"] = "battle.action_result"
    request_id: str | None = None
    payload: BattleActionResponse


class BattleStateUpdatedPayload(ApiSchema):
    battle_session_id: str
    battle: BattleStateResponse
    source_action_id: str | None = None


class BattleStateUpdatedEvent(ApiSchema):
    type: Literal["battle.state_updated"] = "battle.state_updated"
    request_id: str | None = None
    payload: BattleStateUpdatedPayload


class BattleTimeoutPayload(ApiSchema):
    battle_session_id: str
    turn_number: int
    timed_out_player_id: str
    battle: BattleStateResponse


class BattleTimeoutEvent(ApiSchema):
    type: Literal["battle.timeout"] = "battle.timeout"
    request_id: str | None = None
    payload: BattleTimeoutPayload


class BattleSurrenderedPayload(ApiSchema):
    battle_session_id: str
    surrendered_player_id: str
    battle: BattleStateResponse


class BattleSurrenderedEvent(ApiSchema):
    type: Literal["battle.surrendered"] = "battle.surrendered"
    request_id: str | None = None
    payload: BattleSurrenderedPayload


class BattleEndedPayload(ApiSchema):
    battle_session_id: str
    winner_player_id: str
    loser_player_id: str
    ended_reason: str
    battle: BattleStateResponse
    rating_change: int | None = None


class BattleEndedEvent(ApiSchema):
    type: Literal["battle.ended"] = "battle.ended"
    request_id: str | None = None
    payload: BattleEndedPayload


class BattleErrorPayload(ApiSchema):
    code: str
    message: str


class BattleErrorEvent(ApiSchema):
    type: Literal["battle.error"] = "battle.error"
    request_id: str | None = None
    payload: BattleErrorPayload


type BattleInboundEvent = Annotated[
    BattlePingEvent | BattleSubmitActionEvent,
    Field(discriminator="type"),
]
type BattleOutboundEvent = (
    BattlePongEvent
    | BattleMatchReadyEvent
    | BattleMatchFoundEvent
    | BattleStartedEvent
    | BattleActionResultEvent
    | BattleStateUpdatedEvent
    | BattleTimeoutEvent
    | BattleSurrenderedEvent
    | BattleEndedEvent
    | BattleErrorEvent
)

_BATTLE_INBOUND_ADAPTER = TypeAdapter(BattleInboundEvent)


def deserialize_battle_event(message: object) -> BattleInboundEvent:
    return _BATTLE_INBOUND_ADAPTER.validate_python(message)


def serialize_battle_event(event: BattleOutboundEvent) -> dict[str, object]:
    return event.model_dump(mode="json", by_alias=True, exclude_none=True)


def extract_battle_request_id(message: object) -> str | None:
    if not isinstance(message, dict):
        return None
    request_id = message.get("requestId", message.get("request_id"))
    return request_id if isinstance(request_id, str) else None

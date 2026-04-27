from datetime import datetime
from typing import Annotated, Literal

from gesture_api.api.schemas.base import ApiSchema
from gesture_api.api.schemas.game import BattleActionResponse
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


class BattleActionResultEvent(ApiSchema):
    type: Literal["battle.action_result"] = "battle.action_result"
    request_id: str | None = None
    payload: BattleActionResponse


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
type BattleOutboundEvent = BattlePongEvent | BattleActionResultEvent | BattleErrorEvent

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

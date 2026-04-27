from datetime import datetime
from typing import Literal

from gesture_api.api.schemas.base import ApiSchema
from pydantic import Field


class CreateGestureCommandRequest(ApiSchema):
    session_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    gesture_key: str = Field(min_length=1, max_length=80)
    skill_action_key: str | None = Field(default=None, max_length=120)
    confidence: float = Field(ge=0, le=1)
    handedness: Literal["left", "right", "unknown"] = "unknown"
    occurred_at: datetime


class GestureCommandResponse(ApiSchema):
    command_id: str
    status: Literal["accepted", "rejected"]
    gesture_key: str
    skill_action_key: str | None
    confidence: float
    reject_reason: str | None = None

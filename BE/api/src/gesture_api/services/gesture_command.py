from uuid import uuid4

from gesture_api.api.schemas.gesture_command import (
    CreateGestureCommandRequest,
    GestureCommandResponse,
)
from gesture_api.domain.gesture import is_supported_gesture
from gesture_api.repositories.gesture_mapping import GestureMappingRepository


class GestureCommandService:
    def __init__(
        self,
        gesture_mapping_repository: GestureMappingRepository,
        min_confidence: float,
    ) -> None:
        self._gesture_mapping_repository = gesture_mapping_repository
        self._min_confidence = min_confidence

    def create_command(self, request: CreateGestureCommandRequest) -> GestureCommandResponse:
        command_id = str(uuid4())

        if not is_supported_gesture(request.gesture_key):
            return GestureCommandResponse(
                command_id=command_id,
                status="rejected",
                gesture_key=request.gesture_key,
                skill_action_key=None,
                confidence=request.confidence,
                reject_reason="unsupported_gesture",
            )

        if request.confidence < self._min_confidence:
            return GestureCommandResponse(
                command_id=command_id,
                status="rejected",
                gesture_key=request.gesture_key,
                skill_action_key=None,
                confidence=request.confidence,
                reject_reason="low_confidence",
            )

        skill_action_key = (
            request.skill_action_key or self._gesture_mapping_repository.find_skill_action(
                user_id=request.user_id,
                gesture_key=request.gesture_key,
            )
        )

        if skill_action_key is None:
            return GestureCommandResponse(
                command_id=command_id,
                status="rejected",
                gesture_key=request.gesture_key,
                skill_action_key=None,
                confidence=request.confidence,
                reject_reason="missing_skill_mapping",
            )

        return GestureCommandResponse(
            command_id=command_id,
            status="accepted",
            gesture_key=request.gesture_key,
            skill_action_key=skill_action_key,
            confidence=request.confidence,
        )

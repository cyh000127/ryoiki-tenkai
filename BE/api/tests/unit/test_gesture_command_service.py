from datetime import UTC, datetime

from gesture_api.api.schemas.gesture_command import CreateGestureCommandRequest
from gesture_api.repositories.gesture_mapping import GestureMappingRepository
from gesture_api.services.gesture_command import GestureCommandService


def make_service(min_confidence: float = 0.65) -> GestureCommandService:
    return GestureCommandService(
        gesture_mapping_repository=GestureMappingRepository(session=None),
        min_confidence=min_confidence,
    )


def make_request(
    gesture_key: str = "pinch",
    confidence: float = 0.9,
) -> CreateGestureCommandRequest:
    return CreateGestureCommandRequest(
        session_id="session-1",
        user_id="user-1",
        gesture_key=gesture_key,
        confidence=confidence,
        occurred_at=datetime.now(UTC),
    )


def test_accepts_supported_high_confidence_gesture() -> None:
    response = make_service().create_command(make_request())

    assert response.status == "accepted"
    assert response.skill_action_key == "skill.confirm"


def test_rejects_low_confidence_gesture() -> None:
    response = make_service().create_command(make_request(confidence=0.3))

    assert response.status == "rejected"
    assert response.reject_reason == "low_confidence"


def test_rejects_unsupported_gesture() -> None:
    response = make_service().create_command(make_request(gesture_key="unknown"))

    assert response.status == "rejected"
    assert response.reject_reason == "unsupported_gesture"

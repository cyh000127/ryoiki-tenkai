from collections.abc import Generator

from sqlalchemy.orm import Session

from gesture_api.db.session import SessionLocal
from gesture_api.repositories.gesture_mapping import GestureMappingRepository
from gesture_api.services.gesture_command import GestureCommandService
from gesture_api.settings import get_settings


def get_db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_gesture_command_service() -> GestureCommandService:
    repository = GestureMappingRepository(session=None)
    return GestureCommandService(
        gesture_mapping_repository=repository,
        min_confidence=get_settings().min_gesture_confidence,
    )

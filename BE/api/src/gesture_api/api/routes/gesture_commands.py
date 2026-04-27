from typing import Annotated

from fastapi import APIRouter, Depends, status
from gesture_api.api.schemas.gesture_command import (
    CreateGestureCommandRequest,
    GestureCommandResponse,
)
from gesture_api.dependencies import get_gesture_command_service
from gesture_api.services.gesture_command import GestureCommandService

router = APIRouter(prefix="/gesture-commands", tags=["gesture-commands"])


@router.post("", response_model=GestureCommandResponse, status_code=status.HTTP_202_ACCEPTED)
def create_gesture_command(
    request: CreateGestureCommandRequest,
    service: Annotated[GestureCommandService, Depends(get_gesture_command_service)],
) -> GestureCommandResponse:
    return service.create_command(request)

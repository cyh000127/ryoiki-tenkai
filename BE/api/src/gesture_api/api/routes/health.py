from fastapi import APIRouter
from gesture_api.api.schemas.health import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/healthz", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(status="ok")

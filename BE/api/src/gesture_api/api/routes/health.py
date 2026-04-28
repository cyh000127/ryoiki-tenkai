from fastapi import APIRouter
from gesture_api.api.schemas.health import HealthResponse, HealthRuntimeSummary
from gesture_api.repositories.game_state import game_state_repository
from gesture_api.repositories.game_state_storage import (
    JsonGameStateStorageAdapter,
    NullGameStateStorageAdapter,
    SqlGameStateStorageAdapter,
)
from gesture_api.settings import get_settings

router = APIRouter(tags=["system"])


@router.get("/healthz", response_model=HealthResponse)
def get_health() -> HealthResponse:
    settings = get_settings()

    return HealthResponse(
        status="ok",
        runtime=HealthRuntimeSummary(
            app_env=settings.app_env,
            database="configured" if settings.database_url else "missing",
            state_storage=_get_state_storage_mode(),
            persistence_policy="adapter_required",
            recognition_data_boundary="raw_recognition_data_not_persisted",
            recognizer_runtime="blocked_until_selected",
            skill_domain_source="blocked_until_approved",
        ),
    )


def _get_state_storage_mode() -> str:
    adapter = game_state_repository.storage_adapter
    if isinstance(adapter, JsonGameStateStorageAdapter):
        return "json"
    if isinstance(adapter, SqlGameStateStorageAdapter):
        return "sql"
    if isinstance(adapter, NullGameStateStorageAdapter):
        return "ephemeral"
    return "unknown"

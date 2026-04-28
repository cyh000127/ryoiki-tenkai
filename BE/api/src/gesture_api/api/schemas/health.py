from gesture_api.api.schemas.base import ApiSchema


class HealthRuntimeSummary(ApiSchema):
    app_env: str
    database: str
    state_storage: str
    persistence_policy: str
    recognition_data_boundary: str
    recognizer_runtime: str
    skill_domain_source: str


class HealthResponse(ApiSchema):
    status: str
    runtime: HealthRuntimeSummary

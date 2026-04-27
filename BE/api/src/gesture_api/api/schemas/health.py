from gesture_api.api.schemas.base import ApiSchema


class HealthResponse(ApiSchema):
    status: str

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from gesture_api.api.exception_handlers import register_exception_handlers
from gesture_api.api.routes.game import router as game_router
from gesture_api.api.routes.gesture_commands import router as gesture_command_router
from gesture_api.api.routes.health import router as health_router
from gesture_api.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Gesture Skill API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=parse_cors_origins(settings.cors_allowed_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(game_router)
    app.include_router(gesture_command_router)
    return app


def parse_cors_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


app = create_app()

from fastapi import FastAPI

from gesture_api.api.exception_handlers import register_exception_handlers
from gesture_api.api.routes.game import router as game_router
from gesture_api.api.routes.gesture_commands import router as gesture_command_router
from gesture_api.api.routes.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="Gesture Skill API", version="0.1.0")
    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(game_router)
    app.include_router(gesture_command_router)
    return app


app = create_app()

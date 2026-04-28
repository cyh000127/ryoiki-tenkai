import os
from pathlib import Path

import pytest

os.environ.setdefault("GAME_STATE_STORAGE_BACKEND", "json")

from gesture_api.repositories.game_state import game_state_repository


@pytest.fixture
def game_state_path(tmp_path: Path) -> Path:
    return tmp_path / "game-state.json"


@pytest.fixture(autouse=True)
def reset_game_state_repository(game_state_path: Path):
    game_state_repository.reset_runtime_state(persistence_path=game_state_path)
    yield
    game_state_repository.reset_runtime_state(persistence_path=game_state_path)

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from gesture_api.domain.game import BattleSession


class MatchQueueStore(Protocol):
    def reset(self) -> None: ...

    def get(self, player_id: str) -> datetime | None: ...

    def add(self, player_id: str, queued_at: datetime) -> None: ...

    def remove(self, player_id: str) -> datetime | None: ...

    def list_player_ids(self) -> tuple[str, ...]: ...


class InMemoryMatchQueueStore:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._queue: dict[str, datetime] = {}

    def get(self, player_id: str) -> datetime | None:
        return self._queue.get(player_id)

    def add(self, player_id: str, queued_at: datetime) -> None:
        self._queue[player_id] = queued_at

    def remove(self, player_id: str) -> datetime | None:
        return self._queue.pop(player_id, None)

    def list_player_ids(self) -> tuple[str, ...]:
        return tuple(self._queue)


class BattleRuntimeStore(Protocol):
    def reset(self) -> None: ...

    def save(self, battle: BattleSession) -> None: ...

    def get(self, battle_session_id: str) -> BattleSession | None: ...

    def get_active_battle_id(self, player_id: str) -> str | None: ...

    def set_active_battle_id(self, player_id: str, battle_session_id: str) -> None: ...

    def clear_active_battle_id(self, player_id: str) -> str | None: ...

    def get_latest_battle_id(self, player_id: str) -> str | None: ...

    def set_latest_battle_id(self, player_id: str, battle_session_id: str) -> None: ...


class InMemoryBattleRuntimeStore:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._battles: dict[str, BattleSession] = {}
        self._active_battle_ids: dict[str, str] = {}
        self._latest_battle_ids: dict[str, str] = {}

    def save(self, battle: BattleSession) -> None:
        self._battles[battle.battle_session_id] = battle

    def get(self, battle_session_id: str) -> BattleSession | None:
        return self._battles.get(battle_session_id)

    def get_active_battle_id(self, player_id: str) -> str | None:
        return self._active_battle_ids.get(player_id)

    def set_active_battle_id(self, player_id: str, battle_session_id: str) -> None:
        self._active_battle_ids[player_id] = battle_session_id

    def clear_active_battle_id(self, player_id: str) -> str | None:
        return self._active_battle_ids.pop(player_id, None)

    def get_latest_battle_id(self, player_id: str) -> str | None:
        return self._latest_battle_ids.get(player_id)

    def set_latest_battle_id(self, player_id: str, battle_session_id: str) -> None:
        self._latest_battle_ids[player_id] = battle_session_id

import json
from datetime import UTC, datetime

import pytest
from gesture_api.db.base import Base
from gesture_api.domain.catalog import SKILLSETS
from gesture_api.domain.game import PlayerRecord
from gesture_api.repositories.game_state import (
    InMemoryGameStateRepository,
    create_default_game_state_storage_adapter,
)
from gesture_api.repositories.game_state_storage import (
    GameStatePersistenceSnapshot,
    JsonGameStateStorageAdapter,
    NullGameStateStorageAdapter,
    SqlGameStateStorageAdapter,
)
from gesture_api.repositories.runtime_state import (
    InMemoryBattleRuntimeStore,
    InMemoryMatchQueueStore,
)
from gesture_api.settings import get_settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DEFAULT_SKILL = SKILLSETS[0].skills[0]


def test_json_game_state_storage_adapter_round_trips_snapshot(tmp_path) -> None:
    storage_path = tmp_path / "game-state.json"
    adapter = JsonGameStateStorageAdapter(storage_path)
    played_at = datetime(2026, 4, 28, tzinfo=UTC)

    adapter.save(
        GameStatePersistenceSnapshot(
            players=[
                PlayerRecord(
                    player_id="pl_saved",
                    guest_token="gt_saved",
                    nickname="saved-player",
                    rating=1016,
                    wins=1,
                    losses=0,
                    loadout_configured=True,
                )
            ],
            match_history=[
                {
                    "match_id": "match_saved",
                    "battle_session_id": "battle_saved",
                    "player_id": "pl_saved",
                    "opponent_id": "pl_practice",
                    "result": "WIN",
                    "skillset_id": "skillset_seal_basic",
                    "rating_change": 16,
                    "rating_after": 1016,
                    "ended_reason": "HP_ZERO",
                    "turn_count": 3,
                    "played_at": played_at,
                }
            ],
            match_audits={
                "battle_saved": [
                    {
                        "turn_number": 1,
                        "actor_player_id": "pl_saved",
                        "message": "jjk_gojo_red dealt 24",
                        "created_at": played_at,
                    }
                ]
            },
        )
    )

    reloaded = JsonGameStateStorageAdapter(storage_path).load()

    assert reloaded is not None
    assert reloaded.players[0].player_id == "pl_saved"
    assert reloaded.players[0].rating == 1016
    assert reloaded.match_history[0]["played_at"] == played_at
    assert reloaded.match_audits["battle_saved"][0]["created_at"] == played_at


def test_json_game_state_storage_adapter_rejects_corrupted_snapshot(tmp_path) -> None:
    storage_path = tmp_path / "corrupted-game-state.json"
    storage_path.write_text("{broken-json", encoding="utf-8")

    with pytest.raises(json.JSONDecodeError):
        JsonGameStateStorageAdapter(storage_path).load()


def test_game_state_repository_uses_storage_adapter_boundary(tmp_path) -> None:
    storage_path = tmp_path / "game-state.json"
    repository = InMemoryGameStateRepository(
        storage_adapter=JsonGameStateStorageAdapter(storage_path)
    )

    player = repository.create_guest_player("adapter-player")
    repository.update_loadout(
        player_id=player.player_id,
        skillset_id="skillset_seal_basic",
        animset_id="animset_basic_2d",
    )

    reloaded = InMemoryGameStateRepository(
        storage_adapter=JsonGameStateStorageAdapter(storage_path)
    )

    saved_player = reloaded.get_player(player.player_id)
    assert saved_player is not None
    assert saved_player.nickname == "adapter-player"
    assert saved_player.loadout_configured is True


def test_null_game_state_storage_adapter_keeps_runtime_state_ephemeral() -> None:
    repository = InMemoryGameStateRepository(storage_adapter=NullGameStateStorageAdapter())
    player = repository.create_guest_player("ephemeral-player")

    reloaded = InMemoryGameStateRepository(storage_adapter=NullGameStateStorageAdapter())

    assert repository.get_player(player.player_id) is not None
    assert reloaded.get_player(player.player_id) is None


def test_game_state_repository_uses_runtime_store_boundaries() -> None:
    queue_store = InMemoryMatchQueueStore()
    battle_runtime_store = InMemoryBattleRuntimeStore()
    repository = InMemoryGameStateRepository(
        storage_adapter=NullGameStateStorageAdapter(),
        queue_store=queue_store,
        battle_runtime_store=battle_runtime_store,
    )
    player_one = repository.create_guest_player("queue-one")
    player_two = repository.create_guest_player("queue-two")

    repository.enter_queue(player_one.player_id)
    repository.enter_queue(player_two.player_id)
    battle = repository.create_match_for_player(player_two.player_id, allow_practice=False)

    assert battle is not None
    assert queue_store.get(player_one.player_id) is None
    assert queue_store.get(player_two.player_id) is None
    assert battle_runtime_store.get_active_battle_id(player_one.player_id) == battle.battle_session_id
    assert battle_runtime_store.get_latest_battle_id(player_two.player_id) == battle.battle_session_id


def test_sql_game_state_storage_adapter_round_trips_snapshot() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    adapter = SqlGameStateStorageAdapter(session_factory)
    played_at = datetime(2026, 4, 28, tzinfo=UTC)

    adapter.save(
        GameStatePersistenceSnapshot(
            players=[
                PlayerRecord(
                    player_id="pl_sql",
                    guest_token="gt_sql",
                    nickname="sql-player",
                    rating=984,
                    wins=0,
                    losses=1,
                    loadout_configured=True,
                )
            ],
            match_history=[
                {
                    "match_id": "match_sql",
                    "battle_session_id": "battle_sql",
                    "player_id": "pl_sql",
                    "opponent_id": "pl_practice",
                    "result": "LOSE",
                    "skillset_id": "skillset_seal_basic",
                    "rating_change": -16,
                    "rating_after": 984,
                    "ended_reason": "SURRENDER",
                    "turn_count": 1,
                    "played_at": played_at,
                }
            ],
            match_audits={
                "battle_sql": [
                    {
                        "turn_number": 1,
                        "actor_player_id": "pl_sql",
                        "message": "pl_sql surrendered",
                        "created_at": played_at,
                    }
                ]
            },
        )
    )

    reloaded = adapter.load()

    assert reloaded is not None
    assert reloaded.players[0].player_id == "pl_sql"
    assert reloaded.players[0].losses == 1
    assert reloaded.match_history[0]["rating_change"] == -16
    assert reloaded.match_audits["battle_sql"][0]["message"] == "pl_sql surrendered"


def test_default_game_state_storage_backend_is_sql(monkeypatch) -> None:
    monkeypatch.setenv("GAME_STATE_STORAGE_BACKEND", "sql")
    get_settings.cache_clear()
    try:
        adapter = create_default_game_state_storage_adapter()
    finally:
        get_settings.cache_clear()

    assert isinstance(adapter, SqlGameStateStorageAdapter)


def test_practice_rival_skips_turn_when_it_cannot_afford_its_skill() -> None:
    repository = InMemoryGameStateRepository(storage_adapter=NullGameStateStorageAdapter())
    player = repository.create_guest_player("practice-mana")
    repository.update_loadout(
        player_id=player.player_id,
        skillset_id="skillset_seal_basic",
        animset_id="animset_basic_2d",
    )
    repository.enter_queue(player.player_id)
    battle = repository.create_match_for_player(player.player_id)

    assert battle is not None
    battle.participants["pl_practice"].mana = max(0, DEFAULT_SKILL.mana_cost - 11)

    status, updated_battle, reason = repository.submit_action(
        battle_session_id=battle.battle_session_id,
        player_id=player.player_id,
        turn_number=1,
        action_id="act-practice-low-mana",
        gesture_sequence=DEFAULT_SKILL.gesture_sequence,
    )

    assert status == "accepted"
    assert reason is None
    assert updated_battle is not None
    assert updated_battle.turn_number == 3
    assert updated_battle.turn_owner_player_id == player.player_id
    assert updated_battle.participants[player.player_id].hp == 100
    assert updated_battle.participants["pl_practice"].mana == DEFAULT_SKILL.mana_cost - 1
    assert len(updated_battle.battle_log) == 1


def test_practice_rival_skips_turn_when_its_skill_is_still_on_cooldown() -> None:
    repository = InMemoryGameStateRepository(storage_adapter=NullGameStateStorageAdapter())
    player = repository.create_guest_player("practice-cooldown")
    repository.update_loadout(
        player_id=player.player_id,
        skillset_id="skillset_seal_basic",
        animset_id="animset_basic_2d",
    )
    repository.enter_queue(player.player_id)
    battle = repository.create_match_for_player(player.player_id)

    assert battle is not None
    battle.participants["pl_practice"].cooldowns[DEFAULT_SKILL.skill_id] = 2

    status, updated_battle, reason = repository.submit_action(
        battle_session_id=battle.battle_session_id,
        player_id=player.player_id,
        turn_number=1,
        action_id="act-practice-cooldown",
        gesture_sequence=DEFAULT_SKILL.gesture_sequence,
    )

    assert status == "accepted"
    assert reason is None
    assert updated_battle is not None
    assert updated_battle.turn_number == 3
    assert updated_battle.turn_owner_player_id == player.player_id
    assert updated_battle.participants[player.player_id].hp == 100
    assert updated_battle.participants["pl_practice"].cooldowns[DEFAULT_SKILL.skill_id] == 1
    assert len(updated_battle.battle_log) == 1

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from gesture_api.db.session import SessionLocal
from gesture_api.domain.catalog import ANIMSETS, SKILLSETS, find_animset, find_skillset
from gesture_api.domain.game import (
    TURN_SECONDS,
    BattleLogEntry,
    BattleParticipant,
    BattleSession,
    PlayerRecord,
)
from gesture_api.domain.rating import calculate_elo_delta
from gesture_api.repositories.game_state_storage import (
    GameStatePersistenceSnapshot,
    GameStateStorageAdapter,
    JsonGameStateStorageAdapter,
    NullGameStateStorageAdapter,
    SqlGameStateStorageAdapter,
)
from gesture_api.repositories.runtime_state import (
    BattleRuntimeStore,
    InMemoryBattleRuntimeStore,
    InMemoryMatchQueueStore,
    MatchQueueStore,
)
from gesture_api.settings import get_settings

DEFAULT_GAME_STATE_PATH = Path(__file__).resolve().parents[3] / ".runtime" / "game-state.json"


class InMemoryGameStateRepository:
    def __init__(
        self,
        persistence_path: Path | None = None,
        storage_adapter: GameStateStorageAdapter | None = None,
        queue_store: MatchQueueStore | None = None,
        battle_runtime_store: BattleRuntimeStore | None = None,
    ) -> None:
        self.storage_adapter = self._resolve_storage_adapter(
            persistence_path=persistence_path,
            storage_adapter=storage_adapter,
        )
        self.reset_runtime_state(
            storage_adapter=self.storage_adapter,
            queue_store=queue_store,
            battle_runtime_store=battle_runtime_store,
        )

    def reset_runtime_state(
        self,
        persistence_path: Path | None = None,
        storage_adapter: GameStateStorageAdapter | None = None,
        queue_store: MatchQueueStore | None = None,
        battle_runtime_store: BattleRuntimeStore | None = None,
    ) -> None:
        self.storage_adapter = self._resolve_storage_adapter(
            persistence_path=persistence_path,
            storage_adapter=storage_adapter,
        )
        self.queue_store = self._resolve_queue_store(queue_store)
        self.battle_runtime_store = self._resolve_battle_runtime_store(battle_runtime_store)
        self.players: dict[str, PlayerRecord] = {}
        self.match_history: list[dict[str, object]] = []
        self.match_audits: dict[str, list[dict[str, object]]] = {}
        self._load_persisted_state()
        self._ensure_practice_opponent()

    def _ensure_practice_opponent(self) -> None:
        if "pl_practice" in self.players:
            return
        self.players["pl_practice"] = PlayerRecord(
            player_id="pl_practice",
            guest_token="practice",
            nickname="Practice Rival",
            rating=1000,
            loadout_configured=True,
        )

    def get_match_audit(self, battle_session_id: str) -> list[dict[str, object]]:
        return list(self.match_audits.get(battle_session_id, []))

    def list_match_history(self, player_id: str) -> list[dict[str, object]]:
        return sorted(
            (row for row in self.match_history if row["player_id"] == player_id),
            key=lambda row: row["played_at"],
            reverse=True,
        )

    def list_leaderboard_players(self, limit: int = 20) -> list[PlayerRecord]:
        return sorted(
            self.players.values(),
            key=lambda player: player.rating,
            reverse=True,
        )[:limit]

    def create_guest_player(self, nickname: str) -> PlayerRecord:
        player_id = f"pl_{uuid4().hex[:10]}"
        player = PlayerRecord(
            player_id=player_id,
            guest_token=f"gt_{uuid4().hex[:16]}",
            nickname=nickname,
        )
        self.players[player.player_id] = player
        self._persist_state()
        return player

    def get_player(self, player_id: str) -> PlayerRecord | None:
        return self.players.get(player_id)

    def list_skillsets(self) -> list[object]:
        return SKILLSETS

    def list_animsets(self) -> list[object]:
        return ANIMSETS

    def update_loadout(
        self,
        player_id: str,
        skillset_id: str,
        animset_id: str,
    ) -> PlayerRecord | None:
        player = self.get_player(player_id)
        if player is None or find_skillset(skillset_id) is None or find_animset(animset_id) is None:
            return None
        player.equipped_skillset_id = skillset_id
        player.equipped_animset_id = animset_id
        player.loadout_configured = True
        self._persist_state()
        return player

    def enter_queue(
        self,
        player_id: str,
    ) -> tuple[str, datetime | None, BattleSession | None] | None:
        if player_id not in self.players:
            return None
        battle = self.get_player_battle(player_id)
        if battle is not None:
            return "MATCHED", None, battle
        queued_at = self.queue_store.get(player_id)
        if queued_at is not None:
            return "SEARCHING", queued_at, None
        queued_at = datetime.now(UTC)
        self.queue_store.add(player_id, queued_at)
        return "SEARCHING", queued_at, None

    def leave_queue(self, player_id: str) -> bool:
        return self.queue_store.remove(player_id) is not None

    def get_queue_entry(self, player_id: str) -> datetime | None:
        return self.queue_store.get(player_id)

    def get_player_battle(self, player_id: str) -> BattleSession | None:
        battle_id = self.battle_runtime_store.get_active_battle_id(player_id)
        if battle_id is None:
            return None
        battle = self.battle_runtime_store.get(battle_id)
        if battle is None or battle.status != "ACTIVE":
            return None
        return battle

    def get_battle(self, battle_session_id: str) -> BattleSession | None:
        return self.battle_runtime_store.get(battle_session_id)

    def get_latest_player_battle(self, player_id: str) -> BattleSession | None:
        battle_id = self.battle_runtime_store.get_latest_battle_id(player_id)
        if battle_id is None:
            return None
        return self.battle_runtime_store.get(battle_id)

    def create_match_for_player(
        self,
        player_id: str,
        *,
        allow_practice: bool = True,
    ) -> BattleSession | None:
        battle = self.get_player_battle(player_id)
        if battle is not None:
            return battle
        if self.queue_store.get(player_id) is None:
            return None
        queued_opponent_id = self._pick_queued_opponent(player_id)
        if queued_opponent_id is None and not allow_practice:
            return None
        opponent_id = queued_opponent_id if queued_opponent_id is not None else "pl_practice"
        self.queue_store.remove(player_id)
        if self.queue_store.get(opponent_id) is not None:
            self.queue_store.remove(opponent_id)
        if queued_opponent_id is not None:
            return self._create_battle(queued_opponent_id, player_id)
        return self._create_battle(player_id, opponent_id)

    def submit_action(
        self,
        battle_session_id: str,
        player_id: str,
        turn_number: int,
        action_id: str,
        gesture_sequence: list[str],
    ) -> tuple[str, BattleSession | None, str | None]:
        timed_out, battle, _ = self.resolve_timeout_if_due(battle_session_id)
        if timed_out:
            return "rejected", battle, "TURN_TIMEOUT"
        battle = self.get_battle(battle_session_id)
        if battle is None:
            return "rejected", None, "BATTLE_NOT_FOUND"
        if battle.status != "ACTIVE":
            return "rejected", battle, "BATTLE_NOT_ACTIVE"
        if action_id in battle.processed_action_ids:
            return "rejected", battle, "DUPLICATE_ACTION"
        if battle.turn_number != turn_number:
            return "rejected", battle, "INVALID_TURN"
        if not battle.is_turn_owner(player_id):
            return "rejected", battle, "NOT_YOUR_TURN"

        player = self.players[player_id]
        skillset = find_skillset(player.equipped_skillset_id)
        skill = skillset.find_skill_by_sequence(gesture_sequence) if skillset else None
        if skill is None:
            return "rejected", battle, "INVALID_GESTURE_SEQUENCE"

        actor = battle.participants[player_id]
        if not self._has_enough_mana(actor, skill):
            return "rejected", battle, "INSUFFICIENT_MANA"
        if self._is_skill_on_cooldown(actor, skill):
            return "rejected", battle, "SKILL_ON_COOLDOWN"

        battle.processed_action_ids.add(action_id)
        opponent_id = battle.opponent_of(player_id)
        opponent = battle.participants[opponent_id]
        actor.mana -= skill.mana_cost
        actor.cooldowns[skill.skill_id] = skill.cooldown_turn
        opponent.hp = max(0, opponent.hp - skill.damage)
        battle.battle_log.append(
            BattleLogEntry(
                turn_number=battle.turn_number,
                actor_player_id=player_id,
                message=f"{skill.skill_id} dealt {skill.damage}",
                created_at=datetime.now(UTC),
            )
        )

        if opponent.hp <= 0:
            self._finish_battle(
                battle,
                winner_player_id=player_id,
                loser_player_id=opponent_id,
                reason="HP_ZERO",
            )
        else:
            self._advance_turn(battle, next_player_id=opponent_id)
            if opponent_id == "pl_practice":
                self._resolve_practice_turn(
                    battle=battle,
                    opponent_id=opponent_id,
                    target_player_id=player_id,
                )

        return "accepted", battle, None

    def surrender(self, battle_session_id: str, player_id: str) -> BattleSession | None:
        timed_out, battle, _ = self.resolve_timeout_if_due(battle_session_id)
        if timed_out:
            return battle
        battle = self.get_battle(battle_session_id)
        if battle is None or battle.status != "ACTIVE":
            return battle
        self._finish_battle(
            battle,
            winner_player_id=battle.opponent_of(player_id),
            loser_player_id=player_id,
            reason="SURRENDER",
        )
        return battle

    def resolve_timeout_if_due(
        self,
        battle_session_id: str,
    ) -> tuple[bool, BattleSession | None, str | None]:
        battle = self.get_battle(battle_session_id)
        if battle is None or battle.status != "ACTIVE":
            return False, battle, None
        if datetime.now(UTC) < battle.action_deadline_at:
            return False, battle, None

        timed_out_player_id = battle.turn_owner_player_id
        winner_player_id = battle.opponent_of(timed_out_player_id)
        battle.battle_log.append(
            BattleLogEntry(
                turn_number=battle.turn_number,
                actor_player_id=timed_out_player_id,
                message=f"{timed_out_player_id} timed out",
                created_at=datetime.now(UTC),
            )
        )
        self._finish_battle(
            battle,
            winner_player_id=winner_player_id,
            loser_player_id=timed_out_player_id,
            reason="TIMEOUT",
        )
        return True, battle, timed_out_player_id

    def _pick_queued_opponent(self, player_id: str) -> str | None:
        for queued_id in self.queue_store.list_player_ids():
            if queued_id != player_id:
                return queued_id
        return None

    def _create_battle(self, player_id: str, opponent_id: str) -> BattleSession:
        match_id = f"match_{uuid4().hex[:10]}"
        battle_session_id = f"battle_{uuid4().hex[:10]}"
        battle = BattleSession(
            battle_session_id=battle_session_id,
            match_id=match_id,
            player_ids=(player_id, opponent_id),
            participants={
                player_id: BattleParticipant(player_id=player_id),
                opponent_id: BattleParticipant(player_id=opponent_id),
            },
            turn_owner_player_id=player_id,
        )
        self.battle_runtime_store.save(battle)
        self.battle_runtime_store.set_active_battle_id(player_id, battle_session_id)
        self.battle_runtime_store.set_active_battle_id(opponent_id, battle_session_id)
        self.battle_runtime_store.set_latest_battle_id(player_id, battle_session_id)
        self.battle_runtime_store.set_latest_battle_id(opponent_id, battle_session_id)
        return battle

    def _advance_turn(self, battle: BattleSession, next_player_id: str) -> None:
        battle.turn_number += 1
        battle.turn_owner_player_id = next_player_id
        battle.action_deadline_at = datetime.now(UTC) + timedelta(seconds=TURN_SECONDS)
        next_participant = battle.participants[next_player_id]
        next_participant.mana = min(100, next_participant.mana + 10)
        for skill_id, remaining in list(next_participant.cooldowns.items()):
            next_participant.cooldowns[skill_id] = max(0, remaining - 1)

    def _resolve_practice_turn(
        self,
        battle: BattleSession,
        opponent_id: str,
        target_player_id: str,
    ) -> None:
        if battle.status != "ACTIVE" or battle.turn_owner_player_id != opponent_id:
            return

        practice_player = self.players[opponent_id]
        skillset = find_skillset(practice_player.equipped_skillset_id)
        if skillset is None or not skillset.skills:
            self._advance_turn(battle, next_player_id=target_player_id)
            return

        skill = skillset.skills[0]
        actor = battle.participants[opponent_id]
        if not self._can_cast_skill(actor, skill):
            self._advance_turn(battle, next_player_id=target_player_id)
            return

        target = battle.participants[target_player_id]
        actor.mana = max(0, actor.mana - skill.mana_cost)
        actor.cooldowns[skill.skill_id] = skill.cooldown_turn
        target.hp = max(0, target.hp - skill.damage)
        battle.battle_log.append(
            BattleLogEntry(
                turn_number=battle.turn_number,
                actor_player_id=opponent_id,
                message=f"{skill.skill_id} dealt {skill.damage}",
                created_at=datetime.now(UTC),
            )
        )

        if target.hp <= 0:
            self._finish_battle(
                battle,
                winner_player_id=opponent_id,
                loser_player_id=target_player_id,
                reason="HP_ZERO",
            )
            return

        self._advance_turn(battle, next_player_id=target_player_id)

    @staticmethod
    def _has_enough_mana(actor: BattleParticipant, skill) -> bool:
        return actor.mana >= skill.mana_cost

    @staticmethod
    def _is_skill_on_cooldown(actor: BattleParticipant, skill) -> bool:
        return actor.cooldowns.get(skill.skill_id, 0) > 0

    def _can_cast_skill(self, actor: BattleParticipant, skill) -> bool:
        return self._has_enough_mana(actor, skill) and not self._is_skill_on_cooldown(actor, skill)

    def _finish_battle(
        self,
        battle: BattleSession,
        winner_player_id: str,
        loser_player_id: str,
        reason: str,
    ) -> None:
        winner = self.players[winner_player_id]
        loser = self.players[loser_player_id]
        rating_delta = calculate_elo_delta(winner.rating, loser.rating)
        winner.rating += rating_delta
        loser.rating -= rating_delta
        winner.wins += 1
        loser.losses += 1
        self.battle_runtime_store.clear_active_battle_id(winner_player_id)
        self.battle_runtime_store.clear_active_battle_id(loser_player_id)
        battle.status = "ENDED"
        battle.winner_player_id = winner_player_id
        battle.loser_player_id = loser_player_id
        battle.ended_reason = reason  # type: ignore[assignment]
        battle.rating_delta = rating_delta
        battle.action_deadline_at = datetime.now(UTC)
        played_at = datetime.now(UTC)
        for player_id, result in ((winner_player_id, "WIN"), (loser_player_id, "LOSE")):
            player = self.players[player_id]
            opponent_id = loser_player_id if player_id == winner_player_id else winner_player_id
            self.match_history.append(
                {
                    "match_id": battle.match_id,
                    "battle_session_id": battle.battle_session_id,
                    "player_id": player_id,
                    "opponent_id": opponent_id,
                    "result": result,
                    "skillset_id": player.equipped_skillset_id,
                    "rating_change": rating_delta if result == "WIN" else -rating_delta,
                    "rating_after": player.rating,
                    "ended_reason": reason,
                    "turn_count": battle.turn_number,
                    "played_at": played_at,
                }
            )
        self.match_audits[battle.battle_session_id] = [
            {
                "turn_number": entry.turn_number,
                "actor_player_id": entry.actor_player_id,
                "message": entry.message,
                "created_at": entry.created_at,
            }
            for entry in battle.battle_log
        ]
        self._persist_state()

    def _load_persisted_state(self) -> None:
        snapshot = self.storage_adapter.load()
        if snapshot is None:
            return

        self.players = {
            player.player_id: player
            for player in snapshot.players
        }
        self.match_history = snapshot.match_history
        self.match_audits = snapshot.match_audits

    def _persist_state(self) -> None:
        self.storage_adapter.save(
            GameStatePersistenceSnapshot(
                players=list(self.players.values()),
                match_history=self.match_history,
                match_audits=self.match_audits,
            )
        )

    def _resolve_storage_adapter(
        self,
        persistence_path: Path | None,
        storage_adapter: GameStateStorageAdapter | None,
    ) -> GameStateStorageAdapter:
        if storage_adapter is not None:
            return storage_adapter
        if persistence_path is not None:
            return JsonGameStateStorageAdapter(persistence_path)
        return NullGameStateStorageAdapter()

    def _resolve_queue_store(self, queue_store: MatchQueueStore | None) -> MatchQueueStore:
        if queue_store is not None:
            queue_store.reset()
            return queue_store
        return InMemoryMatchQueueStore()

    def _resolve_battle_runtime_store(
        self,
        battle_runtime_store: BattleRuntimeStore | None,
    ) -> BattleRuntimeStore:
        if battle_runtime_store is not None:
            battle_runtime_store.reset()
            return battle_runtime_store
        return InMemoryBattleRuntimeStore()


def create_default_game_state_storage_adapter() -> GameStateStorageAdapter:
    backend = get_settings().game_state_storage_backend.strip().lower()

    if backend == "sql":
        return SqlGameStateStorageAdapter(SessionLocal)
    if backend == "json":
        return JsonGameStateStorageAdapter(DEFAULT_GAME_STATE_PATH)
    if backend in {"ephemeral", "null"}:
        return NullGameStateStorageAdapter()
    raise ValueError(f"Unsupported game state storage backend: {backend}")


game_state_repository = InMemoryGameStateRepository(
    storage_adapter=create_default_game_state_storage_adapter()
)

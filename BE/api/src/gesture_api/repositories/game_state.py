from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from gesture_api.domain.catalog import ANIMSETS, SKILLSETS, find_animset, find_skillset
from gesture_api.domain.game import (
    BattleLogEntry,
    BattleParticipant,
    BattleSession,
    PlayerRecord,
    TURN_SECONDS,
)
from gesture_api.domain.rating import calculate_elo_delta


class InMemoryGameStateRepository:
    def __init__(self) -> None:
        self.players: dict[str, PlayerRecord] = {}
        self.queue: dict[str, datetime] = {}
        self.battles: dict[str, BattleSession] = {}
        self.player_battle_ids: dict[str, str] = {}
        self.match_history: list[dict[str, object]] = []
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

    def create_guest_player(self, nickname: str) -> PlayerRecord:
        player_id = f"pl_{uuid4().hex[:10]}"
        player = PlayerRecord(
            player_id=player_id,
            guest_token=f"gt_{uuid4().hex[:16]}",
            nickname=nickname,
        )
        self.players[player.player_id] = player
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
        return player

    def enter_queue(self, player_id: str) -> tuple[str, datetime | None, BattleSession | None] | None:
        if player_id not in self.players:
            return None
        battle = self.get_player_battle(player_id)
        if battle is not None:
            return "MATCHED", None, battle
        queued_at = self.queue.get(player_id)
        if queued_at is not None:
            return "SEARCHING", queued_at, None
        queued_at = datetime.now(UTC)
        self.queue[player_id] = queued_at
        return "SEARCHING", queued_at, None

    def leave_queue(self, player_id: str) -> bool:
        return self.queue.pop(player_id, None) is not None

    def get_queue_entry(self, player_id: str) -> datetime | None:
        return self.queue.get(player_id)

    def get_player_battle(self, player_id: str) -> BattleSession | None:
        battle_id = self.player_battle_ids.get(player_id)
        if battle_id is None:
            return None
        battle = self.battles.get(battle_id)
        if battle is None or battle.status != "ACTIVE":
            return None
        return battle

    def get_battle(self, battle_session_id: str) -> BattleSession | None:
        return self.battles.get(battle_session_id)

    def create_match_for_player(self, player_id: str) -> BattleSession | None:
        battle = self.get_player_battle(player_id)
        if battle is not None:
            return battle
        if player_id not in self.queue:
            return None
        opponent_id = self._pick_opponent(player_id)
        self.queue.pop(player_id, None)
        if opponent_id in self.queue:
            self.queue.pop(opponent_id, None)
        return self._create_battle(player_id, opponent_id)

    def submit_action(
        self,
        battle_session_id: str,
        player_id: str,
        turn_number: int,
        action_id: str,
        gesture_sequence: list[str],
    ) -> tuple[str, BattleSession | None, str | None]:
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
        if actor.mana < skill.mana_cost:
            return "rejected", battle, "INSUFFICIENT_MANA"
        if actor.cooldowns.get(skill.skill_id, 0) > 0:
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

    def _pick_opponent(self, player_id: str) -> str:
        for queued_id in self.queue:
            if queued_id != player_id:
                return queued_id
        return "pl_practice"

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
        self.battles[battle_session_id] = battle
        self.player_battle_ids[player_id] = battle_session_id
        self.player_battle_ids[opponent_id] = battle_session_id
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
        self.player_battle_ids.pop(winner_player_id, None)
        self.player_battle_ids.pop(loser_player_id, None)
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


game_state_repository = InMemoryGameStateRepository()

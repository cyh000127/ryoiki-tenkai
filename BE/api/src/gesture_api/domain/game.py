from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Literal

BattleStatus = Literal["ACTIVE", "ENDED"]
BattleResult = Literal["WIN", "LOSE"]
EndedReason = Literal["HP_ZERO", "SURRENDER", "TIMEOUT", "DISCONNECT"]

INITIAL_RATING = 1000
INITIAL_HP = 100
INITIAL_MANA = 100
TURN_SECONDS = 30


@dataclass
class SkillDefinition:
    skill_id: str
    name: str
    description: str
    gesture_sequence: list[str]
    mana_cost: int
    damage: int
    cooldown_turn: int


@dataclass
class SkillsetDefinition:
    skillset_id: str
    name: str
    skills: list[SkillDefinition]

    def find_skill_by_sequence(self, gesture_sequence: list[str]) -> SkillDefinition | None:
        return next(
            (skill for skill in self.skills if skill.gesture_sequence == gesture_sequence),
            None,
        )


@dataclass
class AnimsetDefinition:
    animset_id: str
    name: str


@dataclass
class PlayerRecord:
    player_id: str
    guest_token: str
    nickname: str
    rating: int = INITIAL_RATING
    wins: int = 0
    losses: int = 0
    equipped_skillset_id: str = "skillset_seal_basic"
    equipped_animset_id: str = "animset_basic_2d"
    loadout_configured: bool = False


@dataclass
class BattleParticipant:
    player_id: str
    hp: int = INITIAL_HP
    mana: int = INITIAL_MANA
    cooldowns: dict[str, int] = field(default_factory=dict)


@dataclass
class BattleLogEntry:
    turn_number: int
    actor_player_id: str
    message: str
    created_at: datetime


@dataclass
class BattleSession:
    battle_session_id: str
    match_id: str
    player_ids: tuple[str, str]
    participants: dict[str, BattleParticipant]
    turn_owner_player_id: str
    turn_number: int = 1
    status: BattleStatus = "ACTIVE"
    action_deadline_at: datetime = field(
        default_factory=lambda: datetime.now(UTC) + timedelta(seconds=TURN_SECONDS)
    )
    processed_action_ids: set[str] = field(default_factory=set)
    battle_log: list[BattleLogEntry] = field(default_factory=list)
    winner_player_id: str | None = None
    loser_player_id: str | None = None
    ended_reason: EndedReason | None = None
    rating_delta: int | None = None

    def opponent_of(self, player_id: str) -> str:
        first, second = self.player_ids
        return second if player_id == first else first

    def is_turn_owner(self, player_id: str) -> bool:
        return self.turn_owner_player_id == player_id

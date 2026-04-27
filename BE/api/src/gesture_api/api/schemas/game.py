from datetime import datetime
from typing import Literal

from gesture_api.api.schemas.base import ApiSchema
from gesture_api.domain.game import AnimsetDefinition, BattleSession, PlayerRecord, SkillDefinition
from pydantic import Field


class CreateGuestPlayerRequest(ApiSchema):
    nickname: str = Field(min_length=1, max_length=32)


class GuestPlayerResponse(ApiSchema):
    player_id: str
    guest_token: str
    rating: int

    @classmethod
    def from_record(cls, player: PlayerRecord) -> "GuestPlayerResponse":
        return cls(
            player_id=player.player_id,
            guest_token=player.guest_token,
            rating=player.rating,
        )


class PlayerProfileResponse(ApiSchema):
    player_id: str
    nickname: str
    rating: int
    wins: int
    losses: int
    equipped_skillset_id: str
    equipped_animset_id: str
    loadout_configured: bool

    @classmethod
    def from_record(cls, player: PlayerRecord) -> "PlayerProfileResponse":
        return cls.model_validate(player)


class SkillResponse(ApiSchema):
    skill_id: str
    name: str
    gesture_sequence: list[str]
    mana_cost: int
    damage: int
    cooldown_turn: int

    @classmethod
    def from_definition(cls, skill: SkillDefinition) -> "SkillResponse":
        return cls.model_validate(skill)


class SkillsetResponse(ApiSchema):
    skillset_id: str
    name: str
    skills: list[SkillResponse]


class AnimsetResponse(ApiSchema):
    animset_id: str
    name: str

    @classmethod
    def from_definition(cls, animset: AnimsetDefinition) -> "AnimsetResponse":
        return cls.model_validate(animset)


class UpdateLoadoutRequest(ApiSchema):
    skillset_id: str
    animset_id: str


class LoadoutResponse(ApiSchema):
    player_id: str
    equipped_skillset_id: str
    equipped_animset_id: str
    loadout_configured: bool

    @classmethod
    def from_record(cls, player: PlayerRecord) -> "LoadoutResponse":
        return cls(
            player_id=player.player_id,
            equipped_skillset_id=player.equipped_skillset_id,
            equipped_animset_id=player.equipped_animset_id,
            loadout_configured=player.loadout_configured,
        )


class QueueRequest(ApiSchema):
    mode: Literal["RANKED_1V1"]


class QueueStatusResponse(ApiSchema):
    queue_status: Literal["SEARCHING", "MATCHED", "IDLE"]
    queued_at: datetime | None = None
    match_id: str | None = None
    battle_session_id: str | None = None


class BattleParticipantResponse(ApiSchema):
    player_id: str
    hp: int
    mana: int
    cooldowns: dict[str, int]


class BattleLogResponse(ApiSchema):
    turn_number: int
    actor_player_id: str
    message: str
    created_at: datetime


class BattleStateResponse(ApiSchema):
    battle_session_id: str
    match_id: str
    status: Literal["ACTIVE", "ENDED"]
    turn_number: int
    turn_owner_player_id: str
    action_deadline_at: datetime
    self: BattleParticipantResponse
    opponent: BattleParticipantResponse
    battle_log: list[BattleLogResponse]
    winner_player_id: str | None = None
    loser_player_id: str | None = None
    ended_reason: str | None = None

    @classmethod
    def from_session(cls, battle: BattleSession, viewer_player_id: str) -> "BattleStateResponse":
        opponent_id = battle.opponent_of(viewer_player_id)
        return cls(
            battle_session_id=battle.battle_session_id,
            match_id=battle.match_id,
            status=battle.status,
            turn_number=battle.turn_number,
            turn_owner_player_id=battle.turn_owner_player_id,
            action_deadline_at=battle.action_deadline_at,
            self=BattleParticipantResponse.model_validate(
                battle.participants[viewer_player_id]
            ),
            opponent=BattleParticipantResponse.model_validate(battle.participants[opponent_id]),
            battle_log=[
                BattleLogResponse.model_validate(entry)
                for entry in battle.battle_log[-8:]
            ],
            winner_player_id=battle.winner_player_id,
            loser_player_id=battle.loser_player_id,
            ended_reason=battle.ended_reason,
        )


class SurrenderResponse(ApiSchema):
    battle_session_id: str
    status: Literal["ACTIVE", "ENDED"]
    result: Literal["WIN", "LOSE"] | None
    ended_reason: str | None

    @classmethod
    def from_session(cls, battle: BattleSession, player_id: str) -> "SurrenderResponse":
        result = None
        if battle.winner_player_id is not None:
            result = "WIN" if battle.winner_player_id == player_id else "LOSE"
        return cls(
            battle_session_id=battle.battle_session_id,
            status=battle.status,
            result=result,
            ended_reason=battle.ended_reason,
        )


class SubmitBattleActionRequest(ApiSchema):
    player_id: str
    turn_number: int
    action_id: str = Field(min_length=1)
    gesture_sequence: list[str] = Field(min_length=1)
    submitted_at: datetime


class BattleActionResponse(ApiSchema):
    battle_session_id: str
    turn_number: int
    action_id: str
    status: Literal["ACCEPTED", "REJECTED"]
    reason: str | None = None
    battle: BattleStateResponse | None = None


class MatchHistoryItemResponse(ApiSchema):
    match_id: str
    battle_session_id: str
    result: Literal["WIN", "LOSE"]
    skillset_id: str
    rating_change: int
    rating_after: int
    ended_reason: str
    turn_count: int
    played_at: datetime


class LeaderboardItemResponse(ApiSchema):
    rank: int
    player_id: str
    nickname: str
    rating: int


class WsTokenResponse(ApiSchema):
    ws_token: str
    expires_in: int

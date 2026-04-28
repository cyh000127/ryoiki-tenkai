from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from gesture_api.db.base import Base


class GamePlayerOrm(Base):
    __tablename__ = "game_players"

    player_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    guest_token: Mapped[str] = mapped_column(String(120), nullable=False)
    nickname: Mapped[str] = mapped_column(String(120), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    wins: Mapped[int] = mapped_column(Integer, nullable=False)
    losses: Mapped[int] = mapped_column(Integer, nullable=False)
    equipped_skillset_id: Mapped[str] = mapped_column(String(120), nullable=False)
    equipped_animset_id: Mapped[str] = mapped_column(String(120), nullable=False)
    loadout_configured: Mapped[bool] = mapped_column(Boolean, nullable=False)


class MatchHistoryOrm(Base):
    __tablename__ = "match_history"

    history_id: Mapped[str] = mapped_column(String(180), primary_key=True)
    match_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    battle_session_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    player_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    opponent_id: Mapped[str] = mapped_column(String(80), nullable=False)
    result: Mapped[str] = mapped_column(String(12), nullable=False)
    skillset_id: Mapped[str] = mapped_column(String(120), nullable=False)
    rating_change: Mapped[int] = mapped_column(Integer, nullable=False)
    rating_after: Mapped[int] = mapped_column(Integer, nullable=False)
    ended_reason: Mapped[str] = mapped_column(String(40), nullable=False)
    turn_count: Mapped[int] = mapped_column(Integer, nullable=False)
    played_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class MatchAuditOrm(Base):
    __tablename__ = "match_audits"

    audit_id: Mapped[str] = mapped_column(String(180), primary_key=True)
    battle_session_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    actor_player_id: Mapped[str] = mapped_column(String(80), nullable=False)
    message: Mapped[str] = mapped_column(String(240), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

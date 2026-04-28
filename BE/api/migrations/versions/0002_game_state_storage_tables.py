"""Create game state storage tables.

Revision ID: 0002_game_state_storage
Revises: 0001_initial
Create Date: 2026-04-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_game_state_storage"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "game_players",
        sa.Column("player_id", sa.String(length=80), primary_key=True),
        sa.Column("guest_token", sa.String(length=120), nullable=False),
        sa.Column("nickname", sa.String(length=120), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("wins", sa.Integer(), nullable=False),
        sa.Column("losses", sa.Integer(), nullable=False),
        sa.Column("equipped_skillset_id", sa.String(length=120), nullable=False),
        sa.Column("equipped_animset_id", sa.String(length=120), nullable=False),
        sa.Column("loadout_configured", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "match_history",
        sa.Column("history_id", sa.String(length=180), primary_key=True),
        sa.Column("match_id", sa.String(length=80), nullable=False),
        sa.Column("battle_session_id", sa.String(length=80), nullable=False),
        sa.Column("player_id", sa.String(length=80), nullable=False),
        sa.Column("opponent_id", sa.String(length=80), nullable=False),
        sa.Column("result", sa.String(length=12), nullable=False),
        sa.Column("skillset_id", sa.String(length=120), nullable=False),
        sa.Column("rating_change", sa.Integer(), nullable=False),
        sa.Column("rating_after", sa.Integer(), nullable=False),
        sa.Column("ended_reason", sa.String(length=40), nullable=False),
        sa.Column("turn_count", sa.Integer(), nullable=False),
        sa.Column("played_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_match_history_match_id", "match_history", ["match_id"])
    op.create_index(
        "ix_match_history_battle_session_id",
        "match_history",
        ["battle_session_id"],
    )
    op.create_index("ix_match_history_player_id", "match_history", ["player_id"])
    op.create_table(
        "match_audits",
        sa.Column("audit_id", sa.String(length=180), primary_key=True),
        sa.Column("battle_session_id", sa.String(length=80), nullable=False),
        sa.Column("turn_number", sa.Integer(), nullable=False),
        sa.Column("actor_player_id", sa.String(length=80), nullable=False),
        sa.Column("message", sa.String(length=240), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_match_audits_battle_session_id", "match_audits", ["battle_session_id"])


def downgrade() -> None:
    op.drop_index("ix_match_audits_battle_session_id", table_name="match_audits")
    op.drop_table("match_audits")
    op.drop_index("ix_match_history_player_id", table_name="match_history")
    op.drop_index("ix_match_history_battle_session_id", table_name="match_history")
    op.drop_index("ix_match_history_match_id", table_name="match_history")
    op.drop_table("match_history")
    op.drop_table("game_players")

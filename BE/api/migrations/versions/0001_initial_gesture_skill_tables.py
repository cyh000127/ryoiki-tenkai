"""Create initial gesture skill tables.

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-27
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gesture_definitions",
        sa.Column("gesture_definition_id", sa.String(length=36), primary_key=True),
        sa.Column("gesture_key", sa.String(length=80), nullable=False, unique=True),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("min_confidence", sa.Float(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "user_gesture_mappings",
        sa.Column("mapping_id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=80), nullable=False),
        sa.Column("gesture_key", sa.String(length=80), nullable=False),
        sa.Column("skill_action_key", sa.String(length=120), nullable=False),
        sa.Column("context_scope", sa.String(length=80), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_user_gesture_mappings_lookup",
        "user_gesture_mappings",
        ["user_id", "gesture_key", "context_scope", "enabled"],
    )
    op.create_table(
        "recognition_sessions",
        sa.Column("session_id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=80), nullable=False),
        sa.Column("model_version", sa.String(length=80), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("frames_processed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_latency_ms", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_recognition_sessions_user_started",
        "recognition_sessions",
        ["user_id", "started_at"],
    )
    op.create_table(
        "skill_execution_logs",
        sa.Column("execution_log_id", sa.String(length=36), primary_key=True),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=80), nullable=False),
        sa.Column("gesture_key", sa.String(length=80), nullable=False),
        sa.Column("skill_action_key", sa.String(length=120), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("result_status", sa.String(length=40), nullable=False),
        sa.Column("reject_reason", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_skill_execution_logs_session", "skill_execution_logs", ["session_id"])
    op.create_index(
        "ix_skill_execution_logs_user_created",
        "skill_execution_logs",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_skill_execution_logs_user_created", table_name="skill_execution_logs")
    op.drop_index("ix_skill_execution_logs_session", table_name="skill_execution_logs")
    op.drop_table("skill_execution_logs")
    op.drop_index("ix_recognition_sessions_user_started", table_name="recognition_sessions")
    op.drop_table("recognition_sessions")
    op.drop_index("ix_user_gesture_mappings_lookup", table_name="user_gesture_mappings")
    op.drop_table("user_gesture_mappings")
    op.drop_table("gesture_definitions")

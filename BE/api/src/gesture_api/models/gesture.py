from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from gesture_api.db.base import Base


class GestureDefinitionOrm(Base):
    __tablename__ = "gesture_definitions"

    gesture_definition_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    gesture_key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    min_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UserGestureMappingOrm(Base):
    __tablename__ = "user_gesture_mappings"

    mapping_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    gesture_key: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    skill_action_key: Mapped[str] = mapped_column(String(120), nullable=False)
    context_scope: Mapped[str] = mapped_column(String(80), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class RecognitionSessionOrm(Base):
    __tablename__ = "recognition_sessions"

    session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    model_version: Mapped[str] = mapped_column(String(80), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    frames_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


class SkillExecutionLogOrm(Base):
    __tablename__ = "skill_execution_logs"

    execution_log_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    gesture_key: Mapped[str] = mapped_column(String(80), nullable=False)
    skill_action_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    result_status: Mapped[str] = mapped_column(String(40), nullable=False)
    reject_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

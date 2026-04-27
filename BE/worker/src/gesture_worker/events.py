from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class SkillExecutionEvent:
    event_id: str
    session_id: str
    user_id: str
    skill_action_key: str
    created_at: datetime

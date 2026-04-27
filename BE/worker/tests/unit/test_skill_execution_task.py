from datetime import UTC, datetime

from gesture_worker.events import SkillExecutionEvent
from gesture_worker.tasks.skill_execution import describe_skill_execution


def test_describes_skill_execution_event() -> None:
    event = SkillExecutionEvent(
        event_id="event-1",
        session_id="session-1",
        user_id="user-1",
        skill_action_key="skill.confirm",
        created_at=datetime.now(UTC),
    )

    assert describe_skill_execution(event) == "session-1:skill.confirm"

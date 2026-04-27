from gesture_worker.events import SkillExecutionEvent


def describe_skill_execution(event: SkillExecutionEvent) -> str:
    return f"{event.session_id}:{event.skill_action_key}"

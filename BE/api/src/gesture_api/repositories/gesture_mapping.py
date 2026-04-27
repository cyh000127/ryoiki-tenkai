from gesture_api.models.gesture import UserGestureMappingOrm
from sqlalchemy import select
from sqlalchemy.orm import Session

DEFAULT_SKILL_ACTIONS = {
    "open_palm": "skill_mode.open",
    "closed_fist": "skill.cancel",
    "pinch": "skill.confirm",
    "thumb_up": "skill.quick_use",
    "swipe_left": "skill.previous",
    "swipe_right": "skill.next",
}


class GestureMappingRepository:
    def __init__(self, session: Session | None) -> None:
        self._session = session

    def find_skill_action(
        self,
        user_id: str,
        gesture_key: str,
        context_scope: str = "default",
    ) -> str | None:
        if self._session is None:
            return DEFAULT_SKILL_ACTIONS.get(gesture_key)

        stmt = (
            select(UserGestureMappingOrm)
            .where(UserGestureMappingOrm.user_id == user_id)
            .where(UserGestureMappingOrm.gesture_key == gesture_key)
            .where(UserGestureMappingOrm.context_scope == context_scope)
            .where(UserGestureMappingOrm.enabled.is_(True))
            .order_by(UserGestureMappingOrm.priority.asc())
        )
        mapping = self._session.scalar(stmt)
        if mapping is None:
            return DEFAULT_SKILL_ACTIONS.get(gesture_key)
        return mapping.skill_action_key

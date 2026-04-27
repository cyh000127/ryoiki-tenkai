SUPPORTED_GESTURE_KEYS = {
    "open_palm",
    "closed_fist",
    "pinch",
    "thumb_up",
    "swipe_left",
    "swipe_right",
}


def is_supported_gesture(gesture_key: str) -> bool:
    return gesture_key in SUPPORTED_GESTURE_KEYS

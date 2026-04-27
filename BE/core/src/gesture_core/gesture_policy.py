DEFAULT_MIN_CONFIDENCE = 0.65


def is_confident(confidence: float, threshold: float = DEFAULT_MIN_CONFIDENCE) -> bool:
    if confidence < 0 or confidence > 1:
        raise ValueError("confidence must be between 0 and 1")
    return confidence >= threshold

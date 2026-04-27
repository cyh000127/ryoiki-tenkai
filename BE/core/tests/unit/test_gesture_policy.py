import pytest
from gesture_core.gesture_policy import is_confident


def test_accepts_confidence_at_threshold() -> None:
    assert is_confident(0.65)


def test_rejects_confidence_below_threshold() -> None:
    assert not is_confident(0.64)


def test_rejects_out_of_range_confidence() -> None:
    with pytest.raises(ValueError, match="confidence"):
        is_confident(1.1)

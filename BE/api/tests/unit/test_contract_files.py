import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_openapi_contract_contains_gesture_command_operation() -> None:
    contract = json.loads((ROOT / "contracts/openapi/admin-api.json").read_text(encoding="utf-8"))

    assert "/gesture-commands" in contract["paths"]
    assert contract["paths"]["/gesture-commands"]["post"]["operationId"] == "createGestureCommand"


def test_async_event_schema_keeps_required_fields() -> None:
    schema = json.loads(
        (ROOT / "contracts/async/skill-execution-event.schema.json").read_text(encoding="utf-8")
    )

    assert "skillActionKey" in schema["required"]
    assert schema["properties"]["createdAt"]["format"] == "date-time"

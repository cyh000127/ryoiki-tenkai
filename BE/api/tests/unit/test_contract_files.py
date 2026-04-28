import json
import re
from pathlib import Path

from gesture_api.domain.catalog import SKILLSETS

ROOT = Path(__file__).resolve().parents[2]


def test_openapi_contract_covers_mvp_rest_surface() -> None:
    contract = json.loads((ROOT / "contracts/openapi/admin-api.json").read_text(encoding="utf-8"))

    assert {
        "/api/v1/players/guest",
        "/api/v1/players/me",
        "/api/v1/skillsets",
        "/api/v1/animsets",
        "/api/v1/players/me/loadout",
        "/api/v1/matchmaking/queue",
        "/api/v1/matchmaking/status",
        "/api/v1/battles/{battleSessionId}",
        "/api/v1/battles/{battleSessionId}/actions",
        "/api/v1/battles/{battleSessionId}/surrender",
        "/api/v1/matches/history",
        "/api/v1/ratings/leaderboard",
        "/api/v1/ws-token",
        "/gesture-commands",
    }.issubset(contract["paths"])

    assert contract["paths"]["/api/v1/animsets"]["get"]["operationId"] == "listAnimsets"
    assert (
        contract["paths"]["/api/v1/battles/{battleSessionId}/surrender"]["post"]["operationId"]
        == "surrenderBattle"
    )
    assert (
        "loadoutConfigured"
        in contract["components"]["schemas"]["PlayerProfileResponse"]["required"]
    )
    assert "loadoutConfigured" in contract["components"]["schemas"]["LoadoutResponse"]["required"]
    assert "/gesture-commands" in contract["paths"]
    assert contract["paths"]["/gesture-commands"]["post"]["operationId"] == "createGestureCommand"
    assert {"skillsetId", "animsetId"} == set(
        contract["components"]["schemas"]["UpdateLoadoutRequest"]["required"]
    )


def test_async_event_schema_keeps_required_fields() -> None:
    schema = json.loads(
        (ROOT / "contracts/async/skill-execution-event.schema.json").read_text(encoding="utf-8")
    )

    assert "skillActionKey" in schema["required"]
    assert schema["properties"]["createdAt"]["format"] == "date-time"


def test_battle_websocket_contract_contains_core_events() -> None:
    schema = json.loads(
        (ROOT / "contracts/async/battle-websocket-event.schema.json").read_text(
            encoding="utf-8"
        )
    )

    event_types = {option["properties"]["type"]["const"] for option in schema["oneOf"]}

    assert {
        "battle.ping",
        "battle.submit_action",
        "battle.match_ready",
        "battle.match_found",
        "battle.started",
        "battle.pong",
        "battle.action_result",
        "battle.state_updated",
        "battle.timeout",
        "battle.surrendered",
        "battle.ended",
        "battle.error",
    }.issubset(event_types)

    started_event = next(
        option
        for option in schema["oneOf"]
        if option["properties"]["type"]["const"] == "battle.started"
    )

    assert {"battleSessionId", "playerSeat", "battle"} == set(
        started_event["properties"]["payload"]["required"]
    )


def test_mvp_gesture_catalog_fixture_defines_normalized_token_set() -> None:
    contract = json.loads(
        (ROOT / "contracts/catalog/mvp-gesture-catalog.json").read_text(encoding="utf-8")
    )

    assert contract["tokenSetId"] == "mvp_gesture_tokens_v1"
    token_values = [token["token"] for token in contract["normalizedGestureTokens"]]

    assert len(token_values) == len(set(token_values))
    assert all(re.fullmatch(r"[a-z0-9_]+", token) for token in token_values)
    assert len(contract["skillsets"]) >= 1
    assert len(contract["skillsets"][0]["skills"]) >= 3

    allowed_tokens = set(token_values)
    for skillset in contract["skillsets"]:
        for skill in skillset["skills"]:
            assert set(skill["gestureSequence"]).issubset(allowed_tokens)


def test_backend_skill_catalog_matches_shared_mvp_gesture_fixture() -> None:
    contract = json.loads(
        (ROOT / "contracts/catalog/mvp-gesture-catalog.json").read_text(encoding="utf-8")
    )

    serialized_skillsets = [
        {
            "skillsetId": skillset.skillset_id,
            "name": skillset.name,
            "skills": [
                {
                    "skillId": skill.skill_id,
                    "name": skill.name,
                    "gestureSequence": skill.gesture_sequence,
                    "manaCost": skill.mana_cost,
                    "damage": skill.damage,
                    "cooldownTurn": skill.cooldown_turn,
                }
                for skill in skillset.skills
            ],
        }
        for skillset in SKILLSETS
    ]

    assert serialized_skillsets == contract["skillsets"]

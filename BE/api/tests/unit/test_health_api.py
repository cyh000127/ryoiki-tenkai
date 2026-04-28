import json

from fastapi.testclient import TestClient
from gesture_api.main import create_app


def test_health_response_returns_safe_runtime_summary() -> None:
    client = TestClient(create_app())

    response = client.get("/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "status": "ok",
        "runtime": {
            "appEnv": "local",
            "database": "configured",
            "stateStorage": "json",
            "persistencePolicy": "adapter_required",
            "recognitionDataBoundary": "raw_recognition_data_not_persisted",
            "recognizerRuntime": "blocked_until_selected",
            "skillDomainSource": "blocked_until_approved",
        },
    }


def test_health_response_does_not_expose_database_details() -> None:
    client = TestClient(create_app())

    payload_text = json.dumps(client.get("/healthz").json())

    assert "postgresql" not in payload_text
    assert "localhost:5432" not in payload_text
    assert "app:app" not in payload_text

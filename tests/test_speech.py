import pytest
from fastapi.testclient import TestClient
from src.image_analytics.api import app

client = TestClient(app)

def test_speech_synthesize_success():
    response = client.post(
        "/api/v1/speech/synthesize",
        data={"text": "Hello, this is a test AI answer."}
    )
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["text"] == "Hello, this is a test AI answer."
    assert "backend" in data

def test_speech_synthesize_empty_text():
    response = client.post(
        "/api/v1/speech/synthesize",
        data={"text": "   "}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Text parameter cannot be empty."

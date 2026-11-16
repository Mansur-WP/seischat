"""Authenticated chat WebSocket tests."""

from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from tests.test_auth import csrf_headers


def test_websocket_requires_authentication(client: TestClient) -> None:
    try:
        with client.websocket_connect("/ws/chat"):
            pass
    except WebSocketDisconnect as error:
        assert error.code == 1008


def test_websocket_persists_and_broadcasts_messages(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "ada", "password": "correct horse"},
        headers=csrf_headers(client),
    )
    client.post(
        "/api/auth/login",
        json={"username": "ada", "password": "correct horse"},
        headers=csrf_headers(client),
    )
    with client.websocket_connect("/ws/chat") as websocket:
        assert websocket.receive_json()["event"] == "online_users"
        websocket.send_json(
            {"event": "send_message", "payload": {"content": "Hello"}}
        )
        event = websocket.receive_json()
        assert event["event"] == "new_message"
        assert event["payload"]["content"] == "Hello"

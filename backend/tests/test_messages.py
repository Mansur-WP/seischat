"""Message history and ownership tests."""

from fastapi.testclient import TestClient

from tests.test_auth import csrf_headers


def authenticated_client(client: TestClient, username: str) -> TestClient:
    client.post(
        "/api/auth/register",
        json={"username": username, "password": "correct horse"},
        headers=csrf_headers(client),
    )
    client.post(
        "/api/auth/login",
        json={"username": username, "password": "correct horse"},
        headers=csrf_headers(client),
    )
    return client


def test_message_history_and_delete(client: TestClient) -> None:
    authenticated_client(client, "ada")
    history = client.get("/api/messages")
    assert history.status_code == 200
    assert history.json()["messages"] == []

    from app.database.connection import SessionLocal
    from app.models import Message, User

    with SessionLocal() as db:
        user = db.query(User).filter_by(username="ada").one()
        message = Message(user_id=user.id, content="Hello")
        db.add(message)
        db.commit()
        message_id = str(message.id)

    history = client.get("/api/messages")
    assert history.json()["messages"][0]["content"] == "Hello"
    deleted = client.delete(
        f"/api/messages/{message_id}", headers=csrf_headers(client)
    )
    assert deleted.status_code == 204
    assert client.get("/api/messages").json()["messages"] == []

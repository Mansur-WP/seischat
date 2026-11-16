"""Authentication and CSRF integration tests."""

from fastapi.testclient import TestClient


def csrf_headers(client: TestClient) -> dict[str, str]:
    token = client.get("/api/auth/csrf").json()["csrf_token"]
    return {"X-CSRF-Token": token}


def test_authentication_lifecycle(client: TestClient) -> None:
    headers = csrf_headers(client)
    registered = client.post(
        "/api/auth/register",
        json={"username": "Ada", "password": "correct horse"},
        headers=headers,
    )
    assert registered.status_code == 201
    assert registered.json()["user"]["username"] == "ada"

    logged_in = client.post(
        "/api/auth/login",
        json={"username": "ada", "password": "correct horse"},
        headers=csrf_headers(client),
    )
    assert logged_in.status_code == 200
    assert "seischat_session" in client.cookies

    current = client.get("/api/auth/me")
    assert current.status_code == 200
    assert current.json()["user"]["username"] == "ada"

    logged_out = client.post("/api/auth/logout", headers=csrf_headers(client))
    assert logged_out.status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_state_changes_require_matching_csrf_token(client: TestClient) -> None:
    client.get("/api/auth/csrf")
    response = client.post(
        "/api/auth/register",
        json={"username": "ada", "password": "correct horse"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "csrf_failed"

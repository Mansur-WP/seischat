# SeisChat backend

The backend is a FastAPI modular monolith providing authentication, persistent
messaging, online presence, and WebSocket chat. It uses SQLAlchemy and Alembic
with PostgreSQL in deployed environments.

## Folder structure

- `app/main.py` creates the FastAPI application and configures CORS.
- `app/core/config.py` loads environment-backed settings.
- `app/database/connection.py` creates the SQLAlchemy engine and request
  session dependency.
- `app/models.py` defines users, server sessions, and messages.
- `app/api/routes/` contains health, auth, message, and presence routes.
- `app/websocket.py` authenticates `/ws/chat` and manages live presence.
- `migrations/versions/` contains the initial schema revision.
- `tests/` contains API and WebSocket tests using an in-memory SQLite database.

## Local setup

From the repository root, open PowerShell and run:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

`.env` is local-only and is ignored by Git. Set `DATABASE_URL` to a
PostgreSQL database you own locally. `FRONTEND_ORIGIN` must exactly match the
browser origin, which is `http://localhost:5173` for the current Vite setup.
Local development uses `CSRF_SECURE=false`; production must use HTTPS and set
`CSRF_SECURE=true`.

## Run the API

```powershell
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/health`. A successful response is:

```json
{"status": "ok"}
```

The health endpoint reports only application availability; it does not expose
database credentials or infrastructure details.

## Run migrations

```powershell
alembic upgrade head
```

## Run tests

```powershell
pytest
```

The tests use an in-memory SQLite database and do not require PostgreSQL.

To create a later revision from `backend`:

```powershell
alembic revision --autogenerate -m "Describe the schema change"
alembic upgrade head
```

To undo the latest applied revision:

```powershell
alembic downgrade -1
```

`migrations/env.py` loads the same `DATABASE_URL` setting as the application
and imports all models before reading `Base.metadata`.

## Authentication and CSRF

Call `GET /api/auth/csrf` before state-changing requests. It returns
`{"csrf_token": "..."}` and sets the `seischat_csrf` cookie. Send the same
value in `X-CSRF-Token`. The session cookie is `seischat_session`; it is
HttpOnly, SameSite=Lax, Path=/, and Secure when `CSRF_SECURE=true` or the
application environment is `production`. CSRF failures return HTTP 403 with
`{"error":{"code":"csrf_failed","message":"csrf_failed"}}`.

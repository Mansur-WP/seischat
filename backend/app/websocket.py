"""Authenticated chat WebSocket and in-memory connection manager."""

import json
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.api.dependencies import is_expired
from sqlalchemy import select

from app.core.config import get_settings
from app.database.connection import SessionLocal
from app.models import Message, Session as UserSession, User
from app.security import token_hash


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)
        self.users: dict[str, User] = {}

    def connect(self, user: User, websocket: WebSocket) -> None:
        self.connections[str(user.id)].add(websocket)
        self.users[str(user.id)] = user

    def disconnect(self, user: User, websocket: WebSocket) -> None:
        key = str(user.id)
        self.connections[key].discard(websocket)
        if not self.connections[key]:
            self.connections.pop(key, None)
            self.users.pop(key, None)

    def online_users(self) -> list[User]:
        return sorted(self.users.values(), key=lambda user: user.username)

    async def broadcast(self, event: str, payload: dict) -> None:
        message = json.dumps({"event": event, "payload": payload})
        stale: list[tuple[str, WebSocket]] = []
        for user_id, sockets in list(self.connections.items()):
            for websocket in list(sockets):
                try:
                    await websocket.send_text(message)
                except (RuntimeError, WebSocketDisconnect):
                    stale.append((user_id, websocket))
        for user_id, websocket in stale:
            sockets = self.connections.get(user_id)
            if sockets:
                sockets.discard(websocket)


connection_manager = ConnectionManager()


def authenticate_websocket(websocket: WebSocket) -> User | None:
    raw_token = websocket.cookies.get(get_settings().session_cookie_name)
    if not raw_token:
        return None
    with SessionLocal() as db:
        session = db.scalar(
            select(UserSession)
            .where(UserSession.token_hash == token_hash(raw_token))
            .where(UserSession.revoked_at.is_(None))
        )
        if not session or is_expired(session.expires_at):
            return None
        return session.user


async def chat_socket(websocket: WebSocket) -> None:
    user = authenticate_websocket(websocket)
    if not user:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    connection_manager.connect(user, websocket)
    await connection_manager.broadcast(
        "online_users",
        {"users": [UserResponse.model_validate(item, from_attributes=True).model_dump(mode="json")
                   for item in connection_manager.online_users()]},
    )
    try:
        while True:
            incoming = await websocket.receive_json()
            if incoming.get("event") != "send_message":
                await websocket.send_json({"event": "error", "payload": {
                    "code": "invalid_event", "message": "Unsupported chat event."
                }})
                continue
            content = incoming.get("payload", {}).get("content")
            if not isinstance(content, str) or not content.strip() or len(content.strip()) > 2000:
                await websocket.send_json({"event": "error", "payload": {
                    "code": "invalid_message", "message": "Message content is invalid."
                }})
                continue
            with SessionLocal() as db:
                message = Message(user_id=user.id, content=content.strip())
                db.add(message)
                db.commit()
                db.refresh(message)
                payload = {
                    "id": str(message.id),
                    "user": {"id": str(user.id), "username": user.username},
                    "content": message.content,
                    "created_at": message.created_at.isoformat(),
                }
            await connection_manager.broadcast("new_message", payload)
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(user, websocket)
        await connection_manager.broadcast(
            "online_users",
            {"users": [UserResponse.model_validate(item, from_attributes=True).model_dump(mode="json")
                       for item in connection_manager.online_users()]},
        )


from app.schemas import UserResponse


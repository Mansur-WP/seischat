"""REST message history and deletion endpoints."""

import base64
import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_csrf
from app.database.connection import get_db
from app.models import Message, User
from app.schemas import MessageResponse, MessagesResponse, UserResponse

router = APIRouter(prefix="/api/messages", tags=["messages"])


def encode_cursor(message: Message) -> str:
    value = json.dumps({"created_at": message.created_at.isoformat(), "id": str(message.id)})
    return base64.urlsafe_b64encode(value.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, UUID]:
    try:
        value = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        return datetime.fromisoformat(value["created_at"]), UUID(value["id"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="invalid_cursor") from None


def message_response(message: Message) -> MessageResponse:
    user = UserResponse.model_validate(message.user, from_attributes=True)
    return MessageResponse(
        id=message.id, user=user, content=message.content, created_at=message.created_at
    )


@router.get("", response_model=MessagesResponse)
def list_messages(
    cursor: str | None = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessagesResponse:
    if not 1 <= limit <= 100:
        raise HTTPException(status_code=422, detail="invalid_limit")
    statement = select(Message).join(Message.user).order_by(Message.created_at, Message.id)
    if cursor:
        created_at, message_id = decode_cursor(cursor)
        statement = statement.where(
            or_(Message.created_at > created_at,
                and_(Message.created_at == created_at, Message.id > message_id))
        )
    messages = list(db.scalars(statement.limit(limit + 1)).all())
    has_more = len(messages) > limit
    messages = messages[:limit]
    return MessagesResponse(
        messages=[message_response(message) for message in messages],
        next_cursor=encode_cursor(messages[-1]) if has_more and messages else None,
    )


@router.delete("/{message_id}", status_code=204)
async def delete_message(
    message_id: UUID,
    response: Response,
    _: None = Depends(require_csrf),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="message_not_found")
    if message.user_id != user.id:
        raise HTTPException(status_code=403, detail="message_not_owned")
    db.delete(message)
    db.commit()
    response.headers["X-Deleted-Message-Id"] = str(message_id)
    from app.websocket import connection_manager

    await connection_manager.broadcast(
        "message_deleted", {"message_id": str(message_id)}
    )

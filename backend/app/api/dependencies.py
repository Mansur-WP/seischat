"""Shared request dependencies for authentication and CSRF protection."""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.connection import get_db
from app.models import Session as UserSession, User
from app.security import token_hash


def is_expired(expires_at: datetime) -> bool:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= datetime.now(timezone.utc)


def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> User:
    settings = get_settings()
    raw_token = request.cookies.get(settings.session_cookie_name)
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthenticated")
    session = db.scalar(
        select(UserSession)
        .where(UserSession.token_hash == token_hash(raw_token))
        .where(UserSession.revoked_at.is_(None))
    )
    if not session or is_expired(session.expires_at):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthenticated")
    return session.user


def require_csrf(request: Request) -> None:
    settings = get_settings()
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    header_token = request.headers.get("X-CSRF-Token")
    if not cookie_token or not header_token:
        raise HTTPException(status_code=403, detail="csrf_failed")
    if len(cookie_token) != len(header_token):
        raise HTTPException(status_code=403, detail="csrf_failed")
    import hmac

    if not hmac.compare_digest(cookie_token, header_token):
        raise HTTPException(status_code=403, detail="csrf_failed")

"""Authentication and CSRF endpoints."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_csrf
from app.core.config import get_settings
from app.database.connection import get_db
from app.models import Session as UserSession, User
from app.schemas import Credentials, LoginResponse, UserEnvelope, UserResponse
from app.security import hash_password, new_csrf_token, new_token, token_hash, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def user_response(user: User) -> UserResponse:
    return UserResponse.model_validate(user, from_attributes=True)


def set_auth_cookies(response: Response, session_token: str, csrf_token: str) -> None:
    settings = get_settings()
    secure = settings.csrf_secure or settings.app_environment == "production"
    response.set_cookie(
        settings.session_cookie_name, session_token, httponly=True, secure=secure,
        samesite="lax", path="/", max_age=settings.session_ttl_minutes * 60,
    )
    response.set_cookie(
        settings.csrf_cookie_name, csrf_token, httponly=False, secure=secure,
        samesite="lax", path="/", max_age=settings.session_ttl_minutes * 60,
    )


@router.get("/csrf")
def csrf(response: Response) -> dict[str, str]:
    token = new_csrf_token()
    settings = get_settings()
    secure = settings.csrf_secure or settings.app_environment == "production"
    response.set_cookie(
        settings.csrf_cookie_name, token, httponly=False, secure=secure,
        samesite="lax", path="/", max_age=settings.session_ttl_minutes * 60,
    )
    return {"csrf_token": token}


@router.post("/register", response_model=UserEnvelope, status_code=201)
def register(
    credentials: Credentials,
    response: Response,
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> UserEnvelope:
    if db.scalar(select(User).where(User.username == credentials.username)):
        from fastapi import HTTPException

        raise HTTPException(status_code=409, detail="username_taken")
    user = User(username=credentials.username, password_hash=hash_password(credentials.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserEnvelope(user=user_response(user))


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: Credentials,
    response: Response,
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> LoginResponse:
    from fastapi import HTTPException

    user = db.scalar(select(User).where(User.username == credentials.username))
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.session_ttl_minutes)
    raw_token = new_token()
    db.add(UserSession(user_id=user.id, token_hash=token_hash(raw_token), expires_at=expires_at))
    db.commit()
    set_auth_cookies(response, raw_token, new_csrf_token())
    return LoginResponse(user=user_response(user), expires_at=expires_at)


@router.get("/me", response_model=UserEnvelope)
def me(user: User = Depends(get_current_user)) -> UserEnvelope:
    return UserEnvelope(user=user_response(user))


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    _: None = Depends(require_csrf),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    settings = get_settings()
    raw_token = request.cookies.get(settings.session_cookie_name)
    session = db.scalar(
        select(UserSession).where(UserSession.user_id == user.id).where(
            UserSession.token_hash == token_hash(raw_token or "")
        )
    )
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")

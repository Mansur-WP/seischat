"""Online user presence endpoint."""

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.models import User
from app.schemas import OnlineUsersResponse, UserResponse
from app.websocket import connection_manager

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/online", response_model=OnlineUsersResponse)
def online_users(_: User = Depends(get_current_user)) -> OnlineUsersResponse:
    users = [
        UserResponse.model_validate(user, from_attributes=True)
        for user in connection_manager.online_users()
    ]
    return OnlineUsersResponse(users=users)

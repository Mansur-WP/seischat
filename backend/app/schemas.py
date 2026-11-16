"""Pydantic request and response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        value = value.strip().lower()
        if not value.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may contain letters, numbers, underscores, and hyphens.")
        return value


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    username: str
    created_at: datetime


class UserEnvelope(BaseModel):
    user: UserResponse


class LoginResponse(UserEnvelope):
    expires_at: datetime


class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    user: UserResponse
    content: str
    created_at: datetime


class MessagesResponse(BaseModel):
    messages: list[MessageResponse]
    next_cursor: str | None


class MessagePayload(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message content cannot be empty.")
        return value


class OnlineUsersResponse(BaseModel):
    users: list[UserResponse]

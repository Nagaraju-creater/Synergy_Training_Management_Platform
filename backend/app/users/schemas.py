from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str
    role_id: Optional[UUID] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[UUID] = None
    is_active: Optional[bool] = None

class UserUpdateMe(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    onboarding_completed: Optional[bool] = None
    never_show_welcome_back: Optional[bool] = None


class UserResponse(UserBase):
    id: UUID
    role_id: Optional[UUID] = None
    role: Optional[str] = None
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    onboarding_completed: bool = False
    never_show_welcome_back: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("role", mode="before")
    @classmethod
    def transform_role(cls, v: Any) -> Optional[str]:
        if v and not isinstance(v, str):
            return getattr(v, "name", str(v))
        return v

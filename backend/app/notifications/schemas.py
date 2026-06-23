from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.notifications.models import NotificationType


class NotificationCreate(BaseModel):
    user_id: UUID
    title: str
    message: str
    notification_type: NotificationType = NotificationType.INFO
    action_url: Optional[str] = None


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    action_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

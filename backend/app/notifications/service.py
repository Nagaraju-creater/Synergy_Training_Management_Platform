from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.notifications.models import Notification
from app.notifications.schemas import NotificationCreate
from app.utils.exceptions import NotFoundException
from app.utils.pagination import paginate
from app.utils.email import send_email

class NotificationService:
    @staticmethod
    async def get_for_user(db: AsyncSession, user_id: UUID, page: int, per_page: int):
        return await paginate(
            db, Notification, page, per_page,
            filters=(Notification.user_id == user_id),
            sort_by="created_at",
            descending=True
        )

    @staticmethod
    async def mark_read(db: AsyncSession, notification_id: UUID, user_id: UUID) -> Notification:
        n = await db.get(Notification, notification_id)
        if not n or n.user_id != user_id:
            raise NotFoundException("Notification")
        n.is_read = True
        await db.flush()
        return n

    @staticmethod
    async def create(
        db: AsyncSession, 
        user_id: UUID, 
        title: str, 
        message: str, 
        notification_type: str = "info",
        action_url: Optional[str] = None,
        email_to: Optional[str] = None,
        email_subject: Optional[str] = None,
        email_body: Optional[str] = None
    ) -> Notification:
        n = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url
        )
        db.add(n)
        await db.flush()
        
        # Trigger email if provided
        if email_to:
            subject = email_subject or title
            body = email_body
            if not body:
                body = f"""
                <h2>{title}</h2>
                <p>{message}</p>
                {f'<a href="{action_url}">View Details</a>' if action_url else ""}
                """
            await send_email(email_to, subject, body)
            
        return n

    @staticmethod
    async def notify_manager(db: AsyncSession, manager_user_id: UUID, title: str, message: str, action_url: str):
        # Helper to notify a manager
        await NotificationService.create(db, manager_user_id, title, message, "warning", action_url)

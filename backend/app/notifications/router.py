from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.notifications.schemas import NotificationResponse
from app.notifications.service import NotificationService
from app.utils.response import paginated_response, success_response
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items, total = await NotificationService.get_for_user(db, current_user.id, page, per_page)
    return paginated_response(
        [NotificationResponse.model_validate(i).model_dump() for i in items],
        total, page, per_page,
    )


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    n = await NotificationService.mark_read(db, notification_id, current_user.id)
    return success_response(NotificationResponse.model_validate(n).model_dump(), "Marked as read")

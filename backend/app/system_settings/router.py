from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_role, get_current_user
from app.utils.response import success_response
from app.system_settings.models import SystemSetting
from app.system_settings.schemas import SettingsUpdate

router = APIRouter()

@router.get("/")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = await db.execute(select(SystemSetting))
    settings = result.scalars().all()
    settings_dict = {s.key: s.value for s in settings}
    
    # Defaults if missing
    if "onboarding_behavior" not in settings_dict:
        settings_dict["onboarding_behavior"] = "first_login_only"
        
    return success_response({"settings": settings_dict})

@router.patch("/")
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    for key, value in payload.settings.items():
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = str(value)
        else:
            setting = SystemSetting(key=key, value=str(value))
            db.add(setting)
    
    await db.commit()
    
    # Return updated
    result = await db.execute(select(SystemSetting))
    settings = result.scalars().all()
    settings_dict = {s.key: s.value for s in settings}
    return success_response({"settings": settings_dict}, "Settings updated")

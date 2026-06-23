from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.models import User
from app.users.schemas import UserCreate, UserResponse, UserUpdate, UserUpdateMe
from app.users.service import UserService
from app.utils.response import paginated_response, success_response
from app.database import get_db
from app.dependencies import get_current_user, require_role
from fastapi import File, UploadFile
import os
import shutil
import uuid

router = APIRouter()


@router.get("/")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    users, total = await UserService.get_all(db, current_user, page, per_page)
    results = []
    for u in users:
        data = UserResponse.model_validate(u).model_dump()
        data["role"] = u.role.name if u.role else None
        results.append(data)
        
    return paginated_response(results, total, page, per_page)


@router.post("/", status_code=201)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = await UserService.create(db, payload)
    data = UserResponse.model_validate(user).model_dump()
    data["role"] = user.role.name if user.role else None
    return success_response(data, "User created", 201)


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    data = UserResponse.model_validate(current_user).model_dump()
    data["role"] = current_user.role.name if current_user.role else None
    if current_user.employee:
        from app.employees.schemas import EmployeeResponse
        data["employee"] = EmployeeResponse.model_validate(current_user.employee).model_dump()
    return success_response(data)


@router.patch("/me")
async def update_me(
    payload: UserUpdateMe,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await UserService.update(db, current_user.id, payload)
    data = UserResponse.model_validate(user).model_dump()
    data["role"] = user.role.name if user.role else None
    return success_response(data, "Profile updated")


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.storage import storage_service
    avatar_id = str(current_user.employee_id) if current_user.employee_id else str(current_user.id)
    avatar_url = await storage_service.upload_avatar(avatar_id, file)
    
    user = await UserService.update(db, current_user.id, UserUpdateMe(avatar_url=avatar_url))
    
    data = UserResponse.model_validate(user).model_dump()
    data["role"] = user.role.name if user.role else None
    return success_response(data, "Avatar updated")


@router.get("/{user_id}")
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    user = await UserService.get_by_id(db, user_id)
    data = UserResponse.model_validate(user).model_dump()
    data["role"] = user.role.name if user.role else None
    return success_response(data)


@router.patch("/{user_id}")
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = await UserService.update(db, user_id, payload)
    data = UserResponse.model_validate(user).model_dump()
    data["role"] = user.role.name if user.role else None
    return success_response(data, "User updated")



class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await UserService.change_password(db, current_user.id, payload.old_password, payload.new_password)
    return success_response(None, "Password updated successfully")


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    await UserService.delete(db, user_id)

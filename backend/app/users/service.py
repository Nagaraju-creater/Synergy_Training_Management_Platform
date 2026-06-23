from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.models import User
from app.users.schemas import UserCreate, UserUpdate
from fastapi import HTTPException
from app.utils.exceptions import ConflictException, NotFoundException
from app.utils.pagination import paginate

import bcrypt

class UserService:
    @staticmethod
    def hash_password(password: str) -> str:
        # bcrypt.hashpw expects bytes
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            return False

    @staticmethod
    async def get_all(db: AsyncSession, current_user, page: int = 1, per_page: int = 20):
        from sqlalchemy import select, or_
        from sqlalchemy.orm import selectinload
        from app.employees.models import Employee
        from app.utils.pagination import paginate_query
        
        user_role = current_user.role.name.lower() if current_user.role else ""
        
        stmt = select(User).options(selectinload(User.role)).where(User.deleted_at == None)
        
        if user_role == "admin":
            pass
        elif user_role == "manager":
            # Users associated with employees in manager's team
            stmt = stmt.join(Employee, User.id == Employee.user_id).where(
                or_(
                    Employee.manager_id == current_user.employee_id,
                    Employee.id == current_user.employee_id
                )
            )
        else:
            stmt = stmt.where(User.id == current_user.id)
            
        return await paginate_query(db, stmt, page, per_page)

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: UUID) -> User:
        user = await db.get(User, user_id)
        if not user:
            raise NotFoundException("User")
        return user

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> User:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException("User")
        return user

    @staticmethod
    async def create(db: AsyncSession, payload: UserCreate) -> User:
        from fastapi.concurrency import run_in_threadpool
        normalized_email = payload.email.strip().lower()
        result = await db.execute(select(User).where(User.email == normalized_email))
        if result.scalar_one_or_none():
            raise ConflictException("Email already registered")
        
        hashed = await run_in_threadpool(UserService.hash_password, payload.password)
        user = User(
            email=normalized_email,
            full_name=payload.full_name,
            role_id=payload.role_id,
            hashed_password=hashed,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user, ["id", "created_at", "updated_at"])
        return user

    @staticmethod
    async def change_password(db: AsyncSession, user_id: UUID, old_password: str, new_password: str) -> None:
        user = await UserService.get_by_id(db, user_id)
        
        from fastapi.concurrency import run_in_threadpool
        is_valid = await run_in_threadpool(UserService.verify_password, old_password, user.hashed_password)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid old password")
        
        user.hashed_password = await run_in_threadpool(UserService.hash_password, new_password)
        db.add(user)
        await db.flush()

    @staticmethod
    async def update(db: AsyncSession, user_id: UUID, payload: UserUpdate) -> User:
        user = await UserService.get_by_id(db, user_id)
        for key, value in payload.model_dump(exclude_none=True).items():
            setattr(user, key, value)
        await db.flush()
        await db.refresh(user, ["updated_at"])
        return user

    @staticmethod
    async def delete(db: AsyncSession, user_id: UUID) -> None:
        user = await UserService.get_by_id(db, user_id)
        await db.delete(user)

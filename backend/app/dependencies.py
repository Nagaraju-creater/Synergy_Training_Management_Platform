from uuid import UUID
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.jwt_service import JWTService
from app.users.models import User
from app.database import get_db

security = HTTPBearer(auto_error=False)
jwt_service = JWTService()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials missing",
        )
    
    token = credentials.credentials
    payload = jwt_service.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if not user_id:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user information",
        )

    # Use selectinload to eagerly load relationships (including nested employee relationships)
    from app.employees.models import Employee as EmployeeModel
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.role),
            selectinload(User.employee).selectinload(EmployeeModel.department),
            selectinload(User.employee).selectinload(EmployeeModel.manager),
        )
        .where(User.id == UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    # Attach employee_id for easy access
    user.employee_id = user.employee.id if user.employee else None
    
    return user


async def get_current_employee(current_user: User = Depends(get_current_user)) -> EmployeeModel:
    if not current_user.employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not associated with an employee record"
        )
    return current_user.employee


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_role(*roles: str):
    """Factory that returns a dependency enforcing one of the given roles."""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.role:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no assigned role",
            )
            
        user_role = current_user.role.name.lower()
        if user_role not in [r.lower() for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of these roles: {', '.join(roles)}",
            )
        return current_user

    return role_checker

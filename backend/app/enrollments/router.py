from typing import List, Tuple, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.enrollments.schemas import EnrollmentCreate, EnrollmentResponse, EnrollmentUpdate, WithdrawRequest
from app.enrollments.service import EnrollmentService
from app.utils.response import paginated_response, success_response
from app.database import get_db
from app.dependencies import get_current_user, require_role

router = APIRouter()


@router.get("")
@router.get("/")
async def list_enrollments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    training_id: Optional[UUID] = Query(None),
    employee_id: UUID = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items, total = await EnrollmentService.get_all(db, page, per_page, current_user, training_id, employee_id, status)
    return paginated_response(
        [EnrollmentResponse.model_validate(i).model_dump() for i in items],
        total, page, per_page,
    )


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def enroll(
    payload: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    e = await EnrollmentService.create(db, payload)
    return success_response(EnrollmentResponse.model_validate(e).model_dump(), "Enrolled", 201)


@router.get("/{enrollment_id}")
async def get_enrollment(
    enrollment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.employees.models import Employee
    from sqlalchemy import select, or_

    e = await EnrollmentService.get_by_id(db, enrollment_id)
    
    user_role = current_user.role.name.lower() if current_user.role else ""
    if user_role == "admin":
        return success_response(EnrollmentResponse.model_validate(e).model_dump())

    # Check ownership
    if e.employee_id == current_user.employee_id:
        return success_response(EnrollmentResponse.model_validate(e).model_dump())

    if user_role == "manager":
        # Check if nominee is in manager's team
        res = await db.execute(
            select(Employee.manager_id).where(Employee.id == e.employee_id)
        )
        manager_id = res.scalar()
        if manager_id == current_user.employee_id:
            return success_response(EnrollmentResponse.model_validate(e).model_dump())

    raise HTTPException(status_code=403, detail="You do not have access to this enrollment")


@router.patch("/{enrollment_id}")
async def update_enrollment(
    enrollment_id: UUID,
    payload: EnrollmentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "manager", "trainer")),
):
    e = await EnrollmentService.update(db, enrollment_id, payload)
    return success_response(EnrollmentResponse.model_validate(e).model_dump(), "Enrollment updated")


@router.post("/{enrollment_id}/cancel")
async def cancel_enrollment(
    enrollment_id: UUID,
    payload: WithdrawRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from sqlalchemy import select
    from app.employees.models import Employee
    from fastapi import HTTPException
    
    # Fetch the enrollment first to verify ownership
    e = await EnrollmentService.get_by_id(db, enrollment_id)
    user_role = current_user.role.name.lower() if current_user.role else ""
    
    if user_role != "admin":
        # Find employee_id for current user
        res = await db.execute(select(Employee.id).where(Employee.user_id == current_user.id))
        emp_id = res.scalar_one_or_none()
        if e.employee_id != emp_id:
            raise HTTPException(status_code=403, detail="You can only withdraw your own enrollments")
            
    e = await EnrollmentService.withdraw(db, enrollment_id, payload.reason)
    return success_response(EnrollmentResponse.model_validate(e).model_dump(), "Enrollment withdrawn")

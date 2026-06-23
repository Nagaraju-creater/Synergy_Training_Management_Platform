import os
import shutil
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.effectiveness.schemas import (
    EffectivenessCreate,
    EffectivenessResponse,
    EffectivenessUpdate,
    EffectivenessReview,
)
from app.effectiveness.service import EffectivenessService
from app.utils.response import paginated_response, success_response
from app.database import get_db
from app.dependencies import get_current_user, require_role

router = APIRouter()


@router.get("/stats")
async def get_effectiveness_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager")),
):
    """Returns admin KPI statistics for the effectiveness dashboard."""
    stats = await EffectivenessService.get_stats(db)
    return success_response(stats)



@router.get("/")
async def list_effectiveness(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    training_id: UUID = Query(None),
    department_id: UUID = Query(None),
    employee_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = {}
    if status: filters["status"] = status
    if training_id: filters["training_id"] = training_id
    if department_id: filters["department_id"] = department_id
    if employee_id: filters["employee_id"] = employee_id
    
    items, total = await EffectivenessService.get_all(db, current_user, page, per_page, filters)
    return paginated_response(
        [EffectivenessResponse.model_validate(i).model_dump() for i in items],
        total, page, per_page,
    )


@router.post("/", status_code=201)
async def record_effectiveness(
    payload: EffectivenessCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager", "trainer", "employee")),
):
    e = await EffectivenessService.create(db, payload, current_user.id)
    return success_response(
        EffectivenessResponse.model_validate(e).model_dump(), "Effectiveness recorded", 201
    )


@router.get("/{eff_id}")
async def get_effectiveness(
    eff_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.enrollments.models import Enrollment
    from app.employees.models import Employee
    from sqlalchemy import select

    e = await EffectivenessService.get_by_id(db, eff_id)
    
    # Ownership Check
    user_role = current_user.role.name.lower() if current_user.role else ""
    if user_role == "admin":
        return success_response(EffectivenessResponse.model_validate(e).model_dump())

    # Get enrollment for ownership
    stmt = select(Enrollment).where(Enrollment.id == e.enrollment_id)
    enr = (await db.execute(stmt)).scalar_one_or_none()
    
    if enr:
        if enr.employee_id == current_user.employee_id:
            return success_response(EffectivenessResponse.model_validate(e).model_dump())
        
        if user_role == "manager":
            res = await db.execute(select(Employee.manager_id).where(Employee.id == enr.employee_id))
            manager_id = res.scalar()
            if manager_id == current_user.employee_id:
                return success_response(EffectivenessResponse.model_validate(e).model_dump())

    raise HTTPException(status_code=403, detail="Access denied")


@router.patch("/{eff_id}")
async def update_effectiveness(
    eff_id: UUID,
    payload: EffectivenessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.enrollments.models import Enrollment
    from sqlalchemy import select

    e = await EffectivenessService.get_by_id(db, eff_id)
    user_role = current_user.role.name.lower() if current_user.role else ""

    # Employees can only update their own records
    if user_role not in ("admin", "manager", "trainer"):
        enr_stmt = select(Enrollment).where(Enrollment.id == e.enrollment_id)
        enr = (await db.execute(enr_stmt)).scalar_one_or_none()
        if not enr or enr.employee_id != current_user.employee_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="You can only update your own assessments")

    e = await EffectivenessService.update(db, eff_id, payload)
    return success_response(
        EffectivenessResponse.model_validate(e).model_dump(), "Effectiveness updated"
    )


@router.post("/{eff_id}/review")
async def review_effectiveness(
    eff_id: UUID,
    payload: EffectivenessReview,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager")),
):
    e = await EffectivenessService.review(db, eff_id, payload, current_user.id)
    return success_response(
        EffectivenessResponse.model_validate(e).model_dump(), "Review submitted"
    )


@router.post("/signature")
async def upload_signature(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    from app.services.storage import storage_service
    signature_url = await storage_service.upload_signature(str(current_user.id), file)
    return success_response({"url": signature_url}, "Signature uploaded")

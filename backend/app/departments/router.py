from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.departments.schemas import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.departments.service import DepartmentService
from app.utils.response import paginated_response, success_response
from app.database import get_db
from app.dependencies import get_current_user, require_role

router = APIRouter()


@router.get("/")
async def list_departments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    depts, total = await DepartmentService.get_all(db, page, per_page)
    return paginated_response(
        [DepartmentResponse.model_validate(d).model_dump() for d in depts],
        total, page, per_page,
    )


@router.post("/", status_code=201)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    dept = await DepartmentService.create(db, payload)
    return success_response(
        DepartmentResponse.model_validate(dept).model_dump(), "Department created", 201
    )


@router.get("/{dept_id}")
async def get_department(
    dept_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    dept = await DepartmentService.get_by_id(db, dept_id)
    return success_response(DepartmentResponse.model_validate(dept).model_dump())


@router.patch("/{dept_id}")
async def update_department(
    dept_id: UUID,
    payload: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    dept = await DepartmentService.update(db, dept_id, payload)
    return success_response(
        DepartmentResponse.model_validate(dept).model_dump(), "Department updated"
    )


@router.delete("/{dept_id}", status_code=204)
async def delete_department(
    dept_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    await DepartmentService.delete(db, dept_id)


@router.get("/{dept_id}/analytics")
async def get_department_analytics(
    dept_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    analytics = await DepartmentService.get_analytics(db, dept_id)
    return success_response(analytics)

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.employees.schemas import EmployeeCreate, EmployeeResponse, EmployeeStatusUpdate, EmployeeUpdate
from app.employees.service import EmployeeService
from app.utils.response import paginated_response, success_response
from app.database import get_db
from app.dependencies import get_current_user, require_role

router = APIRouter()


@router.get("/")
async def list_employees(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=1000),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department_id: Optional[UUID] = Query(None),
    manager_id: Optional[UUID] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    employees, total = await EmployeeService.get_all(
        db, current_user, page, per_page, search, status, department_id, manager_id, sort_by, sort_order
    )
    return paginated_response(
        [EmployeeResponse.model_validate(e).model_dump() for e in employees],
        total, page, per_page,
    )


@router.get("/managers")
async def list_managers(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    managers = await EmployeeService.get_managers(db, current_user)
    return success_response(
        [EmployeeResponse.model_validate(m).model_dump() for m in managers],
        "Managers retrieved successfully"
    )


@router.get("/export")
async def export_employees(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    csv_bytes = await EmployeeService.export_csv(db, current_user)
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=employees.csv"},
    )


@router.get("/import-template")
async def get_import_template(_=Depends(get_current_user)):
    csv_bytes = EmployeeService.get_csv_template()
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=employee_import_template.csv"},
    )


@router.post("/import")
async def import_employees(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager")),
):
    result = await EmployeeService.bulk_import_csv(db, file, current_user.id)
    msg = f"Import complete: {result.get('created', 0)} created, {result.get('updated', 0)} updated, {len(result['errors'])} errors"
    return success_response(result, msg)


@router.post("/", status_code=201)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager")),
):
    emp = await EmployeeService.create(db, payload, current_user.id)
    return success_response(
        EmployeeResponse.model_validate(emp).model_dump(), "Employee created", 201
    )


@router.get("/{employee_id}")
async def get_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_role = current_user.role.name.lower() if current_user.role else ""
    
    # Ownership Check
    if user_role != "admin":
        if employee_id != current_user.employee_id:
            # Check if it's a team member
            from app.employees.models import Employee
            from sqlalchemy import select
            res = await db.execute(select(Employee.manager_id).where(Employee.id == employee_id))
            manager_id = res.scalar()
            if manager_id != current_user.employee_id:
                raise HTTPException(status_code=403, detail="Access denied")

    emp = await EmployeeService.get_by_id(db, employee_id)
    return success_response(EmployeeResponse.model_validate(emp).model_dump())


@router.patch("/{employee_id}")
async def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager")),
):
    emp = await EmployeeService.update(db, employee_id, payload, current_user.id)
    return success_response(EmployeeResponse.model_validate(emp).model_dump(), "Employee updated")


@router.patch("/{employee_id}/status")
async def update_employee_status(
    employee_id: UUID,
    payload: EmployeeStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager")),
):
    emp = await EmployeeService.toggle_status(db, employee_id, payload.status, current_user.id)
    return success_response(EmployeeResponse.model_validate(emp).model_dump(), f"Status updated to {payload.status.value}")


@router.post("/{employee_id}/avatar")
async def upload_avatar(
    employee_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager")),
):
    emp = await EmployeeService.upload_avatar(db, employee_id, file, current_user.id)
    return success_response(EmployeeResponse.model_validate(emp).model_dump(), "Avatar uploaded")


@router.delete("/{employee_id}", status_code=204)
async def delete_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    await EmployeeService.delete(db, employee_id, current_user.id)

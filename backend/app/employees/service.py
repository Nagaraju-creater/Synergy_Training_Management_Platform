import csv
import io
import os
import shutil
import uuid as uuid_module
from datetime import date, datetime
from typing import Optional, List, Tuple
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.employees.models import Employee, EmploymentStatus
from app.employees.schemas import EmployeeCreate, EmployeeUpdate
from app.audit.models import AuditLog
from app.users.models import User
from app.utils.exceptions import ConflictException, NotFoundException

UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class EmployeeService:

    @staticmethod
    async def _base_query(db: AsyncSession):
        return (
            select(Employee)
            .options(selectinload(Employee.department), selectinload(Employee.manager))
        )

    @staticmethod
    async def get_all(
        db: AsyncSession,
        current_user,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        department_id: Optional[str] = None,
        manager_id: Optional[UUID] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[Employee], int]:
        user_role = current_user.role.name.lower() if current_user.role else ""
        
        base_stmt = select(Employee).where(Employee.deleted_at == None)

        # --- Role-based Scoping ---
        if user_role == "admin":
            # Admin sees all
            pass
        elif user_role == "manager":
            # Manager sees team and self
            base_stmt = base_stmt.where(
                or_(
                    Employee.manager_id == current_user.employee_id,
                    Employee.id == current_user.employee_id
                )
            )
        else:
            # Employee sees only self
            base_stmt = base_stmt.where(Employee.id == current_user.employee_id)

        # --- Filtering ---
        if search:
            term = f"%{search}%"
            base_stmt = base_stmt.where(
                or_(
                    Employee.first_name.ilike(term),
                    Employee.last_name.ilike(term),
                    Employee.email.ilike(term),
                    Employee.employee_code.ilike(term),
                    Employee.designation.ilike(term),
                )
            )
        if status:
            base_stmt = base_stmt.where(Employee.status == status)
        if department_id:
            base_stmt = base_stmt.where(Employee.department_id == department_id)
        if manager_id:
            base_stmt = base_stmt.where(Employee.manager_id == manager_id)

        # --- Count ---
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = (await db.execute(count_stmt)).scalar_one()

        # --- Sorting ---
        stmt = base_stmt.options(selectinload(Employee.department), selectinload(Employee.manager))
        col = getattr(Employee, sort_by, Employee.created_at)
        if sort_order == "asc":
            stmt = stmt.order_by(col.asc())
        else:
            stmt = stmt.order_by(col.desc())

        # --- Pagination ---
        offset = (page - 1) * per_page
        stmt = stmt.offset(offset).limit(per_page)

        result = await db.execute(stmt)
        return result.scalars().all(), total

    @staticmethod
    async def get_managers(db: AsyncSession, current_user) -> List[Employee]:
        user_role = current_user.role.name.lower() if current_user.role else ""
        emp_id = current_user.employee_id
        
        stmt = (
            select(Employee)
            .options(selectinload(Employee.department), selectinload(Employee.manager))
            .where(Employee.deleted_at == None, Employee.status == EmploymentStatus.ACTIVE)
        )
        
        if user_role == "admin":
            pass
        elif user_role == "manager":
            # Managers can see other managers (to select their own)
            # Or maybe just everyone who has a manager role?
            # For simplicity, let's allow managers to see all managers.
            pass
        else:
            # Employees can only see their own manager
            if current_user.employee and current_user.employee.manager_id:
                stmt = stmt.where(Employee.id == current_user.employee.manager_id)
            else:
                return []

        stmt = stmt.order_by(Employee.first_name.asc())
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, employee_id: UUID) -> Employee:
        stmt = (
            select(Employee)
            .options(selectinload(Employee.department), selectinload(Employee.manager))
            .where(Employee.id == employee_id, Employee.deleted_at == None)
        )
        result = await db.execute(stmt)
        emp = result.scalar_one_or_none()
        if not emp:
            raise NotFoundException("Employee")
        return emp

    @staticmethod
    async def create(db: AsyncSession, payload: EmployeeCreate, actor_id: Optional[UUID] = None) -> Employee:
        result = await db.execute(
            select(Employee).where(
                or_(
                    Employee.employee_code == payload.employee_code,
                    func.lower(Employee.email) == payload.email.lower(),
                )
            )
        )
        existing = result.scalars().first()
        if existing:
            if existing.employee_code == payload.employee_code:
                raise ConflictException(f"Employee code '{payload.employee_code}' is already in use.")
            else:
                raise ConflictException(f"Email '{payload.email}' is already in use.")

        # Create/Link User
        from app.roles.models import Role
        from app.users.service import UserService
        
        # Find employee role
        role_result = await db.execute(select(Role).where(Role.name.ilike("employee")))
        role = role_result.scalar_one_or_none()
        
        # Check if user exists
        user_result = await db.execute(select(User).where(func.lower(User.email) == payload.email.lower()))
        user = user_result.scalar_one_or_none()
        
        if not user:
            from fastapi.concurrency import run_in_threadpool
            # Create user with default password
            user = User(
                email=payload.email,
                full_name=f"{payload.first_name} {payload.last_name}",
                role_id=role.id if role else None,
                hashed_password=await run_in_threadpool(UserService.hash_password, "Welcome@123"),
                is_active=True
            )
            db.add(user)
            await db.flush()
            await db.refresh(user, ["id", "created_at", "updated_at"])
        
        emp = Employee(**payload.model_dump())
        emp.user_id = user.id
        db.add(emp)
        await db.flush()
        await db.refresh(emp, ["id", "created_at", "updated_at"])

        # Audit log
        db.add(AuditLog(
            user_id=actor_id, action="employee_created",
            entity_type="employee", entity_id=emp.id,
            details={"employee_code": emp.employee_code, "email": emp.email},
        ))
        await db.flush()
        # Reload with relationships
        return await EmployeeService.get_by_id(db, emp.id)

    @staticmethod
    async def update(db: AsyncSession, employee_id: UUID, payload: EmployeeUpdate, actor_id: Optional[UUID] = None) -> Employee:
        emp = await EmployeeService.get_by_id(db, employee_id)
        changes = {}
        for k, v in payload.model_dump(exclude_none=True).items():
            old = getattr(emp, k)
            if old != v:
                changes[k] = {"from": str(old), "to": str(v)}
            setattr(emp, k, v)
        await db.flush()
        await db.refresh(emp, ["updated_at"])

        if changes:
            db.add(AuditLog(
                user_id=actor_id, action="employee_updated",
                entity_type="employee", entity_id=emp.id,
                details={"changes": changes},
            ))
        return await EmployeeService.get_by_id(db, emp.id)

    @staticmethod
    async def toggle_status(db: AsyncSession, employee_id: UUID, status: EmploymentStatus, actor_id: Optional[UUID] = None) -> Employee:
        emp = await EmployeeService.get_by_id(db, employee_id)
        old_status = emp.status
        emp.status = status
        await db.flush()
        await db.refresh(emp, ["updated_at"])

        db.add(AuditLog(
            user_id=actor_id, action="employee_status_changed",
            entity_type="employee", entity_id=emp.id,
            details={"from": old_status.value, "to": status.value},
        ))
        return await EmployeeService.get_by_id(db, emp.id)

    @staticmethod
    async def delete(db: AsyncSession, employee_id: UUID, actor_id: Optional[UUID] = None) -> None:
        # Get employee with user relationship
        stmt = select(Employee).options(selectinload(Employee.user)).where(Employee.id == employee_id)
        res = await db.execute(stmt)
        emp = res.scalar_one_or_none()
        
        if not emp:
            raise NotFoundException("Employee")

        # Capture details for audit log
        details = {"employee_code": emp.employee_code, "email": emp.email, "type": "hard_delete"}
        
        # Hard delete the associated user if exists
        if emp.user:
            await db.delete(emp.user)
            
        # Hard delete the employee
        await db.delete(emp)
            
        db.add(AuditLog(
            user_id=actor_id, action="employee_deleted",
            entity_type="employee", entity_id=employee_id,
            details=details,
        ))
        await db.flush()

    @staticmethod
    async def upload_avatar(db: AsyncSession, employee_id: UUID, file: UploadFile, actor_id: Optional[UUID] = None) -> Employee:
        emp = await EmployeeService.get_by_id(db, employee_id)
        from app.services.storage import storage_service
        avatar_url = await storage_service.upload_avatar(str(employee_id), file)
        emp.profile_image_url = avatar_url
        await db.flush()
        await db.refresh(emp, ["updated_at"])
        return await EmployeeService.get_by_id(db, emp.id)


    @staticmethod
    async def bulk_import_csv(db: AsyncSession, file: UploadFile, actor_id: Optional[UUID] = None) -> dict:
        content = (await file.read()).decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
        created = 0
        updated = 0
        errors = []
        seen_codes = set()
        seen_emails = set()

        for i, row in enumerate(reader, start=2):
            try:
                emp_code = row["employee_code"].strip()
                emp_email = row["email"].strip().lower()

                if emp_code in seen_codes or emp_email in seen_emails:
                    errors.append({"row": i, "error": "Duplicate entry in the file ignored"})
                    continue

                seen_codes.add(emp_code)
                seen_emails.add(emp_email)

                joining = None
                if row.get("date_of_joining"):
                    joining = datetime.strptime(row["date_of_joining"].strip(), "%Y-%m-%d").date()

                # Check if employee already exists in db
                result = await db.execute(
                    select(Employee).where(
                        or_(
                            Employee.employee_code == emp_code,
                            func.lower(Employee.email) == emp_email,
                        )
                    )
                )
                existing_emp = result.scalars().first()

                if existing_emp:
                    # Reactivate if it was soft-deleted
                    if existing_emp.deleted_at is not None:
                        existing_emp.deleted_at = None
                        existing_emp.status = EmploymentStatus.ACTIVE

                    update_payload = EmployeeUpdate(
                        first_name=row["first_name"].strip(),
                        last_name=row["last_name"].strip(),
                        designation=row.get("designation", "").strip() or None,
                        phone=row.get("phone", "").strip() or None,
                        location=row.get("location", "").strip() or None,
                        legal_entity=row.get("legal_entity", "").strip() or None,
                        date_of_joining=joining,
                        status=EmploymentStatus(row.get("status", "active").strip()),
                    )
                    # We use a direct update here because get_by_id (used in update()) would filter out deleted records
                    for k, v in update_payload.model_dump(exclude_none=True).items():
                        setattr(existing_emp, k, v)
                    await db.flush()
                    updated += 1
                else:
                    payload = EmployeeCreate(
                        employee_code=emp_code,
                        first_name=row["first_name"].strip(),
                        last_name=row["last_name"].strip(),
                        email=row["email"].strip(),
                        designation=row.get("designation", "").strip() or None,
                        phone=row.get("phone", "").strip() or None,
                        location=row.get("location", "").strip() or None,
                        legal_entity=row.get("legal_entity", "").strip() or None,
                        date_of_joining=joining,
                        status=EmploymentStatus(row.get("status", "active").strip()),
                    )
                    await EmployeeService.create(db, payload, actor_id)
                    created += 1
            except Exception as e:
                errors.append({"row": i, "error": str(e)})

        return {"created": created, "updated": updated, "errors": errors}

    @staticmethod
    async def export_csv(db: AsyncSession, current_user) -> bytes:
        employees, _ = await EmployeeService.get_all(db, current_user, page=1, per_page=10000)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "employee_code", "first_name", "last_name", "email",
            "phone", "designation", "department", "manager",
            "location", "legal_entity", "date_of_joining", "status",
        ])
        for emp in employees:
            writer.writerow([
                emp.employee_code, emp.first_name, emp.last_name, emp.email,
                emp.phone or "", emp.designation or "",
                emp.department.name if emp.department else "",
                f"{emp.manager.first_name} {emp.manager.last_name}" if emp.manager else "",
                emp.location or "",
                emp.legal_entity or "",
                emp.date_of_joining.isoformat() if emp.date_of_joining else "",
                emp.status.value,
            ])
        return output.getvalue().encode("utf-8")

    @staticmethod
    def get_csv_template() -> bytes:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "employee_code", "first_name", "last_name", "email",
            "phone", "designation", "location", "legal_entity", "date_of_joining", "status",
        ])
        writer.writerow(["EMP1001", "Jane", "Doe", "jane.doe@company.com", "+1234567890", "Engineer", "Chennai", "Legal Corp", "2024-01-15", "active"])
        return output.getvalue().encode("utf-8")

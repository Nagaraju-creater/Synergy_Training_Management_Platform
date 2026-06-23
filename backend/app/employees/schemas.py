from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.employees.models import EmploymentStatus


class EmployeeBase(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    designation: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    legal_entity: Optional[str] = None
    date_of_joining: Optional[date] = None
    status: EmploymentStatus = EmploymentStatus.ACTIVE
    department_id: Optional[UUID] = None
    sub_department: Optional[str] = None
    manager_id: Optional[UUID] = None
    profile_image_url: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    legal_entity: Optional[str] = None
    status: Optional[EmploymentStatus] = None
    department_id: Optional[UUID] = None
    sub_department: Optional[str] = None
    manager_id: Optional[UUID] = None
    date_of_joining: Optional[date] = None
    profile_image_url: Optional[str] = None


class EmployeeStatusUpdate(BaseModel):
    status: EmploymentStatus


class DepartmentNested(BaseModel):
    id: UUID
    name: str
    code: str

    model_config = {"from_attributes": True}


class ManagerNested(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class EmployeeResponse(EmployeeBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    department: Optional[DepartmentNested] = None
    manager: Optional[ManagerNested] = None

    model_config = {"from_attributes": True}

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.nominations.models import NominationStatus


class NominationCreate(BaseModel):
    employee_id: UUID
    training_id: UUID
    reason: Optional[str] = None


class NominationUpdate(BaseModel):
    status: Optional[str] = None
    reviewer_notes: Optional[str] = None


class NominationResponse(BaseModel):
    id: UUID
    employee_id: UUID
    training_id: UUID
    nominated_by: UUID
    manager_id: Optional[UUID] = None
    status: NominationStatus
    reason: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    # Extra fields for UI
    training_title: Optional[str] = None
    employee_name: Optional[str] = None
    nominator_name: Optional[str] = None

    model_config = {"from_attributes": True}

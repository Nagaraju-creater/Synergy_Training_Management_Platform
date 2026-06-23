from datetime import date, datetime
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.trainings.models import TrainingStatus, TrainingType


class TrainingCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class TrainingCategoryCreate(TrainingCategoryBase):
    pass

class TrainingCategoryResponse(TrainingCategoryBase):
    id: UUID
    model_config = {"from_attributes": True}


class TrainingBase(BaseModel):
    title: str
    description: Optional[str] = None
    training_type: TrainingType = TrainingType.INTERNAL
    delivery_mode: str = "ONLINE"  # ONLINE, IN_PERSON, HYBRID
    # NOTE: status is NOT accepted from clients — it is set server-side.
    # On create it defaults to DRAFT; on publish the client sends status=SCHEDULED.
    start_date: Optional[date] = None
    start_time: Optional[str] = None
    end_date: Optional[date] = None
    end_time: Optional[str] = None
    duration_hours: float = 2.0
    max_hours_allowed: float = 2.0
    enrollment_deadline: Optional[datetime] = None
    enrollment_deadline_time: Optional[str] = None
    venue: Optional[str] = None
    meeting_link: Optional[str] = None
    trainer_name: Optional[str] = None
    is_mandatory: bool = False
    is_global: bool = False
    max_participants: int = 20
    department_ids: list[UUID] = []
    category_id: Optional[UUID] = None


class TrainingCreate(TrainingBase):
    # Allow status to be set only by admin (draft vs scheduled/published)
    status: TrainingStatus = TrainingStatus.DRAFT


class TrainingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    training_type: Optional[TrainingType] = None
    delivery_mode: Optional[str] = None
    # Admin can set status to DRAFT or SCHEDULED (publish). ONGOING/COMPLETED are auto-computed.
    status: Optional[TrainingStatus] = None
    start_date: Optional[date] = None
    start_time: Optional[str] = None
    end_date: Optional[date] = None
    end_time: Optional[str] = None
    duration_hours: Optional[float] = None
    max_hours_allowed: Optional[float] = None
    enrollment_deadline: Optional[datetime] = None
    enrollment_deadline_time: Optional[str] = None
    venue: Optional[str] = None
    meeting_link: Optional[str] = None
    trainer_name: Optional[str] = None
    is_mandatory: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_global: Optional[bool] = None
    max_participants: Optional[int] = None
    department_ids: Optional[list[UUID]] = None
    category_id: Optional[UUID] = None


class TrainingDocumentResponse(BaseModel):
    id: UUID
    title: str
    file_path: str
    training_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class TrainingResponse(TrainingBase):
    id: UUID
    max_participants: Optional[int] = None
    available_seats: Optional[int] = None
    enrolled_count: Optional[int] = 0
    is_archived: bool
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    category: Optional[TrainingCategoryResponse] = None
    departments: list[Any] = [] # Use Any or forward ref to avoid circular import if needed
    eligible_departments: list[str] = []
    documents: list[TrainingDocumentResponse] = []
    server_time: datetime = Field(default_factory=datetime.now)
    learning_module_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


class TrainingImportRecord(BaseModel):
    index: int
    title: str
    description: Optional[str] = None
    department: str
    training_category: Optional[str] = None
    trainer_name: Optional[str] = None
    training_date: str
    start_time: str
    end_time: Optional[str] = None
    duration_hours: float
    mode: str
    venue: Optional[str] = None
    max_seats: int = 20
    enrollment_deadline_date: str
    enrollment_deadline_time: str
    training_type: str
    status: str
    is_valid: bool = True
    errors: list[str] = []
    warnings: list[str] = []
    is_duplicate: bool = False


class TrainingImportPreviewResponse(BaseModel):
    summary: dict
    records: list[TrainingImportRecord]


class TrainingImportConfirmPayload(BaseModel):
    records: list[dict]
    duplicate_strategy: str  # skip, update, replace


class TrainingImportConfirmResponse(BaseModel):
    successfully_imported: int
    failed_records: int
    skipped_duplicates: int


class TrainingImportHistoryResponse(BaseModel):
    id: UUID
    import_date: datetime = Field(validation_alias="created_at")
    records_imported: int
    records_failed: int
    records_skipped: int
    source_file: Optional[str] = None
    imported_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class MasterImportRecord(BaseModel):
    index: int
    is_valid: bool
    errors: list[str] = []
    warnings: list[str] = []
    is_duplicate: bool = False
    data: dict[str, Any]


class MasterImportPreviewResponse(BaseModel):
    summary: dict[str, int]
    sheets: dict[str, list[MasterImportRecord]]


class MasterImportConfirmPayload(BaseModel):
    sheets: dict[str, list[dict[str, Any]]]
    duplicate_strategy: str


class MasterImportConfirmResponse(BaseModel):
    successfully_imported: int
    failed_records: int
    skipped_duplicates: int
    sheet_breakdown: dict[str, dict[str, int]]





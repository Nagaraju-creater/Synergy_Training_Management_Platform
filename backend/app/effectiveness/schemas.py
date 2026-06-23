from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.effectiveness.models import EffectivenessLevel, EffectivenessStatus


class EffectivenessCreate(BaseModel):
    enrollment_id: UUID
    training_id: UUID
    level: EffectivenessLevel
    learnings_summary: Optional[str] = None
    work_application: Optional[str] = None
    suggestions: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)


class EffectivenessUpdate(BaseModel):
    learnings_summary: Optional[str] = None
    work_application: Optional[str] = None
    suggestions: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)


class EffectivenessReview(BaseModel):
    manager_comments: str
    manager_score: float = Field(..., ge=0, le=100)
    digital_signature_url: Optional[str] = None
    status: EffectivenessStatus = EffectivenessStatus.REVIEWED


class EffectivenessResponse(BaseModel):
    id: UUID
    enrollment_id: UUID
    training_id: UUID
    training_title: Optional[str] = None   # populated via validator below
    level: EffectivenessLevel
    status: EffectivenessStatus
    
    learnings_summary: Optional[str] = None
    work_application: Optional[str] = None
    suggestions: Optional[str] = None
    
    score: Optional[float] = None
    rating: Optional[int] = None
    comments: Optional[str] = None
    
    manager_comments: Optional[str] = None
    manager_score: Optional[float] = None
    digital_signature_url: Optional[str] = None
    
    submission_deadline: Optional[datetime] = None
    completion_datetime: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[UUID] = None
    evaluated_by: Optional[UUID] = None
    
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def populate_training_title(cls, data: any) -> any:
        """Auto-populate training_title from the related ORM training object."""
        if hasattr(data, "training") and data.training:
            # ORM object case: set training_title from relationship
            if not isinstance(data, dict):
                try:
                    object.__setattr__(data, "training_title", data.training.title)
                except Exception:
                    pass
        return data

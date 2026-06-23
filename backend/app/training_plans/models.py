from __future__ import annotations
import enum
import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Column, Date, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.trainings.categories import TrainingCategory
from app.departments.models import Department

class TrainingPlanStatus(str, enum.Enum):
    PLANNED = "Planned"
    CONVERTED = "Converted"
    COMPLETED = "Completed"

class TrainingPlan(BaseModel):
    __tablename__ = "training_plans"

    training_title: Mapped[str] = mapped_column(String(255), nullable=False)
    
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("training_categories.id"), nullable=False)
    category: Mapped[TrainingCategory] = relationship("TrainingCategory")

    planned_date: Mapped[date] = mapped_column(Date, nullable=False)

    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    department: Mapped[Optional[Department]] = relationship("Department")

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    financial_year: Mapped[str] = mapped_column(String(20), nullable=False) # e.g. "FY 2026-27"
    
    status: Mapped[TrainingPlanStatus] = mapped_column(
        SAEnum(TrainingPlanStatus, name="trainingplanstatus", values_callable=lambda x: [e.value for e in x]),
        default=TrainingPlanStatus.PLANNED,
        nullable=False
    )
    
    converted_training_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("trainings.id", ondelete="SET NULL"), nullable=True)
    converted_training = relationship("Training")

import enum
from datetime import timedelta, datetime

from sqlalchemy import Enum as SAEnum, Float, ForeignKey, Integer, Text, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
import uuid
from sqlalchemy.ext.hybrid import hybrid_property

from app.models.base import BaseModel


class EffectivenessLevel(str, enum.Enum):
    """Kirkpatrick Four-Level Training Evaluation Model."""
    REACTION = "reaction"    # Level 1 — participant satisfaction
    LEARNING = "learning"    # Level 2 — knowledge gain
    BEHAVIOR = "behavior"   # Level 3 — on-the-job application
    RESULTS = "results"      # Level 4 — business impact


class EffectivenessStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    OVERDUE = "overdue"


class Effectiveness(BaseModel):
    __tablename__ = "training_effectiveness"

    enrollment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("enrollments.id"), nullable=False, index=True)
    training_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trainings.id"), nullable=False, index=True)
    level: Mapped[EffectivenessLevel] = mapped_column(SAEnum(EffectivenessLevel, values_callable=lambda x: [e.name for e in x]), nullable=False)
    
    # Employee Submission Fields
    learnings_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    work_application: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggestions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Quantitative Data
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # 1–5
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Deadline — set to (attendance_marked_at + 1 day) + 2 days = 3 days after attendance
    submission_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completion_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Reminder tracking
    is_24h_reminder_sent: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_6h_reminder_sent: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Status and Review
    status: Mapped[EffectivenessStatus] = mapped_column(SAEnum(EffectivenessStatus, values_callable=lambda x: [e.name for e in x]), default=EffectivenessStatus.PENDING, index=True)
    manager_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    digital_signature_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Review Metadata
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    evaluated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    # Relationships
    enrollment = relationship("Enrollment", back_populates="effectiveness_evaluation")
    training = relationship("Training", back_populates="effectiveness_records")
    evaluator = relationship("User", foreign_keys=[evaluated_by], back_populates="evaluated_effectiveness")
    reviewer = relationship("User", foreign_keys=[reviewed_by], back_populates="reviewed_effectiveness")

    @hybrid_property
    def deadline_display(self):
        """Returns the effective deadline: stored submission_deadline or fallback to training end_date + 3 days."""
        if self.submission_deadline:
            return self.submission_deadline
        if self.training and self.training.end_date:
            return self.training.end_date + timedelta(days=3)
        return None

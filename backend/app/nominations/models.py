import enum

from sqlalchemy import Date, Enum as SAEnum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
import uuid
from datetime import date

from app.models.base import BaseModel
from app.trainings.models import DeliveryMode


class NominationStatus(str, enum.Enum):
    PENDING_MANAGER_APPROVAL = "pending_manager_approval"
    PENDING_ADMIN_APPROVAL = "pending_admin_approval"
    REJECTED_BY_MANAGER = "rejected_by_manager"
    REJECTED_BY_ADMIN = "rejected_by_admin"
    APPROVED = "approved"


class Nomination(BaseModel):
    __tablename__ = "nominations"

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    training_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trainings.id"), nullable=False, index=True)
    nominated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[NominationStatus] = mapped_column(
        SAEnum(NominationStatus, values_callable=lambda x: [e.value for e in x]),
        default=NominationStatus.PENDING_MANAGER_APPROVAL,
        nullable=False,
        index=True
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    # The employee_id of the manager assigned to review this nomination (populated at creation time)
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True, index=True)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="nominations")
    training = relationship("Training", back_populates="nominations")
    nominator = relationship("User", foreign_keys=[nominated_by], back_populates="nominated_trainings")
    reviewer = relationship("User", foreign_keys=[reviewed_by], back_populates="reviewed_nominations")
    manager = relationship("Employee", foreign_keys=[manager_id])

from sqlalchemy import Boolean, ForeignKey, String, DateTime
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
import uuid

from app.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false', nullable=False)
    never_show_welcome_back: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false', nullable=False)

    # Relationships
    role = relationship("Role", back_populates="users")
    employee = relationship("Employee", back_populates="user", uselist=False, cascade="all, delete-orphan")
    digital_signatures = relationship("DigitalSignature", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    created_trainings = relationship("Training", foreign_keys="[Training.created_by]", back_populates="creator")
    approved_enrollments = relationship("Enrollment", back_populates="approver")
    nominated_trainings = relationship("Nomination", foreign_keys="[Nomination.nominated_by]", back_populates="nominator")
    reviewed_nominations = relationship("Nomination", foreign_keys="[Nomination.reviewed_by]", back_populates="reviewer")

    evaluated_effectiveness = relationship("Effectiveness", foreign_keys="[Effectiveness.evaluated_by]", back_populates="evaluator")
    reviewed_effectiveness = relationship("Effectiveness", foreign_keys="[Effectiveness.reviewed_by]", back_populates="reviewer")
    audit_logs = relationship("AuditLog", back_populates="user")

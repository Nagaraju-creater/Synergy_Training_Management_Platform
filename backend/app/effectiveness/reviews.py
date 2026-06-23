from sqlalchemy import Column, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class DepartmentReview(BaseModel):
    __tablename__ = "department_reviews"

    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    training_id = Column(UUID(as_uuid=True), ForeignKey("trainings.id"), nullable=False)
    head_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    comments = Column(Text, nullable=True)

    # Relationships
    department = relationship("Department", back_populates="reviews")
    training = relationship("Training", back_populates="department_reviews")
    head = relationship("Employee", foreign_keys=[head_id])

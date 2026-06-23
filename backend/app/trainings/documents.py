from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from typing import Optional

from app.models.base import BaseModel

class TrainingDocument(BaseModel):
    __tablename__ = "training_documents"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    training_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trainings.id"), nullable=False)

    # Relationships
    training = relationship("Training", back_populates="documents")

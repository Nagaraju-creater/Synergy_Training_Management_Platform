from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid

from app.models.base import BaseModel


class DigitalSignature(BaseModel):
    __tablename__ = "digital_signatures"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    signature_path: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="digital_signatures")

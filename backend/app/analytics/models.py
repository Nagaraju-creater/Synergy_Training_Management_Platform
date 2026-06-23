from sqlalchemy import Integer, Float, Date
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from typing import Any, Optional
from datetime import date

from app.models.base import BaseModel


class AnalyticsSnapshot(BaseModel):
    __tablename__ = "analytics_snapshots"

    snapshot_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False, index=True)
    total_employees: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_trainings_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_effectiveness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    metrics_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

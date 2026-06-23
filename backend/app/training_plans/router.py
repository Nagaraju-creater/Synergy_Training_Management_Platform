from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.training_plans.schemas import (
    TrainingPlanCreate, TrainingPlanUpdate, TrainingPlanResponse, TrainingPlanStats
)
from app.training_plans.service import TrainingPlanService
from app.trainings.schemas import TrainingCreate
from app.utils.response import success_response

router = APIRouter()

@router.get("/", response_model=None)
async def list_plans(
    financial_year: Optional[str] = Query(None),
    department_id: Optional[UUID] = Query(None),
    category_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    plans = await TrainingPlanService.get_all(
        db, financial_year, department_id, category_id, status, month, search
    )
    return success_response(
        [TrainingPlanResponse.model_validate(p).model_dump() for p in plans],
        "Training plans fetched successfully"
    )

@router.get("/stats", response_model=None)
async def get_stats(
    financial_year: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    stats = await TrainingPlanService.get_stats(db, financial_year)
    return success_response(
        TrainingPlanStats.model_validate(stats).model_dump(),
        "Annual planning statistics fetched successfully"
    )

@router.post("/", response_model=None, status_code=201)
async def create_plan(
    payload: TrainingPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    plan = await TrainingPlanService.create(db, payload, current_user.id)
    return success_response(
        TrainingPlanResponse.model_validate(plan).model_dump(),
        "Training plan created successfully",
        201
    )

@router.get("/{plan_id}", response_model=None)
async def get_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    plan = await TrainingPlanService.get_by_id(db, plan_id)
    return success_response(
        TrainingPlanResponse.model_validate(plan).model_dump(),
        "Training plan details fetched successfully"
    )

@router.patch("/{plan_id}", response_model=None)
async def update_plan(
    plan_id: UUID,
    payload: TrainingPlanUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    plan = await TrainingPlanService.update(db, plan_id, payload)
    return success_response(
        TrainingPlanResponse.model_validate(plan).model_dump(),
        "Training plan updated successfully"
    )

@router.delete("/{plan_id}", response_model=None)
async def delete_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    await TrainingPlanService.delete(db, plan_id)
    return success_response(None, "Training plan deleted successfully")

@router.post("/{plan_id}/convert", response_model=None)
async def convert_plan(
    plan_id: UUID,
    payload: TrainingCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    plan = await TrainingPlanService.convert_to_training(db, plan_id, payload, current_user.id)
    return success_response(
        TrainingPlanResponse.model_validate(plan).model_dump(),
        "Training plan converted to live training successfully"
    )

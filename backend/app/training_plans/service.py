from typing import List, Optional, Tuple
from uuid import UUID
from datetime import date
from sqlalchemy import select, or_, and_, func, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.training_plans.models import TrainingPlan, TrainingPlanStatus
from app.training_plans.schemas import TrainingPlanCreate, TrainingPlanUpdate, DepartmentWiseCount
from app.trainings.models import Training, TrainingStatus
from app.trainings.service import _compute_status, TrainingService
from app.trainings.schemas import TrainingCreate
from app.utils.exceptions import NotFoundException, BadRequestException
from app.departments.models import Department

class TrainingPlanService:
    @staticmethod
    async def sync_plan_statuses(db: AsyncSession, plans: List[TrainingPlan]) -> bool:
        """Helper to dynamically synchronize Converted plan statuses to Completed if their training has ended."""
        updated = False
        for plan in plans:
            if plan.status == TrainingPlanStatus.CONVERTED and plan.converted_training:
                # Eagerly compute the latest status of the live training record
                live_status = _compute_status(plan.converted_training)
                if live_status == TrainingStatus.COMPLETED:
                    plan.status = TrainingPlanStatus.COMPLETED
                    updated = True
        if updated:
            await db.flush()
        return updated

    @staticmethod
    async def get_all(
        db: AsyncSession,
        financial_year: Optional[str] = None,
        department_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        status: Optional[str] = None,
        month: Optional[int] = None,
        search: Optional[str] = None,
    ) -> List[TrainingPlan]:
        # Start by eagerly loading category, department, and the converted training record
        stmt = select(TrainingPlan).options(
            selectinload(TrainingPlan.category),
            selectinload(TrainingPlan.department),
            selectinload(TrainingPlan.converted_training)
        )
        
        filters = [TrainingPlan.deleted_at == None]
        if financial_year:
            filters.append(TrainingPlan.financial_year == financial_year)
        if department_id:
            filters.append(TrainingPlan.department_id == department_id)
        if category_id:
            filters.append(TrainingPlan.category_id == category_id)
        if status:
            # Map case-insensitive input to enum values
            status_map = {s.value.lower(): s for s in TrainingPlanStatus}
            mapped_status = status_map.get(status.lower())
            if mapped_status:
                filters.append(TrainingPlan.status == mapped_status)
        if month:
            # Extract month from planned_date
            filters.append(func.extract('month', TrainingPlan.planned_date) == month)
        if search and search.strip():
            filters.append(TrainingPlan.training_title.ilike(f"%{search}%"))

        stmt = stmt.where(and_(*filters)).order_by(TrainingPlan.planned_date.asc())
        res = await db.execute(stmt)
        plans = list(res.scalars().all())

        # Sync converted training statuses in real-time
        await TrainingPlanService.sync_plan_statuses(db, plans)
        
        return plans

    @staticmethod
    async def get_by_id(db: AsyncSession, plan_id: UUID) -> TrainingPlan:
        stmt = select(TrainingPlan).options(
            selectinload(TrainingPlan.category),
            selectinload(TrainingPlan.department),
            selectinload(TrainingPlan.converted_training)
        ).where(TrainingPlan.id == plan_id, TrainingPlan.deleted_at == None)
        
        res = await db.execute(stmt)
        plan = res.scalar_one_or_none()
        if not plan:
            raise NotFoundException("Training Plan")

        # Sync status on fetch
        await TrainingPlanService.sync_plan_statuses(db, [plan])
        return plan

    @staticmethod
    async def create(db: AsyncSession, payload: TrainingPlanCreate, created_by: UUID) -> TrainingPlan:
        data = payload.model_dump()
        plan = TrainingPlan(**data, created_by=created_by)
        db.add(plan)
        await db.flush()
        return await TrainingPlanService.get_by_id(db, plan.id)

    @staticmethod
    async def update(db: AsyncSession, plan_id: UUID, payload: TrainingPlanUpdate) -> TrainingPlan:
        plan = await TrainingPlanService.get_by_id(db, plan_id)
        
        # If already converted or completed, check if we allow editing
        # The requirements do not explicitly block editing planned trainings, but standard practice allows it
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(plan, k, v)
            
        await db.flush()
        return await TrainingPlanService.get_by_id(db, plan.id)

    @staticmethod
    async def delete(db: AsyncSession, plan_id: UUID) -> None:
        plan = await TrainingPlanService.get_by_id(db, plan_id)
        await db.delete(plan)
        await db.flush()

    @staticmethod
    async def get_stats(db: AsyncSession, financial_year: str) -> dict:
        # Fetch all plans for the financial year to count them and sync statuses
        stmt = select(TrainingPlan).options(
            selectinload(TrainingPlan.converted_training)
        ).where(TrainingPlan.financial_year == financial_year, TrainingPlan.deleted_at == None)
        
        res = await db.execute(stmt)
        plans = list(res.scalars().all())
        
        # Sync statuses
        await TrainingPlanService.sync_plan_statuses(db, plans)

        total = len(plans)
        converted = sum(1 for p in plans if p.status == TrainingPlanStatus.CONVERTED)
        completed = sum(1 for p in plans if p.status == TrainingPlanStatus.COMPLETED)
        pending = sum(1 for p in plans if p.status == TrainingPlanStatus.PLANNED)

        # Department wise counts
        dept_counts_dict = {}
        for p in plans:
            if p.department_id:
                # Query department name if not already cached
                if p.department_id not in dept_counts_dict:
                    dept_stmt = select(Department.name).where(Department.id == p.department_id)
                    dept_res = await db.execute(dept_stmt)
                    dept_name = dept_res.scalar_one_or_none() or "Unknown Department"
                    dept_counts_dict[p.department_id] = {"name": dept_name, "count": 0}
                dept_counts_dict[p.department_id]["count"] += 1
            else:
                if "global" not in dept_counts_dict:
                    dept_counts_dict["global"] = {"name": "Global / All Departments", "count": 0}
                dept_counts_dict["global"]["count"] += 1

        dept_wise = [
            DepartmentWiseCount(department_name=val["name"], count=val["count"])
            for val in dept_counts_dict.values()
        ]

        return {
            "total_planned": total,
            "converted": converted,
            "completed": completed,
            "pending": pending,
            "department_wise_counts": dept_wise
        }

    @staticmethod
    async def convert_to_training(
        db: AsyncSession,
        plan_id: UUID,
        payload: TrainingCreate,
        created_by: UUID
    ) -> TrainingPlan:
        plan = await TrainingPlanService.get_by_id(db, plan_id)
        if plan.status != TrainingPlanStatus.PLANNED:
            raise BadRequestException(f"Training plan is already converted or completed. Current status: {plan.status}")

        # Invoke the main TrainingService to create a normal training record
        training = await TrainingService.create(db, payload, created_by)
        
        # Update the plan properties to link them
        plan.converted_training_id = training.id
        plan.status = TrainingPlanStatus.CONVERTED
        
        await db.flush()
        return await TrainingPlanService.get_by_id(db, plan.id)

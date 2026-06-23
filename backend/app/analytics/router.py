from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import Optional
from datetime import date

from app.analytics.service import AnalyticsService
from app.analytics.schemas import (
    AnalyticsSummary, AnalyticsCharts, EmployeeDashboardData, ManagerDashboardData, AdminDashboardData,
    ManagerSummary, ManagerCharts, TeamDataResponse, PendingReviewRow, ManagerDashboardActivity
)
from app.analytics.team_analytics_service import TeamAnalyticsService
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.utils.response import success_response

router = APIRouter()

@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    data = await AnalyticsService.get_summary(db, current_user)
    return success_response(data.model_dump())

@router.get("/charts")
async def get_charts(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    data = await AnalyticsService.get_charts(db, current_user)
    return success_response(data.model_dump())

@router.get("/employee")
async def get_employee_dashboard(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_employee_dashboard(db, current_user.id)
    return success_response(data.model_dump())

@router.get("/manager")
async def get_manager_dashboard(
    current_user = Depends(require_role("Admin", "Manager")),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_manager_dashboard(db, current_user)
    return success_response(data.model_dump())

@router.get("/manager/dashboard/summary")
async def get_manager_summary_v2(
    current_user = Depends(require_role("Manager", "Admin")),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_manager_summary_v2(db, current_user)
    return success_response(data.model_dump())

@router.get("/manager/dashboard/charts")
async def get_manager_charts_v2(
    current_user = Depends(require_role("Manager", "Admin")),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_manager_charts_v2(db, current_user)
    return success_response(data.model_dump())

@router.get("/manager/dashboard/team")
async def get_manager_team_v2(
    page: int = 1,
    limit: int = 10,
    current_user = Depends(require_role("Manager", "Admin")),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_manager_team_v2(db, current_user, page, limit)
    return success_response(data.model_dump())

@router.get("/manager/dashboard/activity")
async def get_manager_activity_v2(
    current_user = Depends(require_role("Manager", "Admin")),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_manager_activity_v2(db, current_user)
    return success_response([d.model_dump() for d in data])

@router.get("/manager/dashboard/pending-reviews")
async def get_manager_pending_reviews_v2(
    current_user = Depends(require_role("Manager", "Admin")),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_manager_pending_reviews_v2(db, current_user)
    return success_response([d.model_dump() for d in data])

@router.get("/manager/dashboard/unified")
async def get_unified_manager_dashboard(
    current_user = Depends(require_role("Manager", "Admin")),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_unified_manager_dashboard(db, current_user)
    return success_response(data.model_dump())

@router.get("/admin")
async def get_admin_dashboard(
    current_user = Depends(require_role("Admin")),
    db: AsyncSession = Depends(get_db)
):
    data = await AnalyticsService.get_admin_dashboard(db, current_user)
    return success_response(data.model_dump())

@router.get("/team")
async def get_team_analytics(
    financial_year: Optional[str] = Query(None),
    quarter: Optional[str] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    department_id: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    manager_id: Optional[str] = Query(None),
    training_category_id: Optional[str] = Query(None),
    training_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user = Depends(require_role("Admin")),
    db: AsyncSession = Depends(get_db),
):
    """Full Team Analytics dashboard data for the Admin's Team Analytics page with filters."""
    data = await TeamAnalyticsService.get_team_dashboard(
        db=db,
        financial_year=financial_year,
        quarter=quarter,
        month=month,
        department_id=department_id,
        employee_id=employee_id,
        manager_id=manager_id,
        training_category_id=training_category_id,
        training_type=training_type,
        start_date=start_date,
        end_date=end_date,
    )
    return success_response(data.model_dump())

@router.get("/team/kpi-export")
async def export_team_kpi_report(
    financial_year: Optional[str] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    department_id: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    manager_id: Optional[str] = Query(None),
    training_id: Optional[str] = Query(None),
    training_category_id: Optional[str] = Query(None),
    attendance_status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user = Depends(require_role("Admin")),
    db: AsyncSession = Depends(get_db),
):
    """Export the HR-style FY learning KPI workbook from real attendance roster data."""
    excel_data = await TeamAnalyticsService.generate_kpi_excel(
        db=db,
        financial_year=financial_year,
        month=month,
        department_id=department_id,
        employee_id=employee_id,
        manager_id=manager_id,
        training_id=training_id,
        training_category_id=training_category_id,
        attendance_status=attendance_status,
        start_date=start_date,
        end_date=end_date,
    )
    fy_label = financial_year or TeamAnalyticsService.financial_year_bounds()[2]
    filename = f"learning_kpi_report_FY_{fy_label}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

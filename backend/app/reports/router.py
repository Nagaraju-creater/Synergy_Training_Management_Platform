from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.reports.service import ReportService
from app.reports.schemas import TrainingSummaryReport, ReportFilters
from app.database import get_db
from app.dependencies import get_current_user, require_role

router = APIRouter()

@router.get("/summary", response_model=TrainingSummaryReport)
async def get_summary(
    current_user = Depends(require_role("Admin", "Manager")),
    db: AsyncSession = Depends(get_db)
):
    return await ReportService.training_summary(db)

@router.get("/export/csv")
async def export_csv(
    department_id: Optional[str] = None,
    training_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role("Admin", "Manager"))
):
    filters = ReportFilters(
        department_id=department_id,
        training_id=training_id,
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    csv_data = await ReportService.generate_csv(db, filters)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=training_report_{date.today()}.csv"}
    )

@router.get("/export/excel")
async def export_excel(
    department_id: Optional[str] = None,
    training_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role("Admin", "Manager"))
):
    filters = ReportFilters(
        department_id=department_id,
        training_id=training_id,
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    excel_data = await ReportService.generate_excel(db, filters)
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=training_report_{date.today()}.xlsx"}
    )

@router.get("/export/pdf")
async def export_pdf(
    department_id: Optional[str] = None,
    training_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role("Admin", "Manager"))
):
    filters = ReportFilters(
        department_id=department_id,
        training_id=training_id,
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    pdf_data = await ReportService.generate_pdf(db, filters)
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=training_report_{date.today()}.pdf"}
    )

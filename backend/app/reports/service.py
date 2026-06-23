import csv
import io
from xhtml2pdf import pisa
from datetime import date, datetime
from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.enrollments.models import Enrollment, EnrollmentStatus
from app.reports.schemas import TrainingSummaryReport, ReportFilters
from app.trainings.models import Training, TrainingStatus
from app.employees.models import Employee
from app.departments.models import Department

class ReportService:
    @staticmethod
    async def get_filtered_enrollments(db: AsyncSession, filters: ReportFilters):
        stmt = (
            select(Enrollment)
            .options(
                selectinload(Enrollment.training),
                selectinload(Enrollment.employee).selectinload(Employee.department)
            )
        )
        
        conditions = [Enrollment.deleted_at == None]
        
        if filters.department_id:
            stmt = stmt.join(Employee, Enrollment.employee_id == Employee.id).where(Employee.department_id == filters.department_id)
        if filters.employee_id:
            conditions.append(Enrollment.employee_id == filters.employee_id)
        if filters.training_id:
            conditions.append(Enrollment.training_id == filters.training_id)
        if filters.status:
            conditions.append(Enrollment.status == filters.status)
        if filters.start_date:
            conditions.append(Enrollment.created_at >= datetime.combine(filters.start_date, datetime.min.time()))
        if filters.end_date:
            conditions.append(Enrollment.created_at <= datetime.combine(filters.end_date, datetime.max.time()))
            
        res = await db.execute(stmt.where(and_(*conditions)))
        return res.scalars().all()

    @staticmethod
    async def generate_csv(db: AsyncSession, filters: ReportFilters) -> str:
        results = await ReportService.get_filtered_enrollments(db, filters)
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Training Title", "Employee Name", "Department", "Status", "Score", "Completion Date"])

        for enr in results:
            writer.writerow([
                enr.training.title if enr.training else "N/A",
                f"{enr.employee.first_name} {enr.employee.last_name}" if enr.employee else "N/A",
                enr.employee.department.name if enr.employee and enr.employee.department else "N/A",
                enr.status.value,
                enr.completion_score or 0.0,
                enr.updated_at.strftime("%Y-%m-%d") if enr.status == EnrollmentStatus.COMPLETED else "Pending"
            ])

        return output.getvalue()

    @staticmethod
    async def generate_excel(db: AsyncSession, filters: ReportFilters) -> bytes:
        import openpyxl
        
        results = await ReportService.get_filtered_enrollments(db, filters)
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Training Report'
        
        headers = ["Training Title", "Employee Name", "Department", "Status", "Score", "Completion Date"]
        ws.append(headers)
        
        for enr in results:
            ws.append([
                enr.training.title if enr.training else "N/A",
                f"{enr.employee.first_name} {enr.employee.last_name}" if enr.employee else "N/A",
                enr.employee.department.name if enr.employee and enr.employee.department else "N/A",
                enr.status.value,
                enr.completion_score or 0.0,
                enr.updated_at.strftime("%Y-%m-%d") if enr.status == EnrollmentStatus.COMPLETED else "Pending"
            ])
            
        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()

    @staticmethod
    async def generate_pdf(db: AsyncSession, filters: ReportFilters) -> bytes:
        results = await ReportService.get_filtered_enrollments(db, filters)
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                h1 {{ color: #444; text-align: center; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <h1>Training Completion Report</h1>
            <p>Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M")}</p>
            <table>
                <thead>
                    <tr>
                        <th>Training Title</th>
                        <th>Employee Name</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Completion Date</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for enr in results:
            html_content += f"""
                <tr>
                    <td>{enr.training.title if enr.training else "N/A"}</td>
                    <td>{enr.employee.first_name} {enr.employee.last_name if enr.employee else "N/A"}</td>
                    <td>{enr.employee.department.name if enr.employee and enr.employee.department else "N/A"}</td>
                    <td>{enr.status.value}</td>
                    <td>{enr.completion_score or 0.0}</td>
                    <td>{enr.updated_at.strftime("%Y-%m-%d") if enr.status == EnrollmentStatus.COMPLETED else "Pending"}</td>
                </tr>
            """
            
        html_content += "</tbody></table></body></html>"
        
        pdf_output = io.BytesIO()
        pisa.CreatePDF(io.BytesIO(html_content.encode("UTF-8")), dest=pdf_output)
        return pdf_output.getvalue()

    @staticmethod
    async def training_summary(db: AsyncSession) -> TrainingSummaryReport:
        total = (await db.execute(select(func.count()).select_from(Training))).scalar_one()
        completed = (await db.execute(select(func.count()).select_from(Training).where(Training.status == TrainingStatus.COMPLETED))).scalar_one()
        ongoing = (await db.execute(select(func.count()).select_from(Training).where(Training.status == TrainingStatus.ONGOING))).scalar_one()
        total_enrollments = (await db.execute(select(func.count()).select_from(Enrollment))).scalar_one()
        completed_enrollments = (await db.execute(select(func.count()).select_from(Enrollment).where(Enrollment.status == EnrollmentStatus.COMPLETED))).scalar_one()
        rate = (completed_enrollments / total_enrollments * 100) if total_enrollments else 0.0

        return TrainingSummaryReport(
            total_trainings=total,
            completed_trainings=completed,
            ongoing_trainings=ongoing,
            total_enrollments=total_enrollments,
            completion_rate=round(rate, 2),
        )

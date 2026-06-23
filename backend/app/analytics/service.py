from datetime import date, datetime, timedelta
from typing import List
from sqlalchemy import func, select, case, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import uuid

from app.analytics.schemas import (
    AnalyticsSummary, AnalyticsCharts, MonthlyEngagement, DepartmentPerformance,
    EmployeeDashboardData, ManagerDashboardData, AdminDashboardData, TeamMemberProgress, SkillProgress,
    ManagerSummary, ManagerCharts, ParticipationChart, TeamMemberRow, TeamDataResponse,
    PendingReviewRow, ManagerDashboardActivity, UnifiedManagerDashboard,
    AnnualLearningGoal, LearningContribution,
)
from app.employees.models import Employee, EmploymentStatus
from app.enrollments.models import Enrollment, EnrollmentStatus
from app.trainings.models import Training, TrainingStatus
from app.departments.models import Department
from app.gamification.models import Achievement, LeaderboardPoint
from app.nominations.models import Nomination, NominationStatus
from app.effectiveness.models import Effectiveness, EffectivenessStatus
from app.attendance.models import AttendanceRecord, AttendanceStatus


class AnalyticsService:
    LEARNING_GOAL_HOURS = 16.0

    # Helper: return the DB-stored string for an EnrollmentStatus.
    # The DB uses values_callable=lambda x: [e.name for e in x], so
    # the stored value is the ENUM NAME (e.g. "COMPLETED"), not the Python value ("completed").
    @staticmethod
    def enr_name(status: "EnrollmentStatus") -> str:  # type: ignore
        return status.name

    @staticmethod
    def get_financial_year(today: date | None = None) -> dict:
        today = today or date.today()
        start_year = today.year if today.month >= 4 else today.year - 1
        start = date(start_year, 4, 1)
        end = date(start_year + 1, 3, 31)
        return {
            "start": start,
            "end": end,
            "end_exclusive": date(start_year + 1, 4, 1),
            "label": f"FY: Apr {start.year} - Mar {end.year}",
        }

    @staticmethod
    def learning_goal_state(progress: float) -> str:
        if progress >= 100:
            return "Goal Achieved"
        if progress >= 75:
            return "Almost Achieved"
        if progress >= 50:
            return "Strong Progress"
        if progress >= 25:
            return "On Track"
        return "Getting Started"

    @staticmethod
    async def get_fy_learning_contributions(db: AsyncSession, employee_ids=None) -> tuple[dict, dict]:
        # Sync active training statuses in real-time before compliance calculations
        from app.trainings.service import _compute_status
        from app.effectiveness.service import EffectivenessService
        
        sync_stmt = select(Training).where(Training.status.notin_([TrainingStatus.DRAFT, TrainingStatus.CANCELLED]))
        sync_res = await db.execute(sync_stmt)
        all_active_trainings = sync_res.scalars().all()
        updated_any = False
        newly_completed = []
        for t in all_active_trainings:
            new_status = _compute_status(t)
            if new_status != t.status:
                if new_status == TrainingStatus.COMPLETED:
                    newly_completed.append(t)
                t.status = new_status
                updated_any = True
        if updated_any:
            await db.flush()
        if newly_completed:
            for t in newly_completed:
                try:
                    await EffectivenessService.assign_training_effectiveness(db, t)
                except Exception:
                    pass

        fy = AnalyticsService.get_financial_year()
        stmt = (
            select(
                AttendanceRecord.employee_id,
                AttendanceRecord.training_id,
                Training.title.label("training_title"),
                Training.duration_hours,
                Training.start_date,
                AttendanceRecord.marked_at,
            )
            .join(Training, Training.id == AttendanceRecord.training_id)
            .join(
                Enrollment,
                and_(
                    Enrollment.employee_id == AttendanceRecord.employee_id,
                    Enrollment.training_id == AttendanceRecord.training_id,
                ),
            )
            .where(
                and_(
                    # Attendance record status proves physical presence
                    AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
                    # Enrollment must be active or completed (not PENDING/REJECTED/WITHDRAWN)
                    Enrollment.status.in_(["APPROVED", "COMPLETED"]),
                    # Soft-delete guards
                    Enrollment.deleted_at == None,
                    Training.deleted_at == None,
                    # Only completed trainings count
                    Training.status == TrainingStatus.COMPLETED,
                    # Training must fall within current financial year
                    Training.start_date >= fy["start"],
                    Training.start_date < fy["end_exclusive"],
                    # NOTE: We intentionally do NOT require Training.end_date < today().
                    # An AttendanceRecord with PRESENT/LATE status is proof that the
                    # session occurred. Restricting by end_date causes future-dated
                    # trainings (that already ran) to return 0 hours.
                )
            )
            .order_by(Training.start_date.desc(), AttendanceRecord.marked_at.desc())
        )
        if employee_ids is not None:
            stmt = stmt.where(AttendanceRecord.employee_id.in_(employee_ids))

        unique_rows = {}
        for row in (await db.execute(stmt)).all():
            key = (row.employee_id, row.training_id)
            if key not in unique_rows:
                unique_rows[key] = row

        by_employee = {}
        for row in unique_rows.values():
            by_employee.setdefault(row.employee_id, []).append({
                "training_title": row.training_title,
                "hours": round(float(row.duration_hours or 0.0), 1),
                "completed_on": row.start_date,
            })

        return fy, by_employee

    @staticmethod
    def build_annual_learning_goal(fy: dict, contributions: list) -> AnnualLearningGoal:
        completed = round(sum(item["hours"] for item in contributions), 1)
        progress = round((completed / AnalyticsService.LEARNING_GOAL_HOURS) * 100, 1)
        recent = contributions[0] if contributions else None
        return AnnualLearningGoal(
            goal_hours=AnalyticsService.LEARNING_GOAL_HOURS,
            completed_hours=completed,
            remaining_hours=round(max(AnalyticsService.LEARNING_GOAL_HOURS - completed, 0.0), 1),
            progress_percentage=progress,
            progress_state=AnalyticsService.learning_goal_state(progress),
            financial_year_label=fy["label"],
            financial_year_start=fy["start"],
            financial_year_end=fy["end"],
            last_completed_course=recent["training_title"] if recent else None,
            recent_contribution=LearningContribution(**recent) if recent else None,
        )

    @staticmethod
    async def get_summary(db: AsyncSession, current_user) -> AnalyticsSummary:
        user_role = current_user.role.name.lower() if current_user.role else ""
        emp_id = current_user.employee_id

        emp_filter = Employee.deleted_at == None
        enr_filter = Enrollment.deleted_at == None

        if user_role == "admin":
            pass
        elif user_role == "manager":
            emp_filter = and_(emp_filter, or_(Employee.manager_id == emp_id, Employee.id == emp_id))
            team_ids_stmt = select(Employee.id).where(or_(Employee.manager_id == emp_id, Employee.id == emp_id))
            enr_filter = and_(enr_filter, Enrollment.employee_id.in_(team_ids_stmt))
        else:
            emp_filter = and_(emp_filter, Employee.id == emp_id)
            enr_filter = and_(enr_filter, Enrollment.employee_id == emp_id)

        total_employees = (await db.execute(select(func.count(Employee.id)).where(emp_filter))).scalar() or 0
        total_trainings = (await db.execute(select(func.count(Training.id)).where(Training.deleted_at == None))).scalar() or 0
        total_enrollments = (await db.execute(select(func.count(Enrollment.id)).where(enr_filter))).scalar() or 0

        # DB stores EnrollmentStatus by NAME ("COMPLETED") not value ("completed")
        completed = (await db.execute(
            select(func.count(Enrollment.id)).where(and_(Enrollment.status == "COMPLETED", enr_filter))
        )).scalar() or 0
        avg_rate = (completed / total_enrollments * 100) if total_enrollments else 0.0

        now = datetime.now()
        first_of_month = date(now.year, now.month, 1)

        if user_role == "manager":
            trainings_this_month = (await db.execute(
                select(func.count(func.distinct(Enrollment.training_id)))
                .join(Training, Training.id == Enrollment.training_id)
                .where(and_(enr_filter, Training.start_date >= first_of_month, Training.deleted_at == None))
            )).scalar() or 0
        elif user_role == "employee":
            trainings_this_month = (await db.execute(
                select(func.count(func.distinct(Enrollment.training_id)))
                .join(Training, Training.id == Enrollment.training_id)
                .where(and_(enr_filter, Training.start_date >= first_of_month, Training.deleted_at == None))
            )).scalar() or 0
        else:
            trainings_this_month = (await db.execute(
                select(func.count(Training.id))
                .where(and_(Training.start_date >= first_of_month, Training.deleted_at == None))
            )).scalar() or 0

        return AnalyticsSummary(
            total_employees=total_employees,
            total_trainings=total_trainings,
            total_enrollments=total_enrollments,
            avg_completion_rate=round(avg_rate, 2),
            trainings_this_month=trainings_this_month,
        )

    @staticmethod
    async def get_employee_dashboard(db: AsyncSession, user_id: uuid.UUID) -> EmployeeDashboardData:
        res = await db.execute(select(Employee).where(Employee.user_id == user_id))
        employee = res.scalar_one_or_none()
        if not employee:
            raise Exception("Employee record not found")

        emp_id = employee.id

        # DB stores EnrollmentStatus by NAME ("APPROVED", "COMPLETED") not value ("enrolled", "completed")
        stats_stmt = select(
            func.count(Enrollment.id).filter(Enrollment.status == "APPROVED").label("active"),
            func.count(Enrollment.id).filter(Enrollment.status == "COMPLETED").label("completed"),
            func.avg(Enrollment.progress).label("avg_progress")
        ).where(and_(Enrollment.employee_id == emp_id, Enrollment.deleted_at == None))

        stats_res = (await db.execute(stats_stmt)).one()
        active_count = stats_res.active or 0
        completed_count = stats_res.completed or 0
        overall_progress = int(stats_res.avg_progress or 0)

        missed_stmt = select(func.count(Enrollment.id)) \
            .join(Training, Enrollment.training_id == Training.id) \
            .where(and_(
                Enrollment.employee_id == emp_id,
                Enrollment.status == "APPROVED",
                Training.end_date < date.today(),
                Enrollment.deleted_at == None
            ))
        missed_count = (await db.execute(missed_stmt)).scalar() or 0

        points_stmt = select(func.coalesce(func.sum(LeaderboardPoint.points), 0)).where(LeaderboardPoint.employee_id == emp_id)
        total_points = (await db.execute(points_stmt)).scalar() or 0

        badges_stmt = select(func.count(Achievement.id)).where(Achievement.employee_id == emp_id)
        badges_count = (await db.execute(badges_stmt)).scalar() or 0

        pending_eff_stmt = select(func.count(Effectiveness.id)).where(and_(
            Effectiveness.evaluated_by == user_id,
            Effectiveness.status == EffectivenessStatus.PENDING,
            Effectiveness.deleted_at == None
        ))
        pending_eff = (await db.execute(pending_eff_stmt)).scalar() or 0

        upcoming_stmt = select(Training.title, Training.end_date) \
            .join(Enrollment, Enrollment.training_id == Training.id) \
            .where(and_(
                Enrollment.employee_id == emp_id,
                Enrollment.status == "APPROVED",
                Training.end_date >= date.today()
            )) \
            .order_by(Training.end_date.asc()) \
            .limit(5)

        upcoming_res = (await db.execute(upcoming_stmt)).all()
        upcoming_deadlines = [{"title": r.title, "due_date": r.end_date} for r in upcoming_res]

        next_week = date.today() + timedelta(days=7)
        calendar_stmt = select(Training.title, Training.start_date) \
            .join(Enrollment, Enrollment.training_id == Training.id) \
            .where(and_(
                Enrollment.employee_id == emp_id,
                Enrollment.status == "APPROVED",
                Training.start_date >= date.today(),
                Training.start_date <= next_week
            ))

        calendar_res = (await db.execute(calendar_stmt)).all()
        weekly_calendar = [{"day": r.start_date.strftime("%a"), "event": r.title} for r in calendar_res if r.start_date]

        skills_stmt = select(Training.skills_covered, func.avg(Enrollment.progress).label("prog")) \
            .join(Enrollment, Enrollment.training_id == Training.id) \
            .where(and_(
                Enrollment.employee_id == emp_id,
                Enrollment.status == "COMPLETED",
                Training.skills_covered != None
            )) \
            .group_by(Training.skills_covered)

        skills_res = (await db.execute(skills_stmt)).all()
        skills_map = {}
        for r in skills_res:
            if not r.skills_covered: continue
            prog_val = int(r.prog or 0)
            for s in r.skills_covered.split(","):
                s = s.strip()
                if not s: continue
                if s not in skills_map:
                    skills_map[s] = {"progress": prog_val, "count": 1}
                else:
                    skills_map[s]["progress"] = (skills_map[s]["progress"] + prog_val) // 2
                    skills_map[s]["count"] += 1

        skills = [
            SkillProgress(skill=s, level=min(5, data["count"]), progress=data["progress"])
            for s, data in skills_map.items()
        ]
        if not skills:
            skills = [
                SkillProgress(skill="Communication", level=1, progress=20),
                SkillProgress(skill="Technical", level=1, progress=10)
            ]

        rec_stmt = select(Training.id, Training.title, Training.training_type) \
            .where(and_(
                or_(Training.is_global == True, Training.departments.any(Department.id == employee.department_id)),
                Training.status == TrainingStatus.SCHEDULED,
                ~Training.id.in_(select(Enrollment.training_id).where(Enrollment.employee_id == emp_id))
            )) \
            .limit(3)

        rec_res = (await db.execute(rec_stmt)).all()
        recommendations = [{"id": str(r.id), "title": r.title, "type": r.training_type} for r in rec_res]
        fy, learning_contributions = await AnalyticsService.get_fy_learning_contributions(db, [emp_id])

        return EmployeeDashboardData(
            active_courses_count=active_count,
            completed_courses_count=completed_count,
            missed_courses_count=missed_count,
            overall_progress=overall_progress,
            upcoming_deadlines=upcoming_deadlines,
            weekly_calendar=weekly_calendar,
            skills=skills[:4],
            points=total_points,
            streak_days=employee.streak_count,
            badges_count=badges_count,
            recommendations=recommendations,
            pending_effectiveness=pending_eff,
            annual_learning_goal=AnalyticsService.build_annual_learning_goal(
                fy, learning_contributions.get(emp_id, [])
            ),
        )

    @staticmethod
    async def get_manager_dashboard(db: AsyncSession, current_user) -> ManagerDashboardData:
        user_role = current_user.role.name.lower() if current_user.role else ""
        emp_id = current_user.employee_id

        if user_role == "admin":
             # Admin can see all teams, but let's default to no manager filter or just one?
             # For dashboard, usually they see global stats. But this method is 'manager_dashboard'.
             # Requirement says "Manager: team data".
             team_stmt = select(Employee).options(selectinload(Employee.department)).where(Employee.deleted_at == None)
        else:
             team_stmt = select(Employee).options(selectinload(Employee.department)).where(
                 and_(Employee.manager_id == emp_id, Employee.deleted_at == None)
             )

        team_res = await db.execute(team_stmt)
        team_members = team_res.scalars().all()
        
        team_progress_list = []
        total_hours = 0.0
        overdue_count = 0
        at_risk_count = 0
        
        if team_members:
            team_member_ids = [m.id for m in team_members]
            
            total_enr_stmt = select(Enrollment.employee_id, func.count(Enrollment.id).label('total')) \
                .where(Enrollment.employee_id.in_(team_member_ids)) \
                .group_by(Enrollment.employee_id)
            total_enr_res = {r.employee_id: r.total for r in (await db.execute(total_enr_stmt)).all()}

            comp_enr_stmt = select(Enrollment.employee_id, func.count(Enrollment.id).label('comp')) \
                .where(and_(Enrollment.employee_id.in_(team_member_ids), Enrollment.status == "COMPLETED")) \
                .group_by(Enrollment.employee_id)
            comp_enr_res = {r.employee_id: r.comp for r in (await db.execute(comp_enr_stmt)).all()}

            hours_stmt = select(Enrollment.employee_id, func.sum(Training.duration_hours).label('hours')) \
                .join(Training, Training.id == Enrollment.training_id) \
                .where(and_(Enrollment.employee_id.in_(team_member_ids), Enrollment.status == "COMPLETED")) \
                .group_by(Enrollment.employee_id)
            hours_res = {r.employee_id: (r.hours or 0.0) for r in (await db.execute(hours_stmt)).all()}

            overdue_stmt = select(Enrollment.employee_id, func.count(Enrollment.id).label('overdue')) \
                .join(Training, Enrollment.training_id == Training.id) \
                .where(and_(
                    Enrollment.employee_id.in_(team_member_ids), 
                    Enrollment.status == "APPROVED", 
                    Training.end_date < date.today()
                )).group_by(Enrollment.employee_id)
            overdue_res = {r.employee_id: r.overdue for r in (await db.execute(overdue_stmt)).all()}

            for member in team_members:
                total_enr = total_enr_res.get(member.id, 0)
                comp_enr = comp_enr_res.get(member.id, 0)
                rate = (comp_enr / total_enr * 100) if total_enr else 0.0
                
                member_hours = hours_res.get(member.id, 0.0)
                total_hours += member_hours
                
                status = "active"
                
                member_overdue = overdue_res.get(member.id, 0)
                if member_overdue > 0:
                    status = "at-risk"
                    overdue_count += 1
                
                if status == "at-risk": at_risk_count += 1

                team_progress_list.append(TeamMemberProgress(
                    id=str(member.id),
                    name=f"{member.first_name} {member.last_name}",
                    department=member.department.name if member.department else "N/A",
                    completion_rate=round(rate, 2),
                    status=status,
                    hours_completed=member_hours
                ))

        pending_reviews = 0
        if team_members:
            team_member_ids = [m.id for m in team_members]
            pending_reviews = (await db.execute(
                select(func.count(Effectiveness.id))
                .where(and_(
                    Effectiveness.employee_id.in_(team_member_ids),
                    Effectiveness.status == EffectivenessStatus.SUBMITTED
                ))
            )).scalar() or 0

        return ManagerDashboardData(
            team_progress=team_progress_list,
            avg_completion_rate=round(sum(m.completion_rate for m in team_progress_list)/len(team_progress_list), 2) if team_progress_list else 0.0,
            overdue_count=overdue_count,
            at_risk_count=at_risk_count,
            total_team_hours=total_hours,
            pending_reviews_count=pending_reviews,
            activity_feed=[{"user": "John Doe", "action": "Completed Python Basic", "time": "2 hours ago"}],
            completion_stats={"completed": 12, "ongoing": 5, "dropped": 1}
        )

    @staticmethod
    async def get_admin_dashboard(db: AsyncSession, current_user) -> AdminDashboardData:
        summary = await AnalyticsService.get_summary(db, current_user)

        employees = (await db.execute(
            select(Employee)
            .options(selectinload(Employee.department))
            .where(and_(Employee.deleted_at == None, Employee.status == EmploymentStatus.ACTIVE))
        )).scalars().all()
        employee_ids = [employee.id for employee in employees]
        fy, learning_contributions = await AnalyticsService.get_fy_learning_contributions(db, employee_ids)
        employee_goals = {
            employee.id: AnalyticsService.build_annual_learning_goal(
                fy, learning_contributions.get(employee.id, [])
            )
            for employee in employees
        }
        
        # Real-time KPI calculations
        total_employees_count = len(employees)
        org_target_hours = total_employees_count * 16.0
        org_actual_hours = sum(goal.completed_hours for goal in employee_goals.values())
        org_compliance = (org_actual_hours / org_target_hours * 100.0) if org_target_hours > 0.0 else 0.0
        org_remaining_hours = max(org_target_hours - org_actual_hours, 0.0)
        
        # At Target is >= 16 Hours, Below Target is < 16 Hours
        achieved_employees = sum(1 for goal in employee_goals.values() if goal.completed_hours >= 16.0)
        employees_below_target = sum(1 for goal in employee_goals.values() if goal.completed_hours < 16.0)
        compliance = round(org_compliance, 2)
        
        dept_goal_groups = {}
        for employee in employees:
            dept_name = employee.department.name if employee.department else "Unassigned"
            group = dept_goal_groups.setdefault(dept_name, {"hours": 0.0, "employees": 0, "achieved": 0})
            goal = employee_goals[employee.id]
            group["hours"] += goal.completed_hours
            group["employees"] += 1
            group["achieved"] += int(goal.completed_hours >= 16.0)

        department_goal_achievement = []
        for dept_name, group in sorted(dept_goal_groups.items()):
            dept_actual = group["hours"]
            dept_employees = group["employees"]
            dept_target = dept_employees * 16.0
            dept_compliance = (dept_actual / dept_target * 100.0) if dept_target > 0.0 else 0.0
            dept_remaining = max(dept_target - dept_actual, 0.0)
            
            department_goal_achievement.append({
                "dept": dept_name,
                "hours": round(dept_actual, 1),
                "employees": dept_employees,
                "target_hours": round(dept_target, 1),
                "remaining_hours": round(dept_remaining, 1),
                "completion_percentage": round(dept_compliance, 1),
                "achieved_employees": group["achieved"],
            })

        dept_hours = [{"dept": row["dept"], "hours": row["hours"]} for row in department_goal_achievement]

        top_learners = []
        for employee in sorted(employees, key=lambda item: employee_goals[item.id].completed_hours, reverse=True)[:5]:
            goal = employee_goals[employee.id]
            if goal.completed_hours <= 0:
                continue
            top_learners.append({
                "employee_id": str(employee.id),
                "name": f"{employee.first_name} {employee.last_name}",
                "department": employee.department.name if employee.department else "Unassigned",
                "hours": goal.completed_hours,
                "progress_percentage": goal.progress_percentage,
            })

        from sqlalchemy import String, cast
        p_nominations = (await db.execute(select(func.count(Nomination.id)).where(cast(Nomination.status, String).in_(["pending_manager_approval", "pending_admin_approval"])))).scalar() or 0
        p_reviews = (await db.execute(select(func.count(Effectiveness.id)).where(Effectiveness.status == EffectivenessStatus.SUBMITTED))).scalar() or 0

        roi = {"cost": 5000.0, "savings": 12000.0, "ratio": 2.4}

        charts = await AnalyticsService.get_charts(db, current_user)

        # Real top trainings by enrollment count
        top_trainings_rows = (await db.execute(
            select(Training.title, func.count(Enrollment.id).label("cnt"))
            .join(Enrollment, Enrollment.training_id == Training.id)
            .where(and_(Training.deleted_at == None, Enrollment.deleted_at == None))
            .group_by(Training.id, Training.title)
            .order_by(func.count(Enrollment.id).desc())
            .limit(5)
        )).all()
        top_trainings = [{"title": row.title, "completions": row.cnt} for row in top_trainings_rows]

        # Real top departments by FY learning hours
        top_departments = sorted(
            [{"name": d["dept"], "performance": d["completion_percentage"]} for d in department_goal_achievement],
            key=lambda x: x["performance"],
            reverse=True
        )[:5]

        # Skills gap: real data from department compliance
        skills_gap = [
            {"skill": d["dept"], "gap": round(1.0 - (d["completion_percentage"] / 100), 2)}
            for d in sorted(department_goal_achievement, key=lambda x: x["completion_percentage"])
        ][:8]  # top 8 most-gapped departments as skills proxy

        return AdminDashboardData(
            summary=summary,
            compliance_percentage=compliance,
            skills_gap=skills_gap,
            department_hours=dept_hours,
            monthly_trends=charts.monthly_engagement,
            roi_metrics=roi,
            top_trainings=top_trainings,
            top_departments=top_departments,
            pending_nominations=p_nominations,
            pending_reviews=p_reviews,
            learning_goal={
                "goal_hours": AnalyticsService.LEARNING_GOAL_HOURS,
                "financial_year_label": fy["label"],
                "organization_learning_hours": round(org_actual_hours, 1),
                "organization_target_hours": round(org_target_hours, 1),
                "organization_remaining_hours": round(org_remaining_hours, 1),
                "yearly_completion_percentage": round(org_compliance, 2),
                "achieved_employees": achieved_employees,
                "employees_below_target": employees_below_target,
                "department_goal_achievement": department_goal_achievement,
                "top_learners": top_learners,
            },
        )

    @staticmethod
    async def get_charts(db: AsyncSession, current_user) -> AnalyticsCharts:
        user_role = current_user.role.name.lower() if current_user.role else ""
        emp_id = current_user.employee_id
        
        now = datetime.now()
        monthly_engagement = []
        for i in range(5, -1, -1):
            m = (now.month - i - 1) % 12 + 1
            y = now.year + (now.month - i - 1) // 12
            month_name = date(y, m, 1).strftime("%b")
            start = date(y, m, 1)
            if m == 12:
                end = date(y + 1, 1, 1)
            else:
                end = date(y, m + 1, 1)

            # Training count: for manager/employee scope to trainings they are enrolled in
            if user_role == "manager":
                team_ids = select(Employee.id).where(or_(Employee.manager_id == emp_id, Employee.id == emp_id))
                t_count = (await db.execute(
                    select(func.count(func.distinct(Enrollment.training_id)))
                    .join(Training, Training.id == Enrollment.training_id)
                    .where(and_(
                        Enrollment.employee_id.in_(team_ids),
                        Enrollment.deleted_at == None,
                        Training.start_date >= start,
                        Training.start_date < end,
                        Training.deleted_at == None
                    ))
                )).scalar() or 0
            elif user_role == "employee":
                t_count = (await db.execute(
                    select(func.count(func.distinct(Enrollment.training_id)))
                    .join(Training, Training.id == Enrollment.training_id)
                    .where(and_(
                        Enrollment.employee_id == emp_id,
                        Enrollment.deleted_at == None,
                        Training.start_date >= start,
                        Training.start_date < end,
                        Training.deleted_at == None
                    ))
                )).scalar() or 0
            else:
                t_count = (await db.execute(
                    select(func.count(Training.id))
                    .where(and_(Training.start_date >= start, Training.start_date < end, Training.deleted_at == None))
                )).scalar() or 0
            
            enr_stmt = select(func.count(Enrollment.id)).where(and_(
                Enrollment.created_at >= datetime.combine(start, datetime.min.time()), 
                Enrollment.created_at < datetime.combine(end, datetime.min.time()), 
                Enrollment.deleted_at == None
            ))
            
            if user_role == "manager":
                enr_stmt = enr_stmt.where(Enrollment.employee_id.in_(
                    select(Employee.id).where(or_(Employee.manager_id == emp_id, Employee.id == emp_id))
                ))
            elif user_role == "employee":
                enr_stmt = enr_stmt.where(Enrollment.employee_id == emp_id)

            e_count = (await db.execute(enr_stmt)).scalar() or 0
            monthly_engagement.append(MonthlyEngagement(month=month_name, trainings=t_count, enrollments=e_count))

        dept_stmt = select(Department).where(Department.deleted_at == None)
        depts = (await db.execute(dept_stmt)).scalars().all()
        
        tot_stmt = select(Employee.department_id, func.count(Enrollment.id).label('total')) \
            .join(Enrollment, Enrollment.employee_id == Employee.id) \
            .where(Enrollment.deleted_at == None)
            
        if user_role == "manager":
            tot_stmt = tot_stmt.where(or_(Employee.manager_id == emp_id, Employee.id == emp_id))
        elif user_role == "employee":
            tot_stmt = tot_stmt.where(Employee.id == emp_id)
            
        tot_res = {r.department_id: r.total for r in (await db.execute(tot_stmt.group_by(Employee.department_id))).all()}

        comp_stmt = select(Employee.department_id, func.count(Enrollment.id).label('comp')) \
            .join(Enrollment, Enrollment.employee_id == Employee.id) \
            .where(and_(Enrollment.deleted_at == None, Enrollment.status == "COMPLETED"))

        if user_role == "manager":
            comp_stmt = comp_stmt.where(or_(Employee.manager_id == emp_id, Employee.id == emp_id))
        elif user_role == "employee":
            comp_stmt = comp_stmt.where(Employee.id == emp_id)

        comp_res = {r.department_id: r.comp for r in (await db.execute(comp_stmt.group_by(Employee.department_id))).all()}

        h_stmt = select(Employee.department_id, func.sum(Training.duration_hours).label('hours')) \
            .join(Enrollment, Enrollment.employee_id == Employee.id) \
            .join(Training, Training.id == Enrollment.training_id) \
            .where(Enrollment.status == "COMPLETED")

        if user_role == "manager":
            h_stmt = h_stmt.where(or_(Employee.manager_id == emp_id, Employee.id == emp_id))
        elif user_role == "employee":
            h_stmt = h_stmt.where(Employee.id == emp_id)

        h_res = {r.department_id: (r.hours or 0.0) for r in (await db.execute(h_stmt.group_by(Employee.department_id))).all()}

        dept_performance = []
        for dept in depts:
            total = tot_res.get(dept.id, 0)
            comp = comp_res.get(dept.id, 0)
            hours = h_res.get(dept.id, 0.0)
            rate = (comp / total * 100) if total else 0.0
            if user_role == "admin" or total > 0:
                dept_performance.append(DepartmentPerformance(dept=dept.name, rate=round(rate, 2), hours=hours))

        return AnalyticsCharts(
            monthly_engagement=monthly_engagement,
            department_performance=dept_performance
        )

    @staticmethod
    async def get_manager_summary_v2(db: AsyncSession, current_user) -> ManagerSummary:
        emp_id = current_user.employee_id
        
        # 1. My Team Count
        team_count = (await db.execute(select(func.count(Employee.id)).where(and_(Employee.manager_id == emp_id, Employee.deleted_at == None)))).scalar() or 0
        
        if team_count == 0:
            return ManagerSummary(
                team_count=0,
                active_trainings=0,
                pending_nominations=0,
                overdue_employees=0,
                financial_year_label=AnalyticsService.get_financial_year()["label"],
            )

        team_member_ids_stmt = select(Employee.id).where(and_(Employee.manager_id == emp_id, Employee.deleted_at == None))
        
        # 2. Active Trainings (team-based approved enrollments)
        active_trainings = (await db.execute(
            select(func.count(Enrollment.id))
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Enrollment.status == "APPROVED",
                Enrollment.deleted_at == None
            ))
        )).scalar() or 0
        
        # 3. Pending Nominations (awaiting manager action)
        pending_nominations = (await db.execute(
            select(func.count(Nomination.id))
            .where(and_(
                Nomination.employee_id.in_(team_member_ids_stmt),
                Nomination.status == NominationStatus.PENDING_MANAGER_APPROVAL
            ))
        )).scalar() or 0
        
        # 4. Overdue Employees (approved enrollments where training end_date < today and not completed)
        overdue_employees = (await db.execute(
            select(func.count(func.distinct(Enrollment.employee_id)))
            .join(Training, Training.id == Enrollment.training_id)
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Enrollment.status == "APPROVED",
                Training.end_date < date.today(),
                Enrollment.deleted_at == None
            ))
        )).scalar() or 0
        
        team_member_ids = list((await db.execute(team_member_ids_stmt)).scalars().all())
        fy, learning_contributions = await AnalyticsService.get_fy_learning_contributions(db, team_member_ids)
        learning_hours = [
            AnalyticsService.build_annual_learning_goal(fy, learning_contributions.get(member_id, []))
            for member_id in team_member_ids
        ]
        team_learning_hours = round(sum(goal.completed_hours for goal in learning_hours), 1)
        achieved_count = sum(1 for goal in learning_hours if goal.progress_percentage >= 100)

        # 5. Avg completion rate across the team's enrollments
        total_enr = (await db.execute(
            select(func.count(Enrollment.id))
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Enrollment.deleted_at == None
            ))
        )).scalar() or 0
        completed_enr = (await db.execute(
            select(func.count(Enrollment.id))
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Enrollment.status == "COMPLETED",
                Enrollment.deleted_at == None
            ))
        )).scalar() or 0
        avg_completion_rate = round((completed_enr / total_enr * 100) if total_enr else 0.0, 1)

        return ManagerSummary(
            team_count=team_count,
            active_trainings=active_trainings,
            pending_nominations=pending_nominations,
            overdue_employees=overdue_employees,
            team_learning_hours_fy=team_learning_hours,
            learning_goal_completion_percentage=round((achieved_count / team_count * 100) if team_count else 0.0, 1),
            employees_below_learning_target=max(team_count - achieved_count, 0),
            financial_year_label=fy["label"],
            avg_completion_rate=avg_completion_rate,
        )

    @staticmethod
    async def get_manager_charts_v2(db: AsyncSession, current_user) -> ManagerCharts:
        emp_id = current_user.employee_id
        team_member_ids_stmt = select(Employee.id).where(and_(Employee.manager_id == emp_id, Employee.deleted_at == None))
        
        # Completion Rate (Completed vs Pending/Approved)
        completed = (await db.execute(
            select(func.count(Enrollment.id))
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Enrollment.status == "COMPLETED",
                Enrollment.deleted_at == None
            ))
        )).scalar() or 0
        
        pending = (await db.execute(
            select(func.count(Enrollment.id))
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Enrollment.status == "APPROVED",
                Enrollment.deleted_at == None
            ))
        )).scalar() or 0
        
        # Training Participation (Top 5 trainings by participation in the team)
        participation_stmt = select(Training.title, func.count(Enrollment.id).label('count')) \
            .join(Enrollment, Enrollment.training_id == Training.id) \
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Enrollment.deleted_at == None
            )) \
            .group_by(Training.title) \
            .order_by(func.count(Enrollment.id).desc()) \
            .limit(5)
        
        participation_res = (await db.execute(participation_stmt)).all()
        participation = [ParticipationChart(training_name=r.title, participation_count=r.count) for r in participation_res]
        
        return ManagerCharts(
            completion_rate={"completed": completed, "pending": pending},
            participation=participation
        )

    @staticmethod
    async def get_manager_team_v2(db: AsyncSession, current_user, page: int = 1, limit: int = 10) -> TeamDataResponse:
        emp_id = current_user.employee_id
        
        # Subquery for member stats — only count APPROVED+COMPLETED enrollments.
        # Counting ALL statuses (PENDING/REJECTED/WITHDRAWN) inflates total_enr,
        # making completion_percentage appear as 0% when it should be 100%.
        stats_sub = select(
            Enrollment.employee_id,
            func.sum(
                case((Enrollment.status.in_(["APPROVED", "COMPLETED"]), 1), else_=0)
            ).label('total_enr'),
            func.sum(case((Enrollment.status == "COMPLETED", 1), else_=0)).label('completed_enr'),
            func.avg(Enrollment.progress).label('avg_prog')
        ).where(Enrollment.deleted_at == None).group_by(Enrollment.employee_id).subquery()

        # Subquery for overdue count per member
        overdue_sub = select(
            Enrollment.employee_id,
            func.count(Enrollment.id).label('overdue_count')
        ).join(Training, Training.id == Enrollment.training_id) \
         .where(and_(
             Enrollment.status == "APPROVED",
             Training.end_date < date.today(),
             Enrollment.deleted_at == None
         )).group_by(Enrollment.employee_id).subquery()

        # Fetch ALL team members without pagination limit.
        # Pagination is applied in Python AFTER sorting by FY learning hours, since
        # those hours are computed post-query from get_fy_learning_contributions.
        # Applying LIMIT/OFFSET in SQL before sorting produces wrong paginated results.
        stmt = select(
            Employee,
            func.coalesce(stats_sub.c.total_enr, 0).label('total_enr'),
            func.coalesce(stats_sub.c.completed_enr, 0).label('completed_enr'),
            func.coalesce(stats_sub.c.avg_prog, 0).label('avg_prog'),
            func.coalesce(overdue_sub.c.overdue_count, 0).label('overdue_count')
        ).outerjoin(stats_sub, stats_sub.c.employee_id == Employee.id) \
         .outerjoin(overdue_sub, overdue_sub.c.employee_id == Employee.id) \
         .options(selectinload(Employee.department)) \
         .where(and_(Employee.manager_id == emp_id, Employee.deleted_at == None))

        # Total count
        total_count = (await db.execute(select(func.count(Employee.id)).where(and_(Employee.manager_id == emp_id, Employee.deleted_at == None)))).scalar() or 0
        
        res = await db.execute(stmt)
        results = res.all()
        page_employee_ids = [r.Employee.id for r in results]
        fy, learning_contributions = await AnalyticsService.get_fy_learning_contributions(db, page_employee_ids)
        
        member_rows = []
        for r in results:
            m = r.Employee
            total_enr = r.total_enr
            completed_enr = r.completed_enr or 0
            overdue_count = r.overdue_count
            
            completion_percentage = (completed_enr / total_enr * 100.0) if total_enr else 0.0
            status = "At risk" if overdue_count > 0 else "On track"
            learning_goal = AnalyticsService.build_annual_learning_goal(
                fy, learning_contributions.get(m.id, [])
            )
            
            member_rows.append(TeamMemberRow(
                id=str(m.id),
                name=f"{m.first_name} {m.last_name}",
                department=m.department.name if m.department else "N/A",
                trainings_assigned=total_enr,
                completion_percentage=round(float(completion_percentage), 1),
                status=status,
                learning_hours_fy=learning_goal.completed_hours,
                learning_goal_progress=learning_goal.progress_percentage,
                below_learning_target=learning_goal.progress_percentage < 100,
            ))
            
        # Sort by FY learning hours DESC, then completion % DESC (in Python, since
        # FY hours are computed post-query and can't be used in SQL ORDER BY with LIMIT)
        member_rows.sort(key=lambda r: (r.learning_hours_fy, r.completion_percentage), reverse=True)
        # Apply pagination slice after sorting
        start = (page - 1) * limit
        paginated = member_rows[start : start + limit]
        return TeamDataResponse(members=paginated, total_count=total_count)


    @staticmethod
    async def get_manager_leaderboard(db: AsyncSession, current_user) -> List[TeamMemberRow]:
        emp_id = current_user.employee_id
        
        # Subquery for member stats — only count APPROVED+COMPLETED enrollments.
        stats_sub = select(
            Enrollment.employee_id,
            func.sum(
                case((Enrollment.status.in_(["APPROVED", "COMPLETED"]), 1), else_=0)
            ).label('total_enr'),
            func.sum(case((Enrollment.status == "COMPLETED", 1), else_=0)).label('completed_enr'),
            func.avg(Enrollment.progress).label('avg_prog')
        ).where(Enrollment.deleted_at == None).group_by(Enrollment.employee_id).subquery()

        # Subquery for overdue count per member
        overdue_sub = select(
            Enrollment.employee_id,
            func.count(Enrollment.id).label('overdue_count')
        ).join(Training, Training.id == Enrollment.training_id) \
         .where(and_(
             Enrollment.status == "APPROVED",
             Training.end_date < date.today(),
             Enrollment.deleted_at == None
         )).group_by(Enrollment.employee_id).subquery()

        # Main query for ALL team members — ordered by FY hours DESC then completion % DESC
        stmt = select(
            Employee,
            func.coalesce(stats_sub.c.total_enr, 0).label('total_enr'),
            func.coalesce(stats_sub.c.completed_enr, 0).label('completed_enr'),
            func.coalesce(stats_sub.c.avg_prog, 0).label('avg_prog'),
            func.coalesce(overdue_sub.c.overdue_count, 0).label('overdue_count')
        ).outerjoin(stats_sub, stats_sub.c.employee_id == Employee.id) \
         .outerjoin(overdue_sub, overdue_sub.c.employee_id == Employee.id) \
         .options(selectinload(Employee.department)) \
         .where(and_(Employee.manager_id == emp_id, Employee.deleted_at == None))

        res = await db.execute(stmt)
        results = res.all()
        all_employee_ids = [r.Employee.id for r in results]
        
        fy, learning_contributions = await AnalyticsService.get_fy_learning_contributions(db, all_employee_ids)
        
        member_rows = []
        for r in results:
            m = r.Employee
            total_enr = r.total_enr
            completed_enr = r.completed_enr or 0
            overdue_count = r.overdue_count
            
            completion_percentage = (completed_enr / total_enr * 100.0) if total_enr else 0.0
            status = "At risk" if overdue_count > 0 else "On track"
            learning_goal = AnalyticsService.build_annual_learning_goal(
                fy, learning_contributions.get(m.id, [])
            )
            
            member_rows.append(TeamMemberRow(
                id=str(m.id),
                name=f"{m.first_name} {m.last_name}",
                department=m.department.name if m.department else "N/A",
                trainings_assigned=total_enr,
                completion_percentage=round(float(completion_percentage), 1),
                status=status,
                learning_hours_fy=learning_goal.completed_hours,
                learning_goal_progress=learning_goal.progress_percentage,
                below_learning_target=learning_goal.progress_percentage < 100,
            ))

        # Sort by FY learning hours DESC, then completion % DESC
        member_rows.sort(key=lambda r: (r.learning_hours_fy, r.completion_percentage), reverse=True)
        return member_rows


    @staticmethod
    async def get_manager_activity_v2(db: AsyncSession, current_user) -> List[ManagerDashboardActivity]:
        emp_id = current_user.employee_id
        team_member_ids_stmt = select(Employee.id).where(and_(Employee.manager_id == emp_id, Employee.deleted_at == None))
        

        activities = []
        
        # Recent Nominations
        nom_stmt = select(Nomination, Employee.first_name, Employee.last_name, Training.title) \
            .join(Employee, Nomination.employee_id == Employee.id) \
            .join(Training, Nomination.training_id == Training.id) \
            .where(Nomination.employee_id.in_(team_member_ids_stmt)) \
            .order_by(Nomination.created_at.desc()) \
            .limit(5)
        
        nom_res = (await db.execute(nom_stmt)).all()
        for r in nom_res:
            activities.append(ManagerDashboardActivity(
                type="nomination",
                user=f"{r.first_name} {r.last_name}",
                detail=f"Nominated for {r.title}",
                time=r.Nomination.created_at
            ))
            
        # Recent Completions
        comp_stmt = select(Enrollment, Employee.first_name, Employee.last_name, Training.title) \
            .join(Employee, Enrollment.employee_id == Employee.id) \
            .join(Training, Enrollment.training_id == Training.id) \
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Enrollment.status == "COMPLETED"
            )) \
            .order_by(Enrollment.updated_at.desc()) \
            .limit(5)
            
        comp_res = (await db.execute(comp_stmt)).all()
        for r in comp_res:
            activities.append(ManagerDashboardActivity(
                type="completion",
                user=f"{r.first_name} {r.last_name}",
                detail=f"Completed {r.title}",
                time=r.Enrollment.updated_at
            ))
            
        # Sort by time and limit
        activities.sort(key=lambda x: x.time, reverse=True)
        return activities[:10]

    @staticmethod
    async def get_manager_pending_reviews_v2(db: AsyncSession, current_user) -> List[PendingReviewRow]:
        emp_id = current_user.employee_id
        team_member_ids_stmt = select(Employee.id).where(and_(Employee.manager_id == emp_id, Employee.deleted_at == None))
        
        # Pending Reviews (Effectiveness records in SUBMITTED status for team members)
        # Note: Effectiveness joins to Enrollment to get Employee
        review_stmt = select(Effectiveness, Employee.first_name, Employee.last_name, Training.title) \
            .join(Enrollment, Effectiveness.enrollment_id == Enrollment.id) \
            .join(Employee, Enrollment.employee_id == Employee.id) \
            .join(Training, Effectiveness.training_id == Training.id) \
            .where(and_(
                Enrollment.employee_id.in_(team_member_ids_stmt),
                Effectiveness.status == EffectivenessStatus.SUBMITTED
            )) \
            .order_by(Effectiveness.created_at.desc())
            
        review_res = (await db.execute(review_stmt)).all()
        return [PendingReviewRow(
            id=str(r.Effectiveness.id),
            employee_name=f"{r.first_name} {r.last_name}",
            training_name=r.title,
            submission_date=r.Effectiveness.created_at
        ) for r in review_res]

    @staticmethod
    async def get_unified_manager_dashboard(db: AsyncSession, current_user) -> UnifiedManagerDashboard:
        # NOTE: asyncio.gather() cannot be used here because all coroutines share
        # the same AsyncSession, which is NOT concurrency-safe. Running them
        # concurrently causes 'cannot use Connection.transaction() in a manually
        # started transaction' errors. Run sequentially instead.
        summary = await AnalyticsService.get_manager_summary_v2(db, current_user)
        charts = await AnalyticsService.get_manager_charts_v2(db, current_user)
        team = await AnalyticsService.get_manager_team_v2(db, current_user, page=1, limit=10)
        activity = await AnalyticsService.get_manager_activity_v2(db, current_user)
        reviews = await AnalyticsService.get_manager_pending_reviews_v2(db, current_user)
        leaderboard = await AnalyticsService.get_manager_leaderboard(db, current_user)

        return UnifiedManagerDashboard(
            summary=summary,
            charts=charts,
            team=team,
            activity=activity,
            pending_reviews=reviews,
            leaderboard=leaderboard
        )




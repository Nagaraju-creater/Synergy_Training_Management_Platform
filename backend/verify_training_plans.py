import asyncio
from datetime import date, timedelta
from app.database import AsyncSessionLocal
from app.training_plans.service import TrainingPlanService
from app.training_plans.schemas import TrainingPlanCreate, TrainingPlanUpdate
from app.training_plans.models import TrainingPlan, TrainingPlanStatus
from app.trainings.models import Training, TrainingStatus
from app.trainings.categories import TrainingCategory
from app.trainings.schemas import TrainingCreate
from app.utils.exceptions import BadRequestException, ForbiddenException, UnauthorizedException
from sqlalchemy import select, delete

# Import all models to prevent clsregistry mapper issues
from app.users.models import User
from app.roles.models import Role
from app.employees.models import Employee
from app.departments.models import Department, DepartmentHead
from app.enrollments.models import Enrollment
from app.nominations.models import Nomination
from app.effectiveness.models import Effectiveness
from app.effectiveness.reviews import DepartmentReview
from app.attendance.models import AttendanceSession, AttendanceRecord, AttendanceLog
from app.notifications.models import Notification
from app.signatures.models import DigitalSignature
from app.gamification.models import Achievement, LeaderboardPoint
from app.audit.models import AuditLog
from app.analytics.models import AnalyticsSnapshot

async def verify():
    print("Starting Training Plan Verification Script...")
    async with AsyncSessionLocal() as db:
        # Find an Admin user
        admin_res = await db.execute(select(User).join(Role, User.role_id == Role.id).where(Role.name == "admin").limit(1))
        admin = admin_res.scalar_one_or_none()
        if not admin:
            # Fallback to any user
            user_res = await db.execute(select(User).limit(1))
            admin = user_res.scalar_one_or_none()
            if not admin:
                print("No user found in database. Cannot run test.")
                return
            print(f"No admin found. Using fallback user: {admin.email}")
        else:
            print(f"Found admin user: {admin.email}")

        # Get or create a category
        cat_res = await db.execute(select(TrainingCategory).limit(1))
        category = cat_res.scalar_one_or_none()
        if not category:
            from app.trainings.schemas import TrainingCategoryCreate
            from app.trainings.service import TrainingService
            category = await TrainingService.create_category(db, TrainingCategoryCreate(
                name="AI & Analytics",
                description="Artificial Intelligence and Data Analytics courses"
            ))
            await db.commit()
            print(f"Created category: {category.name}")
        else:
            print(f"Using category: {category.name}")

        # 1. Create a planned training
        planned_date = date.today() + timedelta(days=30)
        payload = TrainingPlanCreate(
            training_title="Strategic Analytics Workshop",
            category_id=category.id,
            planned_date=planned_date,
            description="Strategic annual alignment for AI models",
            financial_year="FY 2026-27"
        )

        plan = await TrainingPlanService.create(db, payload, admin.id)
        await db.commit()
        print(f"Successfully created TrainingPlan: ID={plan.id}, Status={plan.status}")

        # 2. Get all and verify listing
        plans = await TrainingPlanService.get_all(db, financial_year="FY 2026-27")
        print(f"Fetched plans for FY 2026-27. Count: {len(plans)}")
        
        # Verify our specific plan in the list
        created_plan_in_list = next((p for p in plans if p.id == plan.id), None)
        assert created_plan_in_list is not None, "Expected created plan to be in list"
        assert created_plan_in_list.status == TrainingPlanStatus.PLANNED, f"Expected initial status to be Planned, got {created_plan_in_list.status}"

        # 3. Get Stats and verify stats calculations
        stats = await TrainingPlanService.get_stats(db, "FY 2026-27")
        print(f"Fetched Stats: {stats}")
        assert stats["total_planned"] >= 1, "Expected total planned >= 1"
        assert stats["pending"] >= 1, "Expected pending plans >= 1"

        # 4. Convert planned training to live scheduled training
        convert_payload = TrainingCreate(
            title="Strategic Analytics Workshop (Live)",
            description="Strategic annual alignment for AI models",
            category_id=category.id,
            start_date=planned_date,
            start_time="09:00 AM",
            end_date=planned_date,
            duration_hours=4.0,
            delivery_mode="ONLINE",
            meeting_link="https://zoom.us/test",
            max_participants=25,
            is_global=True,
            is_mandatory=False,
            training_type="INTERNAL",
            status="DRAFT" # Starts as draft
        )

        converted_plan = await TrainingPlanService.convert_to_training(db, plan.id, convert_payload, admin.id)
        await db.commit()
        print(f"Plan converted successfully! Plan ID={converted_plan.id}, Converted Status={converted_plan.status}, Live Training ID={converted_plan.converted_training_id}")
        assert converted_plan.status == TrainingPlanStatus.CONVERTED, f"Expected status CONVERTED, got {converted_plan.status}"
        assert converted_plan.converted_training_id is not None, "Expected converted_training_id to be populated"

        # Store IDs locally to avoid accessing expired attributes later
        plan_id_val = plan.id
        training_id_val = converted_plan.converted_training_id

        # 5. Verify dynamic status synchronization to COMPLETED when training is completed
        # Fetch the live training and manually update start/end date to past to trigger compute COMPLETED
        stmt = select(Training).where(Training.id == training_id_val)
        t_res = await db.execute(stmt)
        live_training = t_res.scalar_one()
        
        # Move training date to the past and publish it so it transitions
        past_date = date.today() - timedelta(days=10)
        live_training.start_date = past_date
        live_training.end_date = past_date
        live_training.status = TrainingStatus.SCHEDULED # Publish it to SCHEDULED so compute_status works
        
        await db.flush()
        
        # Clear database session to force reloading clean data from database
        db.expire_all()
        
        # Verify that get_all/get_by_id automatically syncs the plan status to Completed
        synced_plan = await TrainingPlanService.get_by_id(db, plan_id_val)
        
        # Print debug after reload
        print(f"[Debug after reload] synced_plan status: {synced_plan.status}")
        if synced_plan.converted_training:
            print(f"[Debug after reload] converted_training status: {synced_plan.converted_training.status}")
            print(f"[Debug after reload] converted_training start: {synced_plan.converted_training.start_date}")
        else:
            print("[Debug after reload] converted_training is None!")

        print(f"After moving training date to past: Synced Plan Status={synced_plan.status}")
        assert synced_plan.status == TrainingPlanStatus.COMPLETED, f"Expected plan status COMPLETED after training ended, got {synced_plan.status}"

        # Clean up database entries
        await db.execute(delete(TrainingPlan).where(TrainingPlan.id == plan_id_val))
        await db.execute(delete(Training).where(Training.id == training_id_val))
        
        # Clean up any leftover plans from failed runs to keep DB clean
        await db.execute(delete(TrainingPlan).where(TrainingPlan.training_title == "Strategic Analytics Workshop"))
        
        await db.commit()
        print("Cleaned up database test records successfully. Verification complete!")

if __name__ == "__main__":
    asyncio.run(verify())

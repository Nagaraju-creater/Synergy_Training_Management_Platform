import asyncio
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.users.models import User
from app.roles.models import Role
from app.employees.models import Employee
from app.departments.models import Department

# Import everything to avoid relationship issues
from app.nominations.models import Nomination
from app.trainings.models import Training
from app.effectiveness.models import Effectiveness
from app.signatures.models import DigitalSignature
from app.notifications.models import Notification
from app.enrollments.models import Enrollment
from app.audit.models import AuditLog
from app.attendance.models import Attendance
from app.gamification.models import Achievement, LeaderboardPoint
from app.analytics.models import AnalyticsSnapshot
from app.trainings.categories import TrainingCategory
from app.effectiveness.reviews import DepartmentReview
import uuid

async def fix_roles_and_managers():
    async with AsyncSessionLocal() as db:
        print("\n=== STEP 1: ROLES CLEANUP (RAW SQL) ===")
        # 1. Ensure target roles exist
        for name in ["admin", "manager", "employee"]:
            res = await db.execute(select(Role).where(Role.name == name))
            if not res.scalar():
                print(f"Creating role: {name}")
                new_role = Role(id=uuid.uuid4(), name=name)
                db.add(new_role)
        await db.commit()

        # 2. Re-fetch all roles to get IDs
        res = await db.execute(select(Role))
        roles = res.scalars().all()
        admin_role = next(r for r in roles if r.name == "admin")
        manager_role = next(r for r in roles if r.name == "manager")
        employee_role = next(r for r in roles if r.name == "employee")

        # 3. Consolidate users from duplicate/other roles
        for r in roles:
            if r.id in [admin_role.id, manager_role.id, employee_role.id]:
                continue
            
            target = employee_role
            if r.name.lower() == "admin":
                target = admin_role
            elif r.name.lower() == "manager":
                target = manager_role
            
            print(f"Merging users from '{r.name}' to '{target.name}'")
            await db.execute(text("UPDATE users SET role_id = :target_id WHERE role_id = :old_id"), 
                             {"target_id": target.id, "old_id": r.id})
            await db.execute(text("DELETE FROM roles WHERE id = :old_id"), {"old_id": r.id})
        
        await db.commit()
        print("Roles consolidated.")

        print("\n=== STEP 2: PROMOTING MANAGERS ===")
        # Find anyone who is a Dept Head or has direct reports
        stmt = text("""
            SELECT DISTINCT user_id, first_name, last_name 
            FROM employees 
            WHERE id IN (SELECT head_id FROM departments WHERE head_id IS NOT NULL)
               OR id IN (SELECT DISTINCT manager_id FROM employees WHERE manager_id IS NOT NULL)
        """)
        mgr_res = await db.execute(stmt)
        mgr_rows = mgr_res.all()
        
        promoted = 0
        for row in mgr_rows:
            uid, fname, lname = row
            if not uid: continue
            
            # Check current role
            u_res = await db.execute(select(User).where(User.id == uid))
            user = u_res.scalar_one_or_none()
            if user:
                if user.role_id == employee_role.id:
                    print(f"Promoting {fname} {lname} to Manager")
                    user.role_id = manager_role.id
                    promoted += 1
                elif user.role_id == admin_role.id:
                    print(f"Skipping {fname} {lname} (Already Admin)")
        
        await db.commit()
        print(f"Finished! {promoted} users promoted to Manager.")

if __name__ == "__main__":
    asyncio.run(fix_roles_and_managers())

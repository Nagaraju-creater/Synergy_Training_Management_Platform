"""
reset_all_passwords.py
----------------------
Resets the password of EVERY user (employees, managers, admins)
in the database to: Welcome@123
"""

import asyncio
from sqlalchemy import select
import app.models.registry  # noqa: F401  – ensures all mappers are registered
from app.database import AsyncSessionLocal
from app.users.models import User
from app.roles.models import Role
from app.users.service import UserService

NEW_PASSWORD = "Welcome@123"


async def reset_all_passwords():
    async with AsyncSessionLocal() as db:
        # Fetch all users with their roles
        result = await db.execute(
            select(User, Role)
            .join(Role, User.role_id == Role.id, isouter=True)
        )
        rows = result.all()

        if not rows:
            print("No users found in the database.")
            return

        new_hash = UserService.hash_password(NEW_PASSWORD)
        print(f"\nResetting passwords to '{NEW_PASSWORD}' for all users...\n")

        counts = {"admin": 0, "manager": 0, "employee": 0, "unknown": 0}

        for user, role in rows:
            role_name = (role.name.lower() if role else "unknown")
            user.hashed_password = new_hash
            db.add(user)
            counts[role_name if role_name in counts else "unknown"] += 1
            print(f"  [OK] [{role_name.upper():8}]  {user.full_name or user.email}  <{user.email}>")

        await db.commit()

        print("\n" + "=" * 60)
        print(f"  Password reset complete!  New password -> '{NEW_PASSWORD}'")
        print(f"  Admins   updated : {counts['admin']}")
        print(f"  Managers updated : {counts['manager']}")
        print(f"  Employees updated: {counts['employee']}")
        if counts["unknown"]:
            print(f"  Unknown role     : {counts['unknown']}")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(reset_all_passwords())

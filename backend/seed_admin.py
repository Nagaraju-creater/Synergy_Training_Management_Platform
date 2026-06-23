import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from app.users.models import User
from app.roles.models import Role
from app.users.service import UserService
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Ensure 'admin' role exists
        res = await db.execute(select(Role).where(Role.name == 'admin'))
        admin_role = res.scalar_one_or_none()
        
        if not admin_role:
            print("Creating 'admin' role...")
            admin_role = Role(name='admin', description='System Administrator')
            db.add(admin_role)
            await db.flush()
        
        # 2. Ensure admin user exists
        res = await db.execute(select(User).where(User.email == 'admin@example.com'))
        admin_user = res.scalar_one_or_none()
        
        if not admin_user:
            print("Creating admin user (admin@example.com / Welcome@123)...")
            admin_user = User(
                email='admin@example.com',
                full_name='System Admin',
                role_id=admin_role.id,
                hashed_password=UserService.hash_password('Welcome@123'),
                is_active=True,
                is_verified=True
            )
            db.add(admin_user)
        
        await db.commit()
        print("Seed completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())


import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, name FROM roles"))
        roles = res.all()
        print("Roles:")
        for r in roles:
            print(f"  {r.id}: {r.name}")
        
        res = await conn.execute(text("SELECT email, role_id FROM users WHERE email IN ('admin@trainiq.com', 'admin@synergyglobal.in')"))
        users = res.all()
        print("\nAdmin Users:")
        for u in users:
            print(f"  {u.email}: Role ID {u.role_id}")

if __name__ == "__main__":
    asyncio.run(main())

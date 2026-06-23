import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry
from app.audit.models import AuditLog

async def check_logs():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(AuditLog)
            .where(AuditLog.action == "login_failed")
            .order_by(AuditLog.created_at.desc())
            .limit(10)
        )
        logs = res.scalars().all()
        print("Recent Login Failures:")
        for log in logs:
            print(f"- Time: {log.created_at}, Email: {log.details.get('email')}, IP: {log.ip_address}")

if __name__ == "__main__":
    asyncio.run(check_logs())

import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
import app.models.registry
from app.audit.models import AuditLog

async def check_logs():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(100)
        )
        logs = res.scalars().all()
        print("Recent Logs:")
        for log in logs:
            email = log.details.get('email') if log.details else None
            if email and "balanbalraj" in email:
                print(f"- Time: {log.created_at}, Action: {log.action}, Details: {log.details}")

if __name__ == "__main__":
    asyncio.run(check_logs())

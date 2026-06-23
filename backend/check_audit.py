import asyncio
import app.models.registry  # noqa: F401
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.audit.models import AuditLog

async def main():
    async with AsyncSessionLocal() as db:
        logs = (await db.execute(select(AuditLog))).scalars().all()
        print(f"Total audit logs: {len(logs)}")
        for l in logs:
            print(f"- {l.action} (Entity: {l.entity_type}, ID: {l.entity_id}, Details: {l.details})")

if __name__ == "__main__":
    asyncio.run(main())

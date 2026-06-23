
import asyncio
from sqlalchemy import inspect
from app.database import engine

async def main():
    async with engine.connect() as conn:
        def get_inspect(sync_conn):
            ins = inspect(sync_conn)
            for table in ['nominations', 'enrollments']:
                print(f"\nTable: {table}")
                print(f"Unique Constraints: {ins.get_unique_constraints(table)}")
                print(f"Foreign Keys: {ins.get_foreign_keys(table)}")
                print(f"Indexes: {ins.get_indexes(table)}")
            
        await conn.run_sync(get_inspect)

if __name__ == "__main__":
    asyncio.run(main())

"""
Migration script: Add new columns to training_effectiveness table.
Run: python alter_db_effectiveness.py
"""
import asyncio
import asyncpg
import os
import sys

# Load environment (try .env file)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/training_platform")


MIGRATIONS = [
    # Add OVERDUE to effectivenessstatus enum (PostgreSQL doesn't auto-add enum values)
    """
    DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'OVERDUE'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'effectivenessstatus')
        ) THEN
            ALTER TYPE effectivenessstatus ADD VALUE 'OVERDUE';
        END IF;
    END $$;
    """,
    # Add completion_datetime column
    """
    ALTER TABLE training_effectiveness
    ADD COLUMN IF NOT EXISTS completion_datetime TIMESTAMP WITH TIME ZONE;
    """,
    # Add is_24h_reminder_sent column
    """
    ALTER TABLE training_effectiveness
    ADD COLUMN IF NOT EXISTS is_24h_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
    """,
    # Add is_6h_reminder_sent column
    """
    ALTER TABLE training_effectiveness
    ADD COLUMN IF NOT EXISTS is_6h_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
    """,
]


async def run_migrations():
    # asyncpg uses postgresql:// not postgresql+asyncpg://
    url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace("postgresql+psycopg2://", "postgresql://")
    
    print(f"Connecting to database...")
    try:
        conn = await asyncpg.connect(url)
    except Exception as e:
        print(f"ERROR: Could not connect to database: {e}")
        sys.exit(1)
    
    try:
        for i, sql in enumerate(MIGRATIONS, 1):
            try:
                await conn.execute(sql)
                print(f"  [OK] Migration {i}/{len(MIGRATIONS)} applied successfully")
            except Exception as e:
                print(f"  [SKIP] Migration {i} skipped or already applied: {e}")
        
        # Verify the columns exist
        cols = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'training_effectiveness'
            ORDER BY ordinal_position;
        """)
        print("\ntraining_effectiveness columns:")
        for col in cols:
            print(f"   - {col['column_name']}: {col['data_type']}")
        
        # Verify enum values
        enum_vals = await conn.fetch("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'effectivenessstatus')
            ORDER BY enumsortorder;
        """)
        if enum_vals:
            print(f"\nEffectivenessStatus enum values: {[r['enumlabel'] for r in enum_vals]}")
        
        print("\n[DONE] All migrations completed successfully!")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migrations())

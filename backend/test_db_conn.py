import asyncio
import asyncpg
import sys

async def main():
    try:
        conn = await asyncpg.connect("postgresql://postgres:Postgres%40123@localhost:5432/training_db")
        print("Successfully connected to the database!")
        await conn.close()
    except Exception as e:
        print(f"Failed to connect: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect(
            user='postgres',
            password='Postgres@123',
            host='localhost',
            port=5432,
            database='postgres'
        )
        # Avoid "cannot create database within transaction" by using explicit execution
        await conn.execute('CREATE DATABASE training_db')
        print("Database 'training_db' created successfully.")
        await conn.close()
    except asyncpg.exceptions.DuplicateDatabaseError:
        print("Database 'training_db' already exists.")
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    asyncio.run(main())

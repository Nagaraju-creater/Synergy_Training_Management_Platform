import redis.asyncio as redis
import asyncio

REDIS_URL = "rediss://default:gQAAAAAAAZT0AAIgcDJkNTEzMzRiM2JmMzg0ODY2YjUxOTgyMzhkOGFkZWY2OA@exact-rabbit-103668.upstash.io:6379"

async def test():
    client = redis.from_url(REDIS_URL)
    print(await client.ping())

asyncio.run(test())

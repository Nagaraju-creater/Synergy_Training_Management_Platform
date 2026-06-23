from slowapi import Limiter
from slowapi.util import get_remote_address
from limits.storage import MemoryStorage

# Use in-memory storage so rate limiting works without Redis in development.
# In production, swap MemoryStorage() for RedisStorage(redis_url) for distributed limiting.
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")

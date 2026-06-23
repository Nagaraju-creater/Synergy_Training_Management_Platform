from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Paths that bypass token checks at the middleware level.
# Per-route auth is still enforced by FastAPI Depends in dependencies.py.
PUBLIC_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/forgot-password",
}


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Lightweight middleware for global request pre-processing.

    Role-based and token-based auth is enforced at the route level via
    FastAPI dependencies (see dependencies.py). This layer is reserved for
    cross-cutting concerns such as request-ID injection or IP allow-listing.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Example: inject a request-ID header
        import uuid
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

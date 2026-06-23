import logging
import time

from starlette.types import ASGIApp, Receive, Scope, Send


logger = logging.getLogger("training_platform")


class LoggingMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()
        
        # We need to wrap the 'send' function to capture the status code
        status_code = [500] # Default to 500 if not set

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            method = scope.get("method", "-")
            path = scope.get("path", "-")
            
            logger.info(
                "%s %s  status=%d  duration=%.2fms",
                method,
                path,
                status_code[0],
                duration_ms,
            )

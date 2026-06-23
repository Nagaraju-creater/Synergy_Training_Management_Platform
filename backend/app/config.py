from typing import List, Any
import json

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Project ────────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "Training Management Platform"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Database ───────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@127.0.0.1:5432/training_db"

    # ── JWT ────────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-must-be-32-chars-minimum"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RESET_TOKEN_EXPIRE_HOURS: int = 24

    # ── Cookies ────────────────────────────────────────────────────────────────
    COOKIE_SECURE: bool = False  # Set to True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: str | None = None

    # ── Redis ──────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://127.0.0.1:6379/0"

    # ── Celery ─────────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://127.0.0.1:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://127.0.0.1:6379/2"

    # ── CORS ───────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:80",
    ]

    # ── SMTP (notifications) ───────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # ── Supabase Storage ───────────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_BUCKET: str = "avatars"

    model_config = {"env_file": ".env", "case_sensitive": True}

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Any) -> Any:
        if isinstance(v, str):
            v_clean = v.strip()
            if v_clean.startswith("[") and v_clean.endswith("]"):
                try:
                    return json.loads(v_clean.replace("'", "\""))
                except Exception:
                    pass
            return [x.strip() for x in v_clean.split(",") if x.strip()]
        return v

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if not self.DEBUG:
            # Prevent default insecure SECRET_KEY in production
            if self.SECRET_KEY == "change-me-in-production-must-be-32-chars-minimum" or len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be a secure, unique string of at least 32 characters in production.")
            # Automatically force secure cookies in production
            self.COOKIE_SECURE = True
        return self


settings = Settings()


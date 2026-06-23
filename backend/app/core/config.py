from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str

    SMTP_HOST: str
    SMTP_PORT: int

    SMTP_USER: str
    SMTP_PASSWORD: str

    REDIS_URL: str

    DEBUG: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
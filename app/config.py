from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/sigms.db"
    JWT_SECRET: str = "changeme"
    ENCRYPTION_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "SIGMS"
    APP_VERSION: str = "1.0.0"
    APP_URL: str = "http://localhost:8000"

    # Email / SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@elovital.ao"
    SMTP_FROM_NAME: str = "SIGMS ELOVITAL"

    class Config:
        env_file = ".env"


settings = Settings()

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/sigms.db"  # override via env var em produção
    JWT_SECRET: str = "changeme"
    ENCRYPTION_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "SIGMS"
    APP_VERSION: str = "1.0.0"
    APP_URL: str = "http://localhost:8000"

    # Email — Brevo API (preferido em cloud) ou SMTP fallback
    BREVO_API_KEY: str = ""          # xkeysib-... → usa API HTTP (sem restrições de porta)
    SMTP_HOST: str = "smtp.hostinger.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "cotacao@elovital-ao.com"
    SMTP_FROM_NAME: str = "ELOVITAL - Mediacao de Seguros"

    class Config:
        env_file = ".env"


settings = Settings()

"""Backend configuration settings using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # API Security
    SECRET_KEY: str = "dev-secret-jwt-key-minimum-32-characters-needed-12345"
    INTERNAL_TOKEN: str = "internal-cron-service-token-secret-xyz123"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    DATABASE_URL: str = "sqlite:///./roofgarden_dev.db" # Default fallback for zero-dependency local dev/tests; PostgreSQL in prod
    DATABASE_URL_ASYNC: str = ""

    # External APIs
    BMKG_BASE_URL: str = "https://api.bmkg.go.id/publik"
    OPEN_ELEVATION_BASE_URL: str = "https://api.open-elevation.com/api/v1/lookup"

    # AI & LLM Provider (Groq API free tier)
    GROQ_API_KEY: str = ""
    LLM_PROVIDER: str = "groq"
    LLM_MODEL: str = "llama-3.3-70b-versatile"

    # APScheduler Background Job Intervals
    JOB_EVALUATE_ZONES_INTERVAL_MINUTES: int = 15
    JOB_CHECK_NODE_HEALTH_INTERVAL_MINUTES: int = 5
    JOB_VERIFY_ACTIONS_INTERVAL_MINUTES: int = 10

    # Node Ingestion Defaults
    NODE_OFFLINE_THRESHOLD_FACTOR: int = 3
    DEFAULT_NODE_SEND_INTERVAL_S: int = 300


settings = Settings()

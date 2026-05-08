import json
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "RecruitAI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: str = '["http://localhost:3000"]'

    DATABASE_URL: str = "sqlite+aiosqlite:///./db/recruitai.db"

    JWT_SECRET_KEY: str = "change-this-32-chars-minimum-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    STORAGE_MODE: str = "local"
    LOCAL_STORAGE_PATH: str = "./uploads"
    SIGNED_URL_BASE: str = "http://localhost:8000"
    SIGNED_URL_SECRET: str = "local-secret-for-signed-urls"
    SIGNED_URL_EXPIRY: int = 900

    ADMIN_SECRET_KEY: str = "admin-secret-key"

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRO_PRICE_ID: str = "price_pro"

    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "RecruitAI <noreply@recruitai.app>"

    SENTRY_DSN: str = ""

    DEFAULT_LLM_PROVIDER: str = "mock"
    DEFAULT_LLM_MODEL: str = "mock-model"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    FREE_MAX_JOBS: int = 3
    FREE_MAX_CV_UPLOADS: int = 50
    PRO_MAX_CV_UPLOADS: int = 500

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    @property
    def parsed_allowed_origins(self) -> List[str]:
        # Handle empty or missing variable
        if not self.ALLOWED_ORIGINS:
            return ["http://localhost:3000"]
            
        try:
            # Try parsing as JSON list
            origins = json.loads(self.ALLOWED_ORIGINS)
            if isinstance(origins, str):
                origins = [origins]
        except json.JSONDecodeError:
            # Fallback: Split by comma and clean up characters like [], " and '
            raw = self.ALLOWED_ORIGINS.translate(str.maketrans('', '', '[]"\''))
            origins = [o.strip() for o in raw.split(",") if o.strip()]

        # Ensure all origins are cleaned and include variations
        final_origins = []
        for o in origins:
            clean_o = o.rstrip("/")
            final_origins.append(clean_o)
            # Standard practice: allow both https and http if not specified carefully
            if clean_o.startswith("https://"):
                final_origins.append(clean_o.replace("https://", "http://"))
        
        return list(set(final_origins)) or ["http://localhost:3000"]


settings = Settings()

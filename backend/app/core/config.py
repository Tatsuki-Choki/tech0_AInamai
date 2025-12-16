from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional, Union
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # App settings
    APP_NAME: str = "探究学習日記アプリ API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database (MySQL)
    DATABASE_URL: str = "mysql+aiomysql://user:password@localhost:3306/tankyu_diary"
    DATABASE_ECHO: bool = False

    # JWT Authentication
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_FILE_SEARCH_STORE_ID: str = "fileSearchStores/principalphilosophy-ydwhy17rmp7m"
    # Gemini timeout (seconds). If the network call hangs, fall back to heuristics.
    GEMINI_TIMEOUT_SECONDS: int = 30

    # Frontend URL (for OAuth redirect)
    # NOTE: frontend dev server in this repo commonly runs on :3001
    FRONTEND_URL: str = "http://localhost:3001"

    # CORS - accepts JSON array string or Python list
    CORS_ORIGINS: Union[list[str], str] = ["http://localhost:3000", "http://localhost:3001"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                # If not valid JSON, try comma-separated
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Fiscal year (Japanese school year: April to March)
    def get_current_fiscal_year(self) -> int:
        from datetime import datetime
        now = datetime.now()
        if now.month >= 4:
            return now.year
        return now.year - 1


settings = Settings()

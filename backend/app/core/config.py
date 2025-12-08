from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "探究学習日記アプリ API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/tankyu_diary"
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

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Fiscal year (Japanese school year: April to March)
    def get_current_fiscal_year(self) -> int:
        from datetime import datetime
        now = datetime.now()
        if now.month >= 4:
            return now.year
        return now.year - 1

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

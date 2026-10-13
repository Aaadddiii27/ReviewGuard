import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "ReviewGuard"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./reviewguard.db",
        description="SQLAlchemy database URL. Defaults to SQLite for local development, or PostgreSQL in production."
    )
    
    # AI Engine Configuration
    AI_PROVIDER: str = Field(
        default="ollama",
        description="AI engine provider: 'ollama', 'gemini', or 'mock'"
    )
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:1.5b"
    OLLAMA_TIMEOUT_SECONDS: int = 45
    
    # Cloud Model Fallback (Google Gemini)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # GitHub Integration
    GITHUB_TOKEN: str = ""
    GITHUB_API_URL: str = "https://api.github.com"
    GITHUB_WEBHOOK_SECRET: str = ""
    
    # Review Guard Tuning
    DEDUPLICATION_SIMILARITY_THRESHOLD: float = 0.78
    STATIC_ANALYSIS_ENABLED: bool = True
    MAX_DIFF_LINES_PER_FILE: int = 1500
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

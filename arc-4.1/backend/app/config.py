"""
Arc 4.1 Backend - Configuration Module

Loads configuration from environment variables with validation.
"""
from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # OpenRouter API
    openrouter_api_key: str
    # Default to a reliable free model - user can override in .env
    default_model: str = "google/gemma-3-1b-it:free"
    
    # Tavily Web Search
    tavily_api_key: Optional[str] = None
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./arc.db"
    
    # Vector Database (ChromaDB)
    chroma_persist_directory: str = "./chroma_db"
    embedding_model: str = "all-MiniLM-L6-v2"
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # Server
    debug: bool = False
    log_level: str = "INFO"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


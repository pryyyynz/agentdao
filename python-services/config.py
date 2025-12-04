"""
Configuration module for AgentDAO Python Services
Centralizes environment variables and application settings
"""

import os
from typing import Optional
from dotenv import load_dotenv
from functools import lru_cache

# Load environment variables
load_dotenv()


class Settings:
    """Application settings loaded from environment variables"""
    
    # ============================================================================
    # APPLICATION SETTINGS
    # ============================================================================
    
    APP_NAME: str = "Grantify Evaluation Services"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "AI-powered grant evaluation microservices"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # ============================================================================
    # API SETTINGS
    # ============================================================================
    
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # MCP Server URL (for agent orchestration triggers)
    MCP_SERVER_URL: str = os.getenv("MCP_SERVER_URL", "http://localhost:3100")
    
    # CORS Settings
    CORS_ORIGINS: list = [
        "http://localhost:3000",  # Next.js dev
        "http://localhost:3001",
        "http://localhost:8000",  # Self
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]
    
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["*"]
    CORS_ALLOW_HEADERS: list = ["*"]
    
    # ============================================================================
    # DATABASE SETTINGS
    # ============================================================================
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_MIN_CONNECTIONS: int = int(os.getenv("DB_MIN_CONNECTIONS", "1"))
    DB_MAX_CONNECTIONS: int = int(os.getenv("DB_MAX_CONNECTIONS", "10"))
    DB_CONNECTION_TIMEOUT: int = int(os.getenv("DB_CONNECTION_TIMEOUT", "30"))
    
    # ============================================================================
    # IPFS SETTINGS (Pinata)
    # ============================================================================
    
    PINATA_API_KEY: str = os.getenv("PINATA_API_KEY", "")
    PINATA_SECRET_API_KEY: str = os.getenv("PINATA_SECRET_API_KEY", "")
    PINATA_JWT: Optional[str] = os.getenv("PINATA_JWT")
    PINATA_GATEWAY: str = "https://gateway.pinata.cloud/ipfs"
    
    # ============================================================================
    # AI/ML SETTINGS (Groq)
    # ============================================================================
    
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_TEMPERATURE: float = float(os.getenv("GROQ_TEMPERATURE", "0.7"))
    GROQ_MAX_TOKENS: int = int(os.getenv("GROQ_MAX_TOKENS", "4096"))
    
    # ============================================================================
    # EXTERNAL API SETTINGS
    # ============================================================================
    
    # GitHub API (for due diligence)
    GITHUB_API_KEY: str = os.getenv("GITHUB_API_KEY", "")
    
    # ============================================================================
    # EMAIL SERVICE SETTINGS (Resend)
    # ============================================================================
    
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    
    # ============================================================================
    # AUTHENTICATION SETTINGS
    # ============================================================================
    
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_DAYS: int = int(os.getenv("JWT_EXPIRATION_DAYS", "30"))
    OTP_EXPIRATION_MINUTES: int = int(os.getenv("OTP_EXPIRATION_MINUTES", "10"))
    OTP_RATE_LIMIT_PER_HOUR: int = int(os.getenv("OTP_RATE_LIMIT_PER_HOUR", "3"))
    
    # ============================================================================
    # BLOCKCHAIN SETTINGS
    # ============================================================================
    
    THIRDWEB_SECRET_KEY: str = os.getenv("THIRDWEB_SECRET_KEY", "")
    THIRDWEB_CLIENT_ID: str = os.getenv("THIRDWEB_CLIENT_ID", "")
    RPC_URL: str = os.getenv("RPC_URL", "https://sepolia.infura.io/v3/")
    PRIVATE_KEY: str = os.getenv("PRIVATE_KEY", "")
    ETHERSCAN_API_KEY: str = os.getenv("ETHERSCAN_API_KEY", "")
    
    # Network
    CHAIN_ID: int = int(os.getenv("CHAIN_ID", "11155111"))  # Sepolia
    NETWORK_NAME: str = os.getenv("NETWORK_NAME", "sepolia")
    
    # ============================================================================
    # SERVICE URLS
    # ============================================================================
    
    PYTHON_SERVICE_URL: str = os.getenv("PYTHON_SERVICE_URL", "http://localhost:8000")
    # MCP_SERVER_URL is defined above in API SETTINGS section (line 37)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # ============================================================================
    # LOGGING SETTINGS
    # ============================================================================
    
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO" if not DEBUG else "DEBUG")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/agentdao.log")
    LOG_MAX_BYTES: int = int(os.getenv("LOG_MAX_BYTES", "10485760"))  # 10MB
    LOG_BACKUP_COUNT: int = int(os.getenv("LOG_BACKUP_COUNT", "5"))
    
    # ============================================================================
    # RATE LIMITING
    # ============================================================================
    
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    RATE_LIMIT_PER_HOUR: int = int(os.getenv("RATE_LIMIT_PER_HOUR", "1000"))
    
    # ============================================================================
    # EVALUATION SETTINGS
    # ============================================================================
    
    # Score thresholds
    MIN_PASSING_SCORE: float = float(os.getenv("MIN_PASSING_SCORE", "60.0"))
    CONSENSUS_THRESHOLD: float = float(os.getenv("CONSENSUS_THRESHOLD", "0.8"))
    
    # Evaluation timeouts (seconds)
    EVALUATION_TIMEOUT: int = int(os.getenv("EVALUATION_TIMEOUT", "300"))  # 5 minutes
    
    # Agent weights for final scoring
    AGENT_WEIGHTS: dict = {
        "technical": 0.25,
        "impact": 0.25,
        "due_diligence": 0.20,
        "budget": 0.15,
        "community": 0.15,
    }
    
    # ============================================================================
    # VALIDATION METHODS
    # ============================================================================
    
    def validate(self) -> bool:
        """Validate that all required settings are configured"""
        required_vars = [
            ("DATABASE_URL", self.DATABASE_URL),
            ("GROQ_API_KEY", self.GROQ_API_KEY),
            ("PINATA_API_KEY", self.PINATA_API_KEY),
            ("PINATA_SECRET_API_KEY", self.PINATA_SECRET_API_KEY),
        ]
        
        missing = []
        for name, value in required_vars:
            if not value:
                missing.append(name)
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        return True
    
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT == "development"
    
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT == "production"
    
    # ============================================================================
    # HELPER METHODS
    # ============================================================================
    
    @property
    def database_url_safe(self) -> str:
        """Get database URL with masked password for logging"""
        if not self.DATABASE_URL:
            return "Not configured"
        
        # Mask password in connection string
        parts = self.DATABASE_URL.split('@')
        if len(parts) == 2:
            user_pass = parts[0].split(':')
            if len(user_pass) >= 2:
                return f"{user_pass[0]}:****@{parts[1]}"
        
        return "****"
    
    def get_cors_origins(self) -> list:
        """Get CORS origins, add custom origins from env"""
        origins = self.CORS_ORIGINS.copy()
        
        # Add custom origins from environment
        custom_origins = os.getenv("CORS_CUSTOM_ORIGINS", "")
        if custom_origins:
            origins.extend(custom_origins.split(","))
        
        return origins
    
    def get_agent_weight(self, agent_name: str) -> float:
        """Get weight for a specific agent"""
        return self.AGENT_WEIGHTS.get(agent_name, 0.0)
    
    def __repr__(self) -> str:
        return f"<Settings env={self.ENVIRONMENT} debug={self.DEBUG}>"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    Uses lru_cache to ensure only one instance is created
    """
    settings = Settings()
    return settings


# Create global settings instance
settings = get_settings()


# ============================================================================
# VALIDATE ON IMPORT (optional - can comment out for testing)
# ============================================================================

# Validate settings when module is imported
# Comment this out if you want to run without all env vars configured
try:
    settings.validate()
    print(f"✅ Configuration loaded: {settings.ENVIRONMENT} environment")
except ValueError as e:
    print(f"⚠️  Configuration warning: {e}")
    if settings.is_production():
        raise


if __name__ == "__main__":
    """Test configuration"""
    print("\n=== AgentDAO Configuration ===\n")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug Mode: {settings.DEBUG}")
    print(f"API Version: {settings.APP_VERSION}")
    print(f"Host: {settings.HOST}:{settings.PORT}")
    print(f"\nDatabase: {settings.database_url_safe}")
    print(f"IPFS: {'Configured' if settings.PINATA_API_KEY else 'Not configured'}")
    print(f"Groq API: {'Configured' if settings.GROQ_API_KEY else 'Not configured'}")
    print(f"\nCORS Origins: {len(settings.get_cors_origins())} configured")
    print(f"Log Level: {settings.LOG_LEVEL}")
    print(f"\nAgent Weights:")
    for agent, weight in settings.AGENT_WEIGHTS.items():
        print(f"  - {agent}: {weight * 100}%")

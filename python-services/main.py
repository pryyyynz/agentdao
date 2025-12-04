"""
AgentDAO Python Services - FastAPI Application
Main entry point for the evaluation microservice
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
from typing import Dict, Any

from config import settings
from logging_config import setup_logging, get_logger
from utils.database import DatabaseConnectionPool, test_connection, close_pool
from utils.common import format_error_response
from middleware.api_middleware import RateLimitMiddleware, RequestLoggingMiddleware


# ============================================================================
# LOGGING SETUP
# ============================================================================

setup_logging(log_level=settings.LOG_LEVEL, log_file=settings.LOG_FILE)
logger = get_logger(__name__)


# ============================================================================
# LIFESPAN CONTEXT MANAGER
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info("🚀 Starting Grantify Python Services...")
    
    try:
        # Initialize database connection pool
        db_pool = DatabaseConnectionPool()
        test_connection()
        logger.info("✅ Database connection pool initialized")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise
    
    logger.info("✅ Grantify Python Services started successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Grantify Python Services...")
    
    try:
        # Close database connections
        close_pool()
        logger.info("✅ Database connections closed")
    except Exception as e:
        logger.error(f"⚠️ Error during shutdown: {e}")
    
    logger.info("✅ Grantify Python Services shut down successfully")


# ============================================================================
# FASTAPI APP INITIALIZATION
# ============================================================================

app = FastAPI(
    title="Grantify Evaluation Service",
    description="Multi-Agent AI Grant Evaluation System using NullShot Framework",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)


# ============================================================================
# MIDDLEWARE CONFIGURATION
# ============================================================================

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Rate Limiting Middleware
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=100  # 100 requests per minute per IP
)

# Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

logger.info(f"CORS enabled for origins: {settings.get_cors_origins()}")
logger.info("Middleware enabled: CORS, RateLimiting (100 req/min), RequestLogging")


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors with detailed error messages
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(f"Validation error on {request.url.path}: {errors}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Invalid request data",
            "details": errors
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle all unhandled exceptions
    """
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "detail": str(exc) if settings.DEBUG else "Please contact support"
        }
    )


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/", tags=["Root"])
async def root() -> Dict[str, Any]:
    """
    Root endpoint - API information
    """
    return {
        "service": "Grantify Evaluation Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint - Check service and dependencies status
    
    Returns:
        - status: Service status (healthy/unhealthy)
        - database: Database connection status
        - ipfs: IPFS connection status
        - timestamp: Current timestamp
    """
    from datetime import datetime
    from utils.database import DatabaseConnectionPool
    from utils.ipfs_client import IPFSClient
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Check Database
    try:
        db_pool = DatabaseConnectionPool()
        test_connection()
        health_status["services"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "message": str(e)
        }
        health_status["status"] = "unhealthy"
    
    # Check IPFS (Pinata)
    try:
        ipfs_client = IPFSClient()
        # Simple check - verify JWT exists
        if ipfs_client.pinata_jwt:
            health_status["services"]["ipfs"] = {
                "status": "healthy",
                "message": "IPFS (Pinata) configured"
            }
        else:
            raise Exception("Pinata JWT not configured")
    except Exception as e:
        logger.error(f"IPFS health check failed: {e}")
        health_status["services"]["ipfs"] = {
            "status": "unhealthy",
            "message": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check Groq AI
    try:
        if settings.GROQ_API_KEY:
            health_status["services"]["groq_ai"] = {
                "status": "healthy",
                "message": "Groq API configured"
            }
        else:
            raise Exception("Groq API key not configured")
    except Exception as e:
        logger.error(f"Groq AI health check failed: {e}")
        health_status["services"]["groq_ai"] = {
            "status": "unhealthy",
            "message": str(e)
        }
        health_status["status"] = "degraded"
    
    # Determine overall status code
    if health_status["status"] == "unhealthy":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )
    
    return health_status


# ============================================================================
# API ROUTERS
# ============================================================================

# Import routers
from routers.grants import router as grants_router
from routers.technical import router as technical_router
from routers.impact import router as impact_router
from routers.due_diligence import router as due_diligence_router
from routers.budget import router as budget_router
from routers.community import router as community_router
from routers.unified import router as unified_router
from routers.evaluations import router as evaluations_router
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.milestones import router as milestones_router
from routers.reviews import router as reviews_router
from routers.admin import router as admin_router

# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(grants_router, prefix="/api/v1")
app.include_router(milestones_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(technical_router, prefix="/api/v1")
app.include_router(impact_router, prefix="/api/v1")
app.include_router(due_diligence_router, prefix="/api/v1")
app.include_router(budget_router, prefix="/api/v1")
app.include_router(community_router, prefix="/api/v1")
app.include_router(unified_router, prefix="/api/v1")
app.include_router(evaluations_router, prefix="/api/v1")

logger.info("API routers registered: auth, users, grants, milestones, technical, impact, due_diligence, budget, community, unified, evaluations")


# ============================================================================
# DEVELOPMENT SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting development server...")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )

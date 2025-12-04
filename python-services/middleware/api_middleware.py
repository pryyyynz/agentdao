"""
API Middleware
Rate limiting, authentication, and request validation
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Optional
import time
import logging
from collections import defaultdict
from datetime import datetime, timedelta


logger = logging.getLogger(__name__)


# ============================================================================
# RATE LIMITING
# ============================================================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware
    
    Limits requests per IP address to prevent abuse
    Default: 100 requests per minute per IP
    """
    
    def __init__(
        self,
        app,
        requests_per_minute: int = 100,
        cleanup_interval: int = 300  # 5 minutes
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.cleanup_interval = cleanup_interval
        
        # Store request counts per IP
        self.request_counts: Dict[str, list] = defaultdict(list)
        self.last_cleanup = time.time()
        
        logger.info(f"Rate limiting enabled: {requests_per_minute} requests/minute per IP")
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Skip rate limiting for health checks
        if request.url.path.endswith("/health"):
            return await call_next(request)
        
        current_time = time.time()
        
        # Cleanup old entries periodically
        if current_time - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_entries(current_time)
        
        # Get request timestamps for this IP
        timestamps = self.request_counts[client_ip]
        
        # Remove timestamps older than 1 minute
        cutoff_time = current_time - 60
        timestamps = [t for t in timestamps if t > cutoff_time]
        
        # Check rate limit
        if len(timestamps) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for IP {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {self.requests_per_minute} requests per minute allowed",
                    "retry_after": 60
                }
            )
        
        # Add current timestamp
        timestamps.append(current_time)
        self.request_counts[client_ip] = timestamps
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            self.requests_per_minute - len(timestamps)
        )
        response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))
        
        return response
    
    def _cleanup_old_entries(self, current_time: float):
        """Remove old request timestamps to free memory"""
        cutoff_time = current_time - 300  # 5 minutes ago
        
        for ip in list(self.request_counts.keys()):
            timestamps = [t for t in self.request_counts[ip] if t > cutoff_time]
            if timestamps:
                self.request_counts[ip] = timestamps
            else:
                del self.request_counts[ip]
        
        self.last_cleanup = current_time
        logger.debug(f"Rate limit cleanup: {len(self.request_counts)} IPs tracked")


# ============================================================================
# API KEY AUTHENTICATION
# ============================================================================

class APIKeyAuth:
    """
    API Key authentication
    
    Validates API keys for secure access to evaluation services
    """
    
    def __init__(self, api_keys: Optional[Dict[str, str]] = None):
        """
        Initialize API key auth
        
        Args:
            api_keys: Dict mapping API keys to client names
        """
        # Default API keys (in production, load from secure storage)
        self.api_keys = api_keys or {
            "dev-key-12345": "Development Client",
            "typescript-agent-key": "TypeScript Agent",
            "frontend-app-key": "Frontend Application"
        }
        
        logger.info(f"API key authentication enabled: {len(self.api_keys)} keys configured")
    
    def validate_api_key(self, api_key: str) -> Optional[str]:
        """
        Validate API key
        
        Args:
            api_key: API key to validate
            
        Returns:
            Client name if valid, None otherwise
        """
        return self.api_keys.get(api_key)
    
    def add_api_key(self, api_key: str, client_name: str):
        """Add new API key"""
        self.api_keys[api_key] = client_name
        logger.info(f"Added API key for client: {client_name}")
    
    def revoke_api_key(self, api_key: str):
        """Revoke API key"""
        if api_key in self.api_keys:
            client_name = self.api_keys[api_key]
            del self.api_keys[api_key]
            logger.info(f"Revoked API key for client: {client_name}")


# Global API key authenticator
_api_key_auth: Optional[APIKeyAuth] = None


def get_api_key_auth() -> APIKeyAuth:
    """Get or create API key authenticator"""
    global _api_key_auth
    if _api_key_auth is None:
        _api_key_auth = APIKeyAuth()
    return _api_key_auth


async def verify_api_key(request: Request) -> str:
    """
    Dependency to verify API key from request
    
    Checks for API key in:
    1. Authorization header (Bearer token)
    2. X-API-Key header
    3. api_key query parameter
    
    Raises:
        HTTPException: If API key is missing or invalid
        
    Returns:
        Client name
    """
    # Try Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        api_key = auth_header[7:]
    # Try X-API-Key header
    elif "X-API-Key" in request.headers:
        api_key = request.headers["X-API-Key"]
    # Try query parameter
    elif "api_key" in request.query_params:
        api_key = request.query_params["api_key"]
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required. Provide in Authorization header, X-API-Key header, or api_key query parameter"
        )
    
    # Validate API key
    auth = get_api_key_auth()
    client_name = auth.validate_api_key(api_key)
    
    if not client_name:
        logger.warning(f"Invalid API key attempt: {api_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    logger.debug(f"API key validated for client: {client_name}")
    return client_name


# ============================================================================
# REQUEST LOGGING
# ============================================================================

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Request logging middleware
    
    Logs all requests with timing and metadata
    """
    
    async def dispatch(self, request: Request, call_next):
        """Process and log request"""
        
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log response
            logger.info(
                f"Response: {response.status_code} for {request.method} {request.url.path} "
                f"in {duration:.3f}s"
            )
            
            # Add timing header
            response.headers["X-Process-Time"] = f"{duration:.3f}"
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"Request failed: {request.method} {request.url.path} "
                f"after {duration:.3f}s - {str(e)}",
                exc_info=True
            )
            raise


# ============================================================================
# ERROR HANDLING
# ============================================================================

async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle validation errors with detailed messages
    """
    logger.warning(f"Validation error on {request.url.path}: {exc}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Invalid request data",
            "details": str(exc)
        }
    )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test middleware components"""
    print("API middleware components loaded")
    
    # Test API key auth
    auth = APIKeyAuth()
    
    print("\nTesting API key authentication:")
    print(f"  Valid key: {auth.validate_api_key('dev-key-12345')}")
    print(f"  Invalid key: {auth.validate_api_key('wrong-key')}")
    
    # Test adding/revoking
    auth.add_api_key("test-key-999", "Test Client")
    print(f"  Added key: {auth.validate_api_key('test-key-999')}")
    
    auth.revoke_api_key("test-key-999")
    print(f"  After revoke: {auth.validate_api_key('test-key-999')}")
    
    print("\n✅ Middleware tests complete")

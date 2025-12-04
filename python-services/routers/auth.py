"""
Authentication Router
Handles user login, OTP verification, and session management
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import logging

from services.email_service import EmailService
from services.otp_service import OTPService
from repositories.users_repository import UsersRepository
from middleware.auth_middleware import create_access_token, get_current_user
from fastapi import Depends

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

email_service = EmailService()
otp_service = OTPService()
users_repo = UsersRepository()

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class LoginRequest(BaseModel):
    """Request model for login"""
    email: EmailStr = Field(..., description="User email address")

class VerifyOTPRequest(BaseModel):
    """Request model for OTP verification"""
    email: EmailStr = Field(..., description="User email address")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")

class LoginResponse(BaseModel):
    """Response model for successful login"""
    access_token: str
    token_type: str = "bearer"
    user: dict

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/login", status_code=status.HTTP_200_OK)
async def request_otp(request: LoginRequest):
    """
    Request OTP code for login
    
    Sends a 6-digit OTP code to the user's email address.
    Rate limited to 3 requests per hour per email.
    """
    email = request.email.lower().strip()
    
    # Check rate limit
    within_limit, message = otp_service.check_rate_limit(email)
    if not within_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message
        )
    
    # Generate OTP
    otp_code = otp_service.generate_otp()
    
    # Store OTP
    if not otp_service.store_otp(email, otp_code):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate OTP. Please try again."
        )
    
    # Send OTP via email
    email_sent = email_service.send_otp(email, otp_code)
    
    if not email_sent:
        logger.warning(f"Failed to send OTP email to {email}, but OTP was generated")
        # Still return success in dev mode (OTP logged to console)
        if email_service.environment == "development":
            return {
                "message": "OTP generated. Check console/logs for code.",
                "email": email
            }
    
    return {
        "message": "OTP code sent to your email",
        "email": email
    }

@router.post("/verify", status_code=status.HTTP_200_OK, response_model=LoginResponse)
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify OTP code and create session
    
    Returns JWT access token on successful verification.
    """
    email = request.email.lower().strip()
    otp_code = request.otp_code.strip()
    
    # Verify OTP
    is_valid, message = otp_service.verify_otp(email, otp_code)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message
        )
    
    # Get or create user
    user = users_repo.get_user_by_email(email)
    
    if not user:
        # Create new user
        user = users_repo.create_user(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )
        logger.info(f"New user created: {email}")
    
    # Mark email as verified since they successfully verified OTP
    users_repo.update_user(user['user_id'], email_verified=True)
    
    # Update last login
    users_repo.update_last_login(user['user_id'])
    
    # Get updated user data
    user = users_repo.get_user_by_id(user['user_id'])
    
    # Create access token
    access_token = create_access_token(user['user_id'], user['email'])
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "user_id": user['user_id'],
            "email": user['email'],
            "wallet_address": user['wallet_address'],
            "display_name": user['display_name'],
            "email_verified": user['email_verified']
        }
    )

@router.get("/me", status_code=status.HTTP_200_OK)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return {
        "user_id": current_user['user_id'],
        "email": current_user['email'],
        "wallet_address": current_user['wallet_address'],
        "display_name": current_user['display_name'],
        "bio": current_user['bio'],
        "email_verified": current_user['email_verified'],
        "created_at": current_user['created_at'].isoformat() if current_user['created_at'] else None,
        "last_login_at": current_user['last_login_at'].isoformat() if current_user['last_login_at'] else None
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user (client should discard token)
    
    Note: With JWT tokens, logout is handled client-side by discarding the token.
    This endpoint exists for consistency and future session management.
    """
    return {
        "message": "Logged out successfully",
        "user_id": current_user['user_id']
    }


"""
Users Router
Handles user profile management and wallet linking
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional
import logging
import re

from repositories.users_repository import UsersRepository
from middleware.auth_middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

users_repo = UsersRepository()

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class UpdateProfileRequest(BaseModel):
    """Request model for updating user profile"""
    display_name: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=1000)

class LinkWalletRequest(BaseModel):
    """Request model for linking wallet"""
    wallet_address: str = Field(..., pattern=r'^0x[a-fA-F0-9]{40}$', description="Ethereum wallet address")

# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def is_valid_ethereum_address(address: str) -> bool:
    """Validate Ethereum address format"""
    pattern = r'^0x[a-fA-F0-9]{40}$'
    return bool(re.match(pattern, address))

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/me", status_code=status.HTTP_200_OK)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current user's profile
    """
    return {
        "user_id": current_user['user_id'],
        "email": current_user['email'],
        "wallet_address": current_user['wallet_address'],
        "display_name": current_user['display_name'],
        "bio": current_user['bio'],
        "email_verified": current_user['email_verified'],
        "created_at": current_user['created_at'].isoformat() if current_user['created_at'] else None,
        "updated_at": current_user['updated_at'].isoformat() if current_user['updated_at'] else None,
        "last_login_at": current_user['last_login_at'].isoformat() if current_user['last_login_at'] else None
    }

@router.patch("/me", status_code=status.HTTP_200_OK)
async def update_my_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user's profile
    """
    updates = {}
    if request.display_name is not None:
        updates['display_name'] = request.display_name.strip() if request.display_name else None
    if request.bio is not None:
        updates['bio'] = request.bio.strip() if request.bio else None
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    success = users_repo.update_user(current_user['user_id'], **updates)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
    
    # Get updated user
    updated_user = users_repo.get_user_by_id(current_user['user_id'])
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "user_id": updated_user['user_id'],
            "email": updated_user['email'],
            "wallet_address": updated_user['wallet_address'],
            "display_name": updated_user['display_name'],
            "bio": updated_user['bio'],
            "email_verified": updated_user['email_verified']
        }
    }

@router.post("/wallet/link", status_code=status.HTTP_200_OK)
async def link_wallet(
    request: LinkWalletRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Link wallet address to user account
    
    When a wallet is linked, any existing grants with matching applicant_address
    will be automatically linked to the user account.
    """
    wallet_address = request.wallet_address.lower()
    
    # Validate wallet address format
    if not is_valid_ethereum_address(wallet_address):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Ethereum wallet address format"
        )
    
    # Check if wallet is already linked to another user
    existing_user = users_repo.get_user_by_wallet(wallet_address)
    if existing_user and existing_user['user_id'] != current_user['user_id']:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Wallet address is already linked to another account"
        )
    
    # Link wallet
    success, grants_linked = users_repo.link_wallet(current_user['user_id'], wallet_address)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to link wallet address"
        )
    
    # Get updated user
    updated_user = users_repo.get_user_by_id(current_user['user_id'])
    
    return {
        "message": "Wallet linked successfully",
        "wallet_address": wallet_address,
        "grants_linked": grants_linked,
        "user": {
            "user_id": updated_user['user_id'],
            "email": updated_user['email'],
            "wallet_address": updated_user['wallet_address']
        }
    }

@router.post("/wallet/unlink", status_code=status.HTTP_200_OK)
async def unlink_wallet(current_user: dict = Depends(get_current_user)):
    """
    Unlink wallet address from user account
    
    Note: This does not remove the user_id from grants. Grants remain linked
    to the user account even after wallet is unlinked.
    """
    if not current_user['wallet_address']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No wallet address linked to this account"
        )
    
    success = users_repo.unlink_wallet(current_user['user_id'])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlink wallet address"
        )
    
    # Get updated user
    updated_user = users_repo.get_user_by_id(current_user['user_id'])
    
    return {
        "message": "Wallet unlinked successfully",
        "user": {
            "user_id": updated_user['user_id'],
            "email": updated_user['email'],
            "wallet_address": updated_user['wallet_address']
        }
    }


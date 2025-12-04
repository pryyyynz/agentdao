"""
Due Diligence Router
Endpoints for team background checks and verification
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import logging

from services.due_diligence import DueDiligenceAnalyzer


# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/analyze",
    tags=["Due Diligence"]
)

# Initialize analyzer (singleton pattern)
_dd_analyzer: Optional[DueDiligenceAnalyzer] = None


def get_dd_analyzer() -> DueDiligenceAnalyzer:
    """Get or create due diligence analyzer instance"""
    global _dd_analyzer
    if _dd_analyzer is None:
        _dd_analyzer = DueDiligenceAnalyzer()
    return _dd_analyzer


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class DueDiligenceRequest(BaseModel):
    """Request model for due diligence analysis"""
    
    grant_id: str = Field(..., description="Grant proposal ID")
    team_size: int = Field(..., ge=1, le=50, description="Number of team members")
    team_experience: str = Field(..., description="Team experience description")
    github_profiles: List[str] = Field(default_factory=list, description="GitHub profile URLs or usernames")
    wallet_addresses: List[str] = Field(default_factory=list, description="Ethereum wallet addresses")
    previous_projects: Optional[List[str]] = Field(default=None, description="URLs of previous projects")
    linkedin_profiles: Optional[List[str]] = Field(default=None, description="LinkedIn profile URLs")
    
    class Config:
        json_schema_extra = {
            "example": {
                "grant_id": "grant-003",
                "team_size": 3,
                "team_experience": "5 years blockchain development, 3 years full-stack",
                "github_profiles": [
                    "vitalik",
                    "https://github.com/gakonst"
                ],
                "wallet_addresses": [
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
                ],
                "previous_projects": [
                    "https://github.com/ethereum/go-ethereum",
                    "https://uniswap.org"
                ]
            }
        }


class DueDiligenceResponse(BaseModel):
    """Response model for due diligence analysis"""
    
    success: bool = Field(..., description="Whether analysis was successful")
    result: Optional[Dict[str, Any]] = Field(None, description="Analysis results")
    error: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "result": {
                    "grant_id": "grant-003",
                    "risk_score": 75,
                    "confidence": 0.85,
                    "risk_level": "low",
                    "github_profiles_analyzed": 2,
                    "wallet_addresses_analyzed": 1,
                    "red_flags": [],
                    "strengths": [
                        "Established GitHub accounts",
                        "Active contributors"
                    ],
                    "recommendations": [
                        "Low risk applicant - background checks passed"
                    ]
                },
                "error": None
            }
        }


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/due-diligence",
    response_model=DueDiligenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Perform Due Diligence",
    description="Perform comprehensive background verification on grant applicants"
)
async def analyze_due_diligence(request: DueDiligenceRequest) -> DueDiligenceResponse:
    """
    Perform due diligence analysis on grant applicants
    
    Checks:
    - GitHub profile verification and activity
    - Commit history and contribution quality
    - Wallet address history and transactions
    - Red flag detection (fake accounts, suspicious patterns)
    - Community reputation and social proof
    - Previous project verification
    
    Returns:
    - Risk score (0-100, higher = lower risk)
    - Confidence level (0-1)
    - Red flags and suspicious patterns
    - Strengths and positive indicators
    - Recommendations for approval/rejection
    """
    try:
        # Check if due_diligence agent is active
        from utils.database import is_agent_active
        if not is_agent_active('due_diligence'):
            logger.warning("Due diligence agent is paused/suspended")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Due diligence agent is currently paused and cannot perform evaluations"
            )
        
        logger.info(f"Received due diligence request for grant {request.grant_id}")
        
        # Prepare team info
        team_info = {
            'team_size': request.team_size,
            'experience': request.team_experience
        }
        
        # Get analyzer and perform analysis
        analyzer = get_dd_analyzer()
        result = analyzer.perform_due_diligence(
            grant_id=request.grant_id,
            team_info=team_info,
            github_profiles=request.github_profiles,
            wallet_addresses=request.wallet_addresses,
            previous_projects=request.previous_projects
        )
        
        logger.info(
            f"Due diligence complete for grant {request.grant_id}: "
            f"risk_score={result['risk_score']}, risk_level={result['risk_level']}"
        )
        
        return DueDiligenceResponse(
            success=True,
            result=result,
            error=None
        )
        
    except Exception as e:
        logger.error(f"Due diligence failed for grant {request.grant_id}: {e}", exc_info=True)
        
        # Return error response
        return DueDiligenceResponse(
            success=False,
            result=None,
            error=str(e)
        )


@router.get(
    "/due-diligence/health",
    status_code=status.HTTP_200_OK,
    summary="Due Diligence Analyzer Health Check",
    description="Check if due diligence analyzer is operational"
)
async def dd_analyzer_health() -> Dict[str, Any]:
    """
    Health check for due diligence analyzer
    
    Returns:
    - Status of the analyzer
    - API availability info
    """
    try:
        analyzer = get_dd_analyzer()
        
        return {
            "status": "healthy",
            "github_api_configured": analyzer.github_token is not None,
            "etherscan_api_configured": analyzer.etherscan_key is not None,
            "features": {
                "github_analysis": True,
                "wallet_analysis": analyzer.etherscan_key is not None,
                "red_flag_detection": True,
                "risk_scoring": True
            }
        }
        
    except Exception as e:
        logger.error(f"Due diligence analyzer health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Due diligence analyzer unavailable: {str(e)}"
        )


@router.post(
    "/github-profile",
    status_code=status.HTTP_200_OK,
    summary="Analyze Single GitHub Profile",
    description="Analyze a single GitHub profile for verification"
)
async def analyze_github_profile(username: str) -> Dict[str, Any]:
    """
    Analyze a single GitHub profile
    
    Args:
        username: GitHub username or profile URL
    
    Returns:
        Detailed GitHub profile analysis
    """
    try:
        analyzer = get_dd_analyzer()
        
        # Extract username if URL provided
        clean_username = analyzer.extract_github_username(username)
        if not clean_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub username or URL"
            )
        
        analysis = analyzer.analyze_github_profile(clean_username)
        
        if not analysis.get('profile_found'):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"GitHub profile not found: {clean_username}"
            )
        
        return {
            "success": True,
            "analysis": analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub profile analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post(
    "/wallet-address",
    status_code=status.HTTP_200_OK,
    summary="Analyze Wallet Address",
    description="Analyze blockchain wallet address for verification"
)
async def analyze_wallet(address: str, network: str = "ethereum") -> Dict[str, Any]:
    """
    Analyze a blockchain wallet address
    
    Args:
        address: Wallet address (0x...)
        network: Blockchain network (default: ethereum)
    
    Returns:
        Detailed wallet analysis
    """
    try:
        analyzer = get_dd_analyzer()
        
        analysis = analyzer.analyze_wallet_address(address, network)
        
        if not analysis.get('valid_address'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid wallet address format"
            )
        
        return {
            "success": True,
            "analysis": analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Wallet analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test the router locally"""
    print("Due diligence router loaded successfully")
    print(f"Endpoints: {[route.path for route in router.routes]}")

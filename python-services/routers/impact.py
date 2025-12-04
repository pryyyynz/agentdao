"""
Impact Analysis Router
Endpoints for ecosystem impact analysis
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import logging

from services.impact_analyzer import ImpactAnalyzer
from models import ImpactEvaluationResult
from utils.common import format_error_response


# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/analyze",
    tags=["Impact Analysis"]
)

# Initialize analyzer (singleton pattern)
_impact_analyzer: Optional[ImpactAnalyzer] = None


def get_impact_analyzer() -> ImpactAnalyzer:
    """Get or create impact analyzer instance"""
    global _impact_analyzer
    if _impact_analyzer is None:
        _impact_analyzer = ImpactAnalyzer()
    return _impact_analyzer


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ImpactAnalysisRequest(BaseModel):
    """Request model for impact analysis"""
    
    grant_id: str = Field(..., description="Grant proposal ID")
    title: str = Field(..., description="Proposal title")
    description: str = Field(..., description="Proposal description")
    objectives: str = Field(..., description="Project objectives and goals")
    target_users: str = Field(..., description="Target users and beneficiaries")
    expected_outcomes: str = Field(..., description="Expected outcomes and deliverables")
    sustainability_plan: str = Field(..., description="Long-term sustainability plan")
    ecosystem_fit: str = Field(..., description="How proposal fits in ecosystem")
    
    class Config:
        json_schema_extra = {
            "example": {
                "grant_id": "grant-002",
                "title": "Decentralized Identity Protocol",
                "description": "A composable identity solution for Web3 with zero-knowledge proofs",
                "objectives": "Build privacy-preserving identity layer, Enable cross-chain identity, Reduce onboarding friction",
                "target_users": "Web3 developers, dApp users, identity-dependent applications",
                "expected_outcomes": "Identity protocol SDK, Reference implementation, 10+ dApp integrations",
                "sustainability_plan": "Open-source with protocol fees, Community-driven governance, Developer grants program",
                "ecosystem_fit": "Fills identity gap, Enables new use cases, Composable with existing protocols"
            }
        }


class ImpactAnalysisResponse(BaseModel):
    """Response model for impact analysis"""
    
    success: bool = Field(..., description="Whether analysis was successful")
    evaluation: Optional[ImpactEvaluationResult] = Field(None, description="Evaluation result")
    error: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "evaluation": {
                    "grant_id": "grant-002",
                    "agent_type": "impact",
                    "score": 1.8,
                    "confidence": 0.9,
                    "alignment_score": 2.0,
                    "user_benefit_score": 1.5,
                    "ecosystem_gap_score": 1.8,
                    "sustainability_score": 1.2,
                    "network_effects_score": 1.5,
                    "reasoning": "High ecosystem impact with strong alignment...",
                    "strengths": ["Decentralized identity solution", "Privacy-preserving"],
                    "weaknesses": ["Complex implementation"],
                    "risks": ["Adoption challenges"],
                    "recommendations": ["Partner with key dApps"]
                },
                "error": None
            }
        }


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/impact",
    response_model=ImpactAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Ecosystem Impact",
    description="Perform comprehensive ecosystem impact analysis on a grant proposal"
)
async def analyze_impact(request: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    """
    Analyze ecosystem impact of a grant proposal
    
    Evaluates:
    - Alignment with DAO mission and values
    - User benefits and target audience
    - Ecosystem gaps being filled
    - Long-term sustainability
    - Network effects and growth potential
    
    Returns:
    - Detailed evaluation with scores (-2 to +2)
    - Strengths, weaknesses, risks
    - Recommendations for improvement
    """
    try:
        # Check if impact agent is active
        from utils.database import is_agent_active
        if not is_agent_active('impact'):
            logger.warning("Impact agent is paused/suspended")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Impact agent is currently paused and cannot perform evaluations"
            )
        
        logger.info(f"Received impact analysis request for grant {request.grant_id}")
        
        # Convert request to proposal data
        proposal_data = {
            'title': request.title,
            'description': request.description,
            'objectives': request.objectives,
            'target_users': request.target_users,
            'expected_outcomes': request.expected_outcomes,
            'sustainability_plan': request.sustainability_plan,
            'ecosystem_fit': request.ecosystem_fit
        }
        
        # Get analyzer and perform analysis
        analyzer = get_impact_analyzer()
        evaluation = analyzer.analyze_ecosystem_impact(
            grant_id=request.grant_id,
            proposal_data=proposal_data
        )
        
        logger.info(f"Impact analysis complete for grant {request.grant_id}: score={evaluation.score}")
        
        return ImpactAnalysisResponse(
            success=True,
            evaluation=evaluation,
            error=None
        )
        
    except Exception as e:
        logger.error(f"Impact analysis failed for grant {request.grant_id}: {e}", exc_info=True)
        
        # Return error response
        return ImpactAnalysisResponse(
            success=False,
            evaluation=None,
            error=str(e)
        )


@router.get(
    "/impact/health",
    status_code=status.HTTP_200_OK,
    summary="Impact Analyzer Health Check",
    description="Check if impact analyzer is operational"
)
async def impact_analyzer_health() -> Dict[str, Any]:
    """
    Health check for impact analyzer
    
    Returns:
    - Status of the analyzer
    - Configuration info
    """
    try:
        analyzer = get_impact_analyzer()
        
        return {
            "status": "healthy",
            "model": analyzer.model,
            "temperature": analyzer.temperature,
            "max_tokens": analyzer.max_tokens,
            "max_retries": analyzer.max_retries
        }
        
    except Exception as e:
        logger.error(f"Impact analyzer health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Impact analyzer unavailable: {str(e)}"
        )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test the router locally"""
    print("Impact analysis router loaded successfully")
    print(f"Endpoints: {[route.path for route in router.routes]}")

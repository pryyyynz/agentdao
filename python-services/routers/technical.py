"""
Technical Analysis Router
Endpoints for technical feasibility analysis
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import logging

from services.technical_analyzer import TechnicalAnalyzer
from models import TechnicalEvaluationResult
from utils.common import format_error_response


# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/analyze",
    tags=["Technical Analysis"]
)

# Initialize analyzer (singleton pattern)
_technical_analyzer: Optional[TechnicalAnalyzer] = None


def get_technical_analyzer() -> TechnicalAnalyzer:
    """Get or create technical analyzer instance"""
    global _technical_analyzer
    if _technical_analyzer is None:
        _technical_analyzer = TechnicalAnalyzer()
    return _technical_analyzer


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class TechnicalAnalysisRequest(BaseModel):
    """Request model for technical analysis"""
    
    grant_id: str = Field(..., description="Grant proposal ID")
    title: str = Field(..., description="Proposal title")
    description: str = Field(..., description="Proposal description")
    funding_amount: float = Field(..., gt=0, description="Funding amount requested")
    timeline: str = Field(..., description="Project timeline and milestones")
    tech_stack: str = Field(..., description="Technology stack to be used")
    team_experience: str = Field(..., description="Team experience and background")
    architecture: str = Field(..., description="System architecture and design")
    
    class Config:
        json_schema_extra = {
            "example": {
                "grant_id": "grant-001",
                "title": "Decentralized Grant Management Platform",
                "description": "A blockchain-based platform for managing grants with multi-agent AI evaluation",
                "funding_amount": 50000,
                "timeline": "6 months with 3 major milestones: MVP (2 months), Beta (4 months), Production (6 months)",
                "tech_stack": "Ethereum, Solidity, React, NextJS, FastAPI, PostgreSQL, Supabase, IPFS, Groq AI",
                "team_experience": "10+ years combined experience in blockchain and AI",
                "architecture": "Microservices architecture with FastAPI backend, React frontend, Ethereum smart contracts"
            }
        }


class TechnicalAnalysisResponse(BaseModel):
    """Response model for technical analysis"""
    
    success: bool = Field(..., description="Whether analysis was successful")
    evaluation: Optional[TechnicalEvaluationResult] = Field(None, description="Evaluation result")
    error: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "evaluation": {
                    "grant_id": "grant-001",
                    "agent_type": "technical",
                    "score": 1.5,
                    "confidence": 0.85,
                    "architecture_score": 1.8,
                    "timeline_score": 1.2,
                    "tech_stack_score": 1.6,
                    "implementation_score": 1.4,
                    "reasoning": "Strong technical foundation with modern stack...",
                    "strengths": ["Well-defined architecture", "Modern tech stack"],
                    "weaknesses": ["Timeline may be tight"],
                    "risks": ["Dependency on external APIs"],
                    "recommendations": ["Add contingency buffer to timeline"]
                },
                "error": None
            }
        }


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/technical",
    response_model=TechnicalAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Technical Feasibility",
    description="Perform comprehensive technical feasibility analysis on a grant proposal"
)
async def analyze_technical(request: TechnicalAnalysisRequest) -> TechnicalAnalysisResponse:
    """
    Analyze technical feasibility of a grant proposal
    
    Evaluates:
    - Architecture quality and scalability
    - Timeline feasibility
    - Tech stack appropriateness
    - Implementation approach
    
    Returns:
    - Detailed evaluation with scores (-2 to +2)
    - Strengths, weaknesses, risks
    - Recommendations for improvement
    """
    try:
        # Check if technical agent is active
        from utils.database import is_agent_active
        if not is_agent_active('technical'):
            logger.warning("Technical agent is paused/suspended")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Technical agent is currently paused and cannot perform evaluations"
            )
        
        logger.info(f"Received technical analysis request for grant {request.grant_id}")
        
        # Convert request to proposal data
        proposal_data = {
            'title': request.title,
            'description': request.description,
            'funding_amount': request.funding_amount,
            'timeline': request.timeline,
            'tech_stack': request.tech_stack,
            'team_experience': request.team_experience,
            'architecture': request.architecture
        }
        
        # Get analyzer and perform analysis
        analyzer = get_technical_analyzer()
        evaluation = analyzer.analyze_technical_feasibility(
            grant_id=request.grant_id,
            proposal_data=proposal_data
        )
        
        logger.info(f"Technical analysis complete for grant {request.grant_id}: score={evaluation.score}")
        
        return TechnicalAnalysisResponse(
            success=True,
            evaluation=evaluation,
            error=None
        )
        
    except Exception as e:
        logger.error(f"Technical analysis failed for grant {request.grant_id}: {e}", exc_info=True)
        
        # Return error response
        return TechnicalAnalysisResponse(
            success=False,
            evaluation=None,
            error=str(e)
        )


@router.get(
    "/technical/health",
    status_code=status.HTTP_200_OK,
    summary="Technical Analyzer Health Check",
    description="Check if technical analyzer is operational"
)
async def technical_analyzer_health() -> Dict[str, Any]:
    """
    Health check for technical analyzer
    
    Returns:
    - Status of the analyzer
    - Configuration info
    """
    try:
        analyzer = get_technical_analyzer()
        
        return {
            "status": "healthy",
            "model": analyzer.model,
            "temperature": analyzer.temperature,
            "max_tokens": analyzer.max_tokens,
            "max_retries": analyzer.max_retries
        }
        
    except Exception as e:
        logger.error(f"Technical analyzer health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Technical analyzer unavailable: {str(e)}"
        )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test the router locally"""
    print("Technical analysis router loaded successfully")
    print(f"Endpoints: {[route.path for route in router.routes]}")

"""
Evaluations Router - Endpoints for saving and retrieving evaluation results
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from decimal import Decimal
import uuid
import logging

from repositories.evaluations_repository import EvaluationsRepository
from utils.common import format_error_response

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/evaluations",
    tags=["Evaluations"]
)

# Initialize repository
evaluations_repo = EvaluationsRepository()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class SaveEvaluationRequest(BaseModel):
    """Request model for saving an evaluation"""
    
    grant_id: int = Field(..., description="Grant ID (integer)")
    agent_name: str = Field(..., description="Agent name (e.g., 'technical', 'impact')")
    score: float = Field(..., ge=0, le=100, description="Score from 0-100")
    vote: str = Field(..., description="Vote decision (approve/reject/conditional)")
    confidence: float = Field(..., ge=0, le=1, description="Confidence level 0-1")
    agent_address: Optional[str] = Field(None, description="Agent wallet address")
    summary: Optional[str] = Field(None, description="Executive summary")
    detailed_analysis: Optional[Dict[str, Any]] = Field(None, description="Full analysis data")
    strengths: Optional[List[str]] = Field(None, description="Identified strengths")
    weaknesses: Optional[List[str]] = Field(None, description="Identified weaknesses")
    recommendations: Optional[List[str]] = Field(None, description="Recommendations")
    red_flags: Optional[List[str]] = Field(None, description="Red flags")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class SaveEvaluationResponse(BaseModel):
    """Response model for saving evaluation"""
    
    success: bool
    evaluation_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/save",
    response_model=SaveEvaluationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save Evaluation Result",
    description="Save agent evaluation result to database"
)
async def save_evaluation(request: SaveEvaluationRequest) -> SaveEvaluationResponse:
    """
    Save evaluation result to database
    
    This endpoint is called by agents after completing their analysis
    to persist the results for aggregation and voting.
    """
    try:
        logger.info(f"Saving evaluation for grant {request.grant_id} by {request.agent_name}")
        
        # Get grant UUID from grants table using integer ID
        from utils.database import get_db_cursor
        from psycopg2.extras import Json
        
        with get_db_cursor() as cur:
            cur.execute("SELECT grant_id FROM grants WHERE id = %s", (request.grant_id,))
            result = cur.fetchone()
        
        if not result:
            return SaveEvaluationResponse(
                success=False,
                error=f"Grant {request.grant_id} not found"
            )
        
        grant_uuid = uuid.UUID(result['grant_id'])
        
        # Wrap JSONB fields with Json() for psycopg2, but keep arrays as Python lists
        detailed_analysis = Json(request.detailed_analysis) if request.detailed_analysis else None
        metadata = Json(request.metadata) if request.metadata else None
        
        # Keep array fields as Python lists (psycopg2 handles TEXT[] automatically)
        strengths = request.strengths if request.strengths else None
        weaknesses = request.weaknesses if request.weaknesses else None
        recommendations = request.recommendations if request.recommendations else None
        red_flags = request.red_flags if request.red_flags else None
        
        # Save evaluation
        evaluation = evaluations_repo.create(
            grant_id=grant_uuid,
            agent_name=request.agent_name,
            score=Decimal(str(request.score)),
            vote=request.vote,
            confidence=Decimal(str(request.confidence)),
            agent_address=request.agent_address,
            summary=request.summary,
            detailed_analysis=detailed_analysis,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations,
            red_flags=red_flags,
            metadata=metadata
        )
        
        logger.info(f"✅ Evaluation saved: {evaluation['evaluation_id']}")
        
        return SaveEvaluationResponse(
            success=True,
            evaluation_id=str(evaluation['evaluation_id']),
            message=f"Evaluation saved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to save evaluation: {e}", exc_info=True)
        return SaveEvaluationResponse(
            success=False,
            error=str(e)
        )

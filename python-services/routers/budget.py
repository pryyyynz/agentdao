"""
Budget Analysis Router
Endpoints for budget evaluation and milestone generation
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import logging

from services.budget_analyzer import BudgetAnalyzer


# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/analyze",
    tags=["Budget Analysis"]
)

# Initialize analyzer (singleton pattern)
_budget_analyzer: Optional[BudgetAnalyzer] = None


def get_budget_analyzer() -> BudgetAnalyzer:
    """Get or create budget analyzer instance"""
    global _budget_analyzer
    if _budget_analyzer is None:
        _budget_analyzer = BudgetAnalyzer()
    return _budget_analyzer


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class BudgetItem(BaseModel):
    """Model for a single budget item"""
    
    category: str = Field(..., description="Budget category (development, marketing, operations, audits, etc.)")
    description: str = Field(..., description="Item description")
    amount: float = Field(..., gt=0, description="Item amount in USD")
    quantity: int = Field(default=1, ge=1, description="Quantity")
    unit_cost: Optional[float] = Field(default=None, description="Cost per unit")
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "development",
                "description": "Senior Blockchain Developer (6 months)",
                "amount": 90000,
                "quantity": 1,
                "unit_cost": 15000
            }
        }


class BudgetAnalysisRequest(BaseModel):
    """Request model for budget analysis"""
    
    grant_id: str = Field(..., description="Grant proposal ID")
    total_amount: float = Field(..., gt=0, description="Total budget amount")
    currency: str = Field(default="USD", description="Currency code")
    duration_months: int = Field(..., ge=1, le=36, description="Project duration in months")
    project_type: str = Field(default="software", description="Project type (software, infrastructure, research)")
    budget_items: List[BudgetItem] = Field(..., min_length=1, description="List of budget items")
    deliverables: Optional[List[str]] = Field(default=None, description="Project deliverables")
    
    class Config:
        json_schema_extra = {
            "example": {
                "grant_id": "grant-004",
                "total_amount": 150000,
                "currency": "USD",
                "duration_months": 6,
                "project_type": "software",
                "budget_items": [
                    {
                        "category": "development",
                        "description": "Senior Developer (6 months)",
                        "amount": 90000,
                        "quantity": 1
                    },
                    {
                        "category": "audits",
                        "description": "Smart Contract Audit",
                        "amount": 30000,
                        "quantity": 1
                    },
                    {
                        "category": "marketing",
                        "description": "Launch Campaign",
                        "amount": 20000,
                        "quantity": 1
                    },
                    {
                        "category": "contingency",
                        "description": "10% Buffer",
                        "amount": 15000,
                        "quantity": 1
                    }
                ],
                "deliverables": [
                    "Smart contract development",
                    "Frontend application",
                    "Security audit",
                    "Documentation"
                ]
            }
        }


class BudgetAnalysisResponse(BaseModel):
    """Response model for budget analysis"""
    
    success: bool = Field(..., description="Whether analysis was successful")
    result: Optional[Dict[str, Any]] = Field(None, description="Analysis results")
    error: Optional[str] = Field(None, description="Error message if failed")


class MilestoneGenerationRequest(BaseModel):
    """Request model for milestone generation"""
    
    total_amount: float = Field(..., gt=0, description="Total budget amount")
    duration_months: int = Field(..., ge=1, le=36, description="Project duration in months")
    deliverables: List[str] = Field(..., min_length=1, description="Project deliverables")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_amount": 150000,
                "duration_months": 6,
                "deliverables": [
                    "Smart contract development",
                    "Frontend application",
                    "Backend API",
                    "Security audit",
                    "Documentation",
                    "Deployment"
                ]
            }
        }


class MilestoneGenerationResponse(BaseModel):
    """Response model for milestone generation"""
    
    success: bool = Field(..., description="Whether generation was successful")
    milestones: Optional[List[Dict[str, Any]]] = Field(None, description="Generated milestones")
    total_amount: Optional[float] = Field(None, description="Total amount")
    num_milestones: Optional[int] = Field(None, description="Number of milestones")
    error: Optional[str] = Field(None, description="Error message if failed")


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/budget",
    response_model=BudgetAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Budget",
    description="Perform comprehensive budget analysis on grant proposal"
)
async def analyze_budget(request: BudgetAnalysisRequest) -> BudgetAnalysisResponse:
    """
    Analyze grant proposal budget
    
    Evaluates:
    - Budget reasonability and completeness
    - Market rate alignment
    - Category-wise distribution
    - Red flag detection (unrealistic amounts)
    - Milestone structure suggestions
    
    Returns:
    - Budget quality score (0-100)
    - Component scores (reasonability, market alignment, completeness)
    - Red flags and issues
    - Recommendations for improvement
    - Suggested milestone structure
    """
    try:
        # Check if budget agent is active
        from utils.database import is_agent_active
        if not is_agent_active('budget'):
            logger.warning("Budget agent is paused/suspended")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Budget agent is currently paused and cannot perform evaluations"
            )
        
        logger.info(f"Received budget analysis request for grant {request.grant_id}")
        
        # Convert request to budget data format
        budget_data = {
            'total_amount': request.total_amount,
            'currency': request.currency,
            'duration_months': request.duration_months,
            'budget_items': [item.model_dump() for item in request.budget_items]
        }
        
        # Get analyzer and perform analysis
        analyzer = get_budget_analyzer()
        result = analyzer.analyze_budget(
            grant_id=request.grant_id,
            budget_data=budget_data,
            project_type=request.project_type,
            deliverables=request.deliverables
        )
        
        logger.info(
            f"Budget analysis complete for grant {request.grant_id}: "
            f"score={result['budget_score']}, quality={result['quality_level']}"
        )
        
        return BudgetAnalysisResponse(
            success=True,
            result=result,
            error=None
        )
        
    except Exception as e:
        logger.error(f"Budget analysis failed for grant {request.grant_id}: {e}", exc_info=True)
        
        return BudgetAnalysisResponse(
            success=False,
            result=None,
            error=str(e)
        )


@router.post(
    "/generate-milestones",
    response_model=MilestoneGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Milestone Structure",
    description="Generate recommended milestone payment structure"
)
async def generate_milestones(request: MilestoneGenerationRequest) -> MilestoneGenerationResponse:
    """
    Generate milestone payment structure
    
    Creates a recommended milestone structure based on:
    - Total budget amount
    - Project duration
    - Deliverables
    
    Returns:
    - Milestone breakdown with amounts and percentages
    - Target completion months
    - Deliverable assignments
    - Payment triggers
    """
    try:
        logger.info(f"Generating milestone structure for ${request.total_amount:,.0f} over {request.duration_months} months")
        
        # Create minimal breakdown for milestone generation
        breakdown = {
            'total_amount': request.total_amount,
            'duration_months': request.duration_months
        }
        
        # Get analyzer and generate milestones
        analyzer = get_budget_analyzer()
        milestones = analyzer.generate_milestone_structure(
            breakdown=breakdown,
            deliverables=request.deliverables,
            timeline_months=request.duration_months
        )
        
        logger.info(f"Generated {len(milestones)} milestones")
        
        return MilestoneGenerationResponse(
            success=True,
            milestones=milestones,
            total_amount=request.total_amount,
            num_milestones=len(milestones),
            error=None
        )
        
    except Exception as e:
        logger.error(f"Milestone generation failed: {e}", exc_info=True)
        
        return MilestoneGenerationResponse(
            success=False,
            milestones=None,
            total_amount=None,
            num_milestones=None,
            error=str(e)
        )


@router.get(
    "/budget/health",
    status_code=status.HTTP_200_OK,
    summary="Budget Analyzer Health Check",
    description="Check if budget analyzer is operational"
)
async def budget_analyzer_health() -> Dict[str, Any]:
    """
    Health check for budget analyzer
    
    Returns:
    - Status of the analyzer
    - Available features
    """
    try:
        analyzer = get_budget_analyzer()
        
        return {
            "status": "healthy",
            "features": {
                "budget_analysis": True,
                "market_rate_comparison": True,
                "red_flag_detection": True,
                "milestone_generation": True,
                "category_analysis": True
            },
            "supported_project_types": ["software", "infrastructure", "research"],
            "market_rates_available": len(analyzer.MARKET_RATES)
        }
        
    except Exception as e:
        logger.error(f"Budget analyzer health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Budget analyzer unavailable: {str(e)}"
        )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test the router locally"""
    print("Budget analysis router loaded successfully")
    print(f"Endpoints: {[route.path for route in router.routes]}")

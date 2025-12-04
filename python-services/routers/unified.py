"""
Unified Evaluation Router
Combines all grant evaluation services into comprehensive analysis
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import asyncio

from services.technical_analyzer import TechnicalAnalyzer
from services.impact_analyzer import ImpactAnalyzer
from services.due_diligence import DueDiligenceAnalyzer
from services.budget_analyzer import BudgetAnalyzer
from services.community_sentiment import CommunitySentimentAnalyzer, VotingStrategy


# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/evaluate",
    tags=["Unified Evaluation"]
)

# Initialize analyzers (singleton pattern)
_analyzers: Dict[str, Any] = {}


def get_analyzers() -> Dict[str, Any]:
    """Get or create analyzer instances"""
    global _analyzers
    if not _analyzers:
        _analyzers = {
            "technical": TechnicalAnalyzer(),
            "impact": ImpactAnalyzer(),
            "due_diligence": DueDiligenceAnalyzer(),
            "budget": BudgetAnalyzer(),
            "community": CommunitySentimentAnalyzer()
        }
    return _analyzers


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class GrantProposal(BaseModel):
    """Complete grant proposal data"""
    
    # Basic Info
    grant_id: str = Field(..., description="Unique grant identifier")
    title: str = Field(..., description="Grant title")
    description: str = Field(..., description="Grant description")
    
    # Technical Details
    github_repo_url: Optional[str] = Field(None, description="GitHub repository URL")
    technical_stack: Optional[List[str]] = Field(None, description="Technologies used")
    architecture: Optional[str] = Field(None, description="System architecture description")
    
    # Impact Details
    target_audience: Optional[str] = Field(None, description="Target user base")
    problem_statement: Optional[str] = Field(None, description="Problem being solved")
    solution: Optional[str] = Field(None, description="Proposed solution")
    expected_impact: Optional[str] = Field(None, description="Expected outcomes")
    
    # Team Details
    team_size: Optional[int] = Field(None, description="Number of team members")
    team_experience: Optional[str] = Field(None, description="Team experience level")
    github_profiles: Optional[List[str]] = Field(None, description="Team GitHub profiles")
    wallet_addresses: Optional[List[str]] = Field(None, description="Team wallet addresses")
    previous_projects: Optional[List[str]] = Field(None, description="Previous work")
    
    # Budget Details
    total_amount: Optional[float] = Field(None, description="Total grant amount")
    duration_months: Optional[int] = Field(None, description="Project duration")
    budget_items: Optional[List[Dict[str, Any]]] = Field(None, description="Budget breakdown")
    deliverables: Optional[List[str]] = Field(None, description="Project deliverables")
    
    # Community Poll (optional)
    poll_id: Optional[str] = Field(None, description="Associated community poll ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "grant_id": "grant-unified-001",
                "title": "Decentralized Identity Protocol",
                "description": "Building a privacy-preserving identity system for Web3",
                "github_repo_url": "https://github.com/example/did-protocol",
                "technical_stack": ["Solidity", "React", "IPFS", "Zero-Knowledge Proofs"],
                "target_audience": "Web3 users needing private identity solutions",
                "problem_statement": "Current identity systems leak personal data",
                "solution": "Zero-knowledge proof-based identity verification",
                "team_size": 5,
                "github_profiles": ["vitalik", "gakonst"],
                "wallet_addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"],
                "total_amount": 150000,
                "duration_months": 6,
                "budget_items": [
                    {"category": "development", "description": "Senior Dev", "amount": 90000}
                ],
                "deliverables": ["Smart contracts", "Frontend", "Documentation"]
            }
        }


class EvaluationRequest(BaseModel):
    """Request for unified grant evaluation"""
    
    proposal: GrantProposal = Field(..., description="Grant proposal to evaluate")
    services: Optional[List[str]] = Field(
        default=["technical", "impact", "due_diligence", "budget"],
        description="Services to run (default: all except community)"
    )
    include_community: bool = Field(
        default=False,
        description="Include community sentiment (requires poll_id)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "proposal": {
                    "grant_id": "grant-001",
                    "title": "DeFi Governance Platform",
                    "total_amount": 150000
                },
                "services": ["technical", "impact", "budget"],
                "include_community": False
            }
        }


class EvaluationResponse(BaseModel):
    """Response with unified evaluation results"""
    
    success: bool = Field(..., description="Whether evaluation completed successfully")
    grant_id: str = Field(..., description="Grant identifier")
    evaluation_timestamp: str = Field(..., description="When evaluation was performed")
    results: Optional[Dict[str, Any]] = Field(None, description="Evaluation results")
    overall_score: Optional[float] = Field(None, description="Combined overall score (0-100)")
    recommendation: Optional[str] = Field(None, description="Final recommendation")
    error: Optional[str] = Field(None, description="Error message if failed")


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/comprehensive",
    response_model=EvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Comprehensive Grant Evaluation",
    description="Run complete evaluation across all services"
)
async def comprehensive_evaluation(request: EvaluationRequest) -> EvaluationResponse:
    """
    Comprehensive grant proposal evaluation
    
    Combines analysis from:
    - Technical Analysis: Code quality, architecture, security
    - Impact Assessment: Market fit, innovation, sustainability
    - Due Diligence: Team background, reputation, credibility
    - Budget Validation: Reasonability, market rates, milestones
    - Community Sentiment: Voting results (if poll exists)
    
    Returns:
    - Individual service results
    - Combined overall score
    - Final recommendation (APPROVE/CONDITIONAL/REJECT)
    - Detailed breakdown by category
    """
    try:
        grant_id = request.proposal.grant_id
        logger.info(f"Starting comprehensive evaluation for grant {grant_id}")
        
        start_time = datetime.now()
        analyzers = get_analyzers()
        results = {}
        scores = {}
        
        # Check which agents are active (not suspended)
        from utils.database import get_db_cursor
        active_agents = set()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT agent_name 
                FROM agent_reputation 
                WHERE is_active = TRUE AND is_suspended = FALSE
            """)
            active_agents = {row['agent_name'] for row in cursor.fetchall()}
        
        logger.info(f"Active agents for evaluation: {active_agents}")
        
        # Technical Analysis
        if "technical" in request.services and "technical" in active_agents and request.proposal.github_repo_url:
            try:
                logger.info(f"Running technical analysis for {grant_id}")
                tech_analyzer = analyzers["technical"]
                
                tech_result = tech_analyzer.analyze_repository(
                    grant_id=grant_id,
                    repo_url=request.proposal.github_repo_url,
                    tech_stack=request.proposal.technical_stack or [],
                    architecture_description=request.proposal.architecture
                )
                
                results["technical"] = tech_result
                scores["technical"] = tech_result.get("quality_score", 0)
                logger.info(f"Technical analysis complete: score={scores['technical']}")
                
            except Exception as e:
                logger.error(f"Technical analysis failed: {e}")
                results["technical"] = {"error": str(e)}
                scores["technical"] = 0
        
        # Impact Analysis
        if "impact" in request.services and "impact" in active_agents:
            try:
                logger.info(f"Running impact analysis for {grant_id}")
                impact_analyzer = analyzers["impact"]
                
                impact_result = impact_analyzer.analyze_impact(
                    grant_id=grant_id,
                    proposal_data={
                        "title": request.proposal.title,
                        "description": request.proposal.description,
                        "target_audience": request.proposal.target_audience,
                        "problem_statement": request.proposal.problem_statement,
                        "solution": request.proposal.solution,
                        "expected_impact": request.proposal.expected_impact
                    }
                )
                
                results["impact"] = impact_result
                scores["impact"] = impact_result.get("impact_score", 0)
                logger.info(f"Impact analysis complete: score={scores['impact']}")
                
            except Exception as e:
                logger.error(f"Impact analysis failed: {e}")
                results["impact"] = {"error": str(e)}
                scores["impact"] = 0
        
        # Due Diligence
        if "due_diligence" in request.services and "due_diligence" in active_agents and request.proposal.github_profiles:
            try:
                logger.info(f"Running due diligence for {grant_id}")
                dd_analyzer = analyzers["due_diligence"]
                
                dd_result = dd_analyzer.perform_due_diligence(
                    grant_id=grant_id,
                    team_size=request.proposal.team_size or 1,
                    experience_level=request.proposal.team_experience or "intermediate",
                    github_profiles=request.proposal.github_profiles or [],
                    wallet_addresses=request.proposal.wallet_addresses or [],
                    previous_projects=request.proposal.previous_projects or []
                )
                
                results["due_diligence"] = dd_result
                scores["due_diligence"] = dd_result.get("risk_score", 0)
                logger.info(f"Due diligence complete: risk_score={scores['due_diligence']}")
                
            except Exception as e:
                logger.error(f"Due diligence failed: {e}")
                results["due_diligence"] = {"error": str(e)}
                scores["due_diligence"] = 0
        
        # Budget Analysis
        if "budget" in request.services and request.proposal.total_amount:
            try:
                logger.info(f"Running budget analysis for {grant_id}")
                budget_analyzer = analyzers["budget"]
                
                budget_data = {
                    "total_amount": request.proposal.total_amount,
                    "duration_months": request.proposal.duration_months or 6,
                    "budget_items": request.proposal.budget_items or []
                }
                
                budget_result = budget_analyzer.analyze_budget(
                    grant_id=grant_id,
                    budget_data=budget_data,
                    project_type="software",
                    deliverables=request.proposal.deliverables
                )
                
                results["budget"] = budget_result
                scores["budget"] = budget_result.get("budget_score", 0)
                logger.info(f"Budget analysis complete: score={scores['budget']}")
                
            except Exception as e:
                logger.error(f"Budget analysis failed: {e}")
                results["budget"] = {"error": str(e)}
                scores["budget"] = 0
        
        # Community Sentiment (optional)
        if request.include_community and request.proposal.poll_id:
            try:
                logger.info(f"Including community sentiment for {grant_id}")
                # This would retrieve existing poll results
                # For now, we'll skip if no poll exists
                results["community"] = {
                    "message": "Community polling not yet implemented",
                    "poll_id": request.proposal.poll_id
                }
            except Exception as e:
                logger.error(f"Community sentiment failed: {e}")
                results["community"] = {"error": str(e)}
        
        # Calculate weighted overall score using database agent_weights
        if scores:
            from utils.database import get_db_cursor
            
            # Get weights from database (only enabled, non-suspended agents)
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT aw.agent_name, aw.weight
                    FROM agent_weights aw
                    JOIN agent_reputation ar ON aw.agent_name = ar.agent_name
                    WHERE aw.is_enabled = TRUE 
                      AND ar.is_active = TRUE 
                      AND ar.is_suspended = FALSE
                """)
                db_weights = {row['agent_name']: float(row['weight']) for row in cursor.fetchall()}
            
            # Calculate weighted average
            total_weighted_score = 0
            total_weight = 0
            
            for agent_name, score in scores.items():
                weight = db_weights.get(agent_name, 1.0)
                total_weighted_score += score * weight
                total_weight += weight
                logger.info(f"Agent {agent_name}: score={score}, weight={weight}, weighted={score * weight}")
            
            overall_score = total_weighted_score / total_weight if total_weight > 0 else 0
            logger.info(f"Weighted overall score: {overall_score:.2f} (total_weight={total_weight})")
        else:
            overall_score = 0
        
        # Generate recommendation
        recommendation = _generate_recommendation(overall_score, scores, results)
        
        # Calculate execution time
        execution_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(
            f"Comprehensive evaluation complete for {grant_id}: "
            f"overall_score={overall_score:.1f}, "
            f"recommendation={recommendation}, "
            f"time={execution_time:.2f}s"
        )
        
        # Include weights used in the response
        weights_used = {}
        if scores:
            from utils.database import get_db_cursor
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT aw.agent_name, aw.weight
                    FROM agent_weights aw
                    WHERE aw.agent_name = ANY(%s)
                """, (list(scores.keys()),))
                weights_used = {row['agent_name']: float(row['weight']) for row in cursor.fetchall()}
        
        return EvaluationResponse(
            success=True,
            grant_id=grant_id,
            evaluation_timestamp=datetime.now().isoformat(),
            results={
                "services": results,
                "scores": scores,
                "weights": weights_used,
                "execution_time": execution_time,
                "services_run": len(scores),
                "scoring_method": "weighted_average"
            },
            overall_score=round(overall_score, 2),
            recommendation=recommendation,
            error=None
        )
        
    except Exception as e:
        logger.error(f"Comprehensive evaluation failed: {e}", exc_info=True)
        return EvaluationResponse(
            success=False,
            grant_id=request.proposal.grant_id,
            evaluation_timestamp=datetime.now().isoformat(),
            results=None,
            overall_score=None,
            recommendation=None,
            error=str(e)
        )


def _generate_recommendation(
    overall_score: float,
    scores: Dict[str, float],
    results: Dict[str, Any]
) -> str:
    """Generate final recommendation based on scores"""
    
    # Check for critical failures
    if "due_diligence" in scores and scores["due_diligence"] < 30:
        return "REJECT - High risk team (due diligence score < 30)"
    
    if "budget" in scores and scores["budget"] < 40:
        return "REJECT - Budget not reasonable (score < 40)"
    
    # Check overall score
    if overall_score >= 80:
        return "APPROVE - Strong proposal across all dimensions"
    elif overall_score >= 70:
        return "APPROVE - Good proposal with minor concerns"
    elif overall_score >= 60:
        return "CONDITIONAL APPROVE - Address concerns before funding"
    elif overall_score >= 50:
        return "CONDITIONAL - Requires significant improvements"
    else:
        return "REJECT - Proposal does not meet minimum standards"


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Unified Evaluation Health Check",
    description="Check status of all evaluation services"
)
async def unified_health() -> Dict[str, Any]:
    """
    Health check for unified evaluation system
    
    Returns:
    - Status of each service
    - Available features
    - System readiness
    """
    try:
        analyzers = get_analyzers()
        
        service_status = {}
        for name, analyzer in analyzers.items():
            try:
                # Simple check - analyzer exists and is initialized
                service_status[name] = {
                    "status": "healthy",
                    "available": True
                }
            except Exception as e:
                service_status[name] = {
                    "status": "unhealthy",
                    "available": False,
                    "error": str(e)
                }
        
        all_healthy = all(s["status"] == "healthy" for s in service_status.values())
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "services": service_status,
            "features": {
                "technical_analysis": service_status.get("technical", {}).get("available", False),
                "impact_assessment": service_status.get("impact", {}).get("available", False),
                "due_diligence": service_status.get("due_diligence", {}).get("available", False),
                "budget_validation": service_status.get("budget", {}).get("available", False),
                "community_sentiment": service_status.get("community", {}).get("available", False)
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unified evaluation system unavailable: {str(e)}"
        )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test the unified router"""
    print("Unified evaluation router loaded successfully")
    print(f"Endpoints: {[route.path for route in router.routes]}")

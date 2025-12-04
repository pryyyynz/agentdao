"""
Community Sentiment Router
Endpoints for community voting and sentiment analysis
"""

from fastapi import APIRouter, HTTPException, status, Path
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from enum import Enum
from datetime import datetime
import logging

from services.community_sentiment import (
    CommunitySentimentAnalyzer,
    VotingStrategy,
    SentimentLevel
)


# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/community",
    tags=["Community Sentiment"]
)

# Initialize analyzer (singleton pattern)
_sentiment_analyzer: Optional[CommunitySentimentAnalyzer] = None

# In-memory poll storage (in production, use database)
_polls_storage: Dict[str, Dict[str, Any]] = {}


def get_sentiment_analyzer() -> CommunitySentimentAnalyzer:
    """Get or create sentiment analyzer instance"""
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        _sentiment_analyzer = CommunitySentimentAnalyzer()
    return _sentiment_analyzer


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class VoteOption(BaseModel):
    """Model for a voting option"""
    
    id: str = Field(..., description="Option identifier")
    label: str = Field(..., description="Option display label")
    value: float = Field(..., ge=0, le=100, description="Option value (0-100 scale)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "strongly_approve",
                "label": "Strongly Approve",
                "value": 100
            }
        }


class PollCreationRequest(BaseModel):
    """Request model for creating a poll"""
    
    grant_id: str = Field(..., description="Grant proposal ID")
    title: str = Field(..., min_length=10, max_length=200, description="Poll title")
    description: str = Field(..., min_length=20, max_length=1000, description="Poll description")
    duration_hours: int = Field(default=168, ge=1, le=720, description="Poll duration in hours (1 hour to 30 days)")
    voting_strategy: str = Field(default="hybrid", description="Voting weight calculation strategy")
    custom_options: Optional[List[VoteOption]] = Field(default=None, description="Custom voting options")
    
    class Config:
        json_schema_extra = {
            "example": {
                "grant_id": "grant-123",
                "title": "Should we fund the DeFi Governance Platform?",
                "description": "Proposal to allocate $150k for building a decentralized governance platform with advanced voting mechanisms",
                "duration_hours": 168,
                "voting_strategy": "hybrid",
                "custom_options": None
            }
        }


class PollCreationResponse(BaseModel):
    """Response model for poll creation"""
    
    success: bool = Field(..., description="Whether poll was created successfully")
    poll: Optional[Dict[str, Any]] = Field(None, description="Poll details")
    message: Optional[str] = Field(None, description="Status message")
    error: Optional[str] = Field(None, description="Error message if failed")


class VoteSubmission(BaseModel):
    """Model for submitting a vote"""
    
    voter_address: str = Field(..., description="Voter's blockchain address")
    option: str = Field(..., description="Selected option ID")
    token_balance: float = Field(..., ge=0, description="Voter's token balance")
    reputation_score: int = Field(default=50, ge=0, le=100, description="Voter's reputation score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "voter_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "option": "strongly_approve",
                "token_balance": 10000,
                "reputation_score": 85
            }
        }


class VoteSubmissionRequest(BaseModel):
    """Request model for submitting votes"""
    
    poll_id: str = Field(..., description="Poll identifier")
    votes: List[VoteSubmission] = Field(..., min_length=1, description="List of votes to submit")
    
    class Config:
        json_schema_extra = {
            "example": {
                "poll_id": "poll_grant-123_20231112_120000",
                "votes": [
                    {
                        "voter_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                        "option": "strongly_approve",
                        "token_balance": 10000,
                        "reputation_score": 85
                    }
                ]
            }
        }


class PollResultsResponse(BaseModel):
    """Response model for poll results"""
    
    success: bool = Field(..., description="Whether analysis was successful")
    results: Optional[Dict[str, Any]] = Field(None, description="Poll analysis results")
    error: Optional[str] = Field(None, description="Error message if failed")


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/create-poll",
    response_model=PollCreationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Community Poll",
    description="Create a new community poll for a grant proposal"
)
async def create_poll(request: PollCreationRequest) -> PollCreationResponse:
    """
    Create a community poll for grant proposal voting
    
    Creates a poll with:
    - Custom voting options (or default 5-point scale)
    - Configurable duration (1 hour to 30 days)
    - Multiple voting strategies (token-weighted, quadratic, reputation, hybrid)
    - Quorum requirements
    
    Returns:
    - Poll ID and details
    - Voting options
    - Poll timeline
    - Quorum requirements
    """
    try:
        logger.info(f"Creating poll for grant {request.grant_id}")
        
        # Validate voting strategy
        try:
            strategy = VotingStrategy(request.voting_strategy)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid voting strategy. Must be one of: {[s.value for s in VotingStrategy]}"
            )
        
        # Convert custom options if provided
        custom_options_dict = None
        if request.custom_options:
            custom_options_dict = [opt.model_dump() for opt in request.custom_options]
        
        # Create poll
        analyzer = get_sentiment_analyzer()
        result = analyzer.create_poll(
            grant_id=request.grant_id,
            title=request.title,
            description=request.description,
            duration_hours=request.duration_hours,
            voting_strategy=strategy,
            custom_options=custom_options_dict
        )
        
        if result.get("success"):
            # Store poll in memory (in production, use database)
            poll_id = result["poll"]["poll_id"]
            _polls_storage[poll_id] = result["poll"]
            
            logger.info(f"Poll created successfully: {poll_id}")
            
            return PollCreationResponse(
                success=True,
                poll=result["poll"],
                message=result.get("message"),
                error=None
            )
        else:
            logger.error(f"Poll creation failed: {result.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Poll creation failed")
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Poll creation failed: {e}", exc_info=True)
        return PollCreationResponse(
            success=False,
            poll=None,
            message=None,
            error=str(e)
        )


@router.post(
    "/submit-votes",
    status_code=status.HTTP_200_OK,
    summary="Submit Votes",
    description="Submit votes to an active poll"
)
async def submit_votes(request: VoteSubmissionRequest) -> Dict[str, Any]:
    """
    Submit votes to an active poll
    
    Accepts:
    - Voter address (blockchain)
    - Selected option
    - Token balance (for weight calculation)
    - Reputation score (for hybrid voting)
    
    Returns:
    - Vote confirmation
    - Updated vote count
    """
    try:
        logger.info(f"Submitting {len(request.votes)} votes to poll {request.poll_id}")
        
        # Check if poll exists
        if request.poll_id not in _polls_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Poll {request.poll_id} not found"
            )
        
        poll = _polls_storage[request.poll_id]
        
        # Check if poll is still active
        # (In production, check end_time)
        if poll.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Poll {request.poll_id} is not active"
            )
        
        # Add votes to poll
        for vote in request.votes:
            vote_record = {
                "voter_address": vote.voter_address,
                "option": vote.option,
                "token_balance": vote.token_balance,
                "reputation_score": vote.reputation_score,
                "timestamp": datetime.now().isoformat()
            }
            
            # Find option value
            option_value = 50  # default
            for opt in poll["options"]:
                if opt["id"] == vote.option:
                    option_value = opt["value"]
                    break
            
            vote_record["option_value"] = option_value
            poll["votes"].append(vote_record)
        
        # Update poll in storage
        _polls_storage[request.poll_id] = poll
        
        logger.info(f"Votes submitted successfully to {request.poll_id}")
        
        return {
            "success": True,
            "poll_id": request.poll_id,
            "votes_submitted": len(request.votes),
            "total_votes": len(poll["votes"]),
            "message": f"Successfully submitted {len(request.votes)} votes"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vote submission failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/poll-results/{poll_id}",
    response_model=PollResultsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Poll Results",
    description="Retrieve poll results with sentiment analysis"
)
async def get_poll_results(
    poll_id: str = Path(..., description="Poll identifier"),
    total_tokens: float = 100000  # Query param for total token supply
) -> PollResultsResponse:
    """
    Get poll results with comprehensive sentiment analysis
    
    Returns:
    - Vote statistics (total votes, participation rate)
    - Option breakdown with percentages
    - Quorum status
    - Sentiment score and level
    - Recommendations
    - Overall assessment
    """
    try:
        logger.info(f"Retrieving results for poll {poll_id}")
        
        # Check if poll exists
        if poll_id not in _polls_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Poll {poll_id} not found"
            )
        
        poll = _polls_storage[poll_id]
        
        # Analyze poll results
        analyzer = get_sentiment_analyzer()
        
        try:
            strategy = VotingStrategy(poll.get("voting_strategy", "hybrid"))
        except ValueError:
            strategy = VotingStrategy.HYBRID
        
        analysis = analyzer.analyze_poll_results(
            poll_id=poll_id,
            votes=poll.get("votes", []),
            voting_strategy=strategy,
            total_tokens=total_tokens,
            grant_amount=None  # Could be passed as query param
        )
        
        logger.info(
            f"Poll results retrieved: {poll_id}, "
            f"votes={len(poll.get('votes', []))}, "
            f"sentiment={analysis.get('sentiment', {}).get('sentiment_level')}"
        )
        
        return PollResultsResponse(
            success=True,
            results=analysis,
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve poll results: {e}", exc_info=True)
        return PollResultsResponse(
            success=False,
            results=None,
            error=str(e)
        )


@router.get(
    "/poll/{poll_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Poll Details",
    description="Retrieve poll details without analysis"
)
async def get_poll(
    poll_id: str = Path(..., description="Poll identifier")
) -> Dict[str, Any]:
    """
    Get poll details
    
    Returns:
    - Poll metadata
    - Voting options
    - Timeline
    - Current vote count
    """
    try:
        if poll_id not in _polls_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Poll {poll_id} not found"
            )
        
        poll = _polls_storage[poll_id]
        
        # Return poll without full vote details (privacy)
        return {
            "success": True,
            "poll": {
                "poll_id": poll["poll_id"],
                "grant_id": poll["grant_id"],
                "title": poll["title"],
                "description": poll["description"],
                "voting_strategy": poll["voting_strategy"],
                "options": poll["options"],
                "start_time": poll["start_time"],
                "end_time": poll["end_time"],
                "status": poll["status"],
                "total_votes": len(poll.get("votes", [])),
                "metadata": poll.get("metadata", {})
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve poll: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Community Sentiment Health Check",
    description="Check if community sentiment analyzer is operational"
)
async def sentiment_health() -> Dict[str, Any]:
    """
    Health check for community sentiment analyzer
    
    Returns:
    - Status of the analyzer
    - Available features
    - Voting strategies supported
    """
    try:
        analyzer = get_sentiment_analyzer()
        
        return {
            "status": "healthy",
            "features": {
                "poll_creation": True,
                "vote_submission": True,
                "sentiment_analysis": True,
                "quorum_checking": True,
                "weighted_voting": True
            },
            "voting_strategies": [s.value for s in VotingStrategy],
            "sentiment_levels": [s.value for s in SentimentLevel],
            "active_polls": len(_polls_storage)
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Community sentiment analyzer unavailable: {str(e)}"
        )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test the router locally"""
    from datetime import datetime
    
    print("Community sentiment router loaded successfully")
    print(f"Endpoints: {[route.path for route in router.routes]}")

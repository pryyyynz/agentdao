"""
Reviews Router
Handles agent reviews and admin decisions for milestones
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any, Optional
import logging
import uuid

from models import (
    AgentMilestoneReviewCreate,
    AgentMilestoneReview,
    AdminMilestoneDecisionCreate,
    AdminMilestoneDecision,
    PendingAdminReview,
    MilestoneReviewStatus
)
from repositories.reviews_repository import ReviewsRepository
from repositories.milestone_repository import MilestonesRepository
from repositories.grants_repository import GrantsRepository
from middleware.auth_middleware import get_current_user, get_optional_user
from services.email_service import EmailService

# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)

# Initialize repositories and services
reviews_repo = ReviewsRepository()
milestones_repo = MilestonesRepository()
grants_repo = GrantsRepository()
email_service = EmailService()


# ============================================================================
# AGENT REVIEW ENDPOINTS
# ============================================================================

@router.post(
    "/agent/{milestone_id}",
    response_model=AgentMilestoneReview,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Agent Review",
    description="Submit an agent evaluation of a milestone submission"
)
async def create_agent_review(
    milestone_id: str,
    review: AgentMilestoneReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit agent review for a milestone
    
    - Agent can evaluate submitted milestones
    - Multiple agents can review same milestone
    - Each agent can only submit one review per milestone
    """
    try:
        # Convert to UUID
        try:
            milestone_uuid = uuid.UUID(milestone_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid milestone ID format"
            )
        
        # Get milestone
        milestone = milestones_repo.get_by_id(milestone_uuid)
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found"
            )
        
        # Check milestone status
        if milestone['status'] not in ['submitted', 'under_review']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot review milestone with status '{milestone['status']}'. Must be 'submitted' or 'under_review'."
            )
        
        # Create agent review
        created_review = reviews_repo.create_agent_review(
            milestone_id=milestone_uuid,
            agent_id=review.agent_id,
            agent_name=review.agent_name,
            recommendation=review.recommendation.value,
            feedback=review.feedback,
            confidence_score=review.confidence_score,
            review_score=review.review_score,
            strengths=review.strengths,
            weaknesses=review.weaknesses,
            suggestions=review.suggestions,
            deliverables_met=review.deliverables_met,
            quality_rating=review.quality_rating,
            documentation_rating=review.documentation_rating,
            code_quality_rating=review.code_quality_rating,
            review_duration_seconds=review.review_duration_seconds
        )
        
        logger.info(f"Agent {review.agent_id} reviewed milestone {milestone_id} with recommendation: {review.recommendation}")
        
        return AgentMilestoneReview(**created_review)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agent review: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create agent review: {str(e)}"
        )


@router.get(
    "/agent/milestone/{milestone_id}",
    response_model=List[AgentMilestoneReview],
    summary="Get Agent Reviews",
    description="Get all agent reviews for a specific milestone"
)
async def get_agent_reviews(
    milestone_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Get all agent reviews for a milestone"""
    try:
        # Convert to UUID
        try:
            milestone_uuid = uuid.UUID(milestone_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid milestone ID format"
            )
        
        # Get reviews
        reviews = reviews_repo.get_agent_reviews_by_milestone(milestone_uuid)
        
        return [AgentMilestoneReview(**r) for r in reviews]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching agent reviews: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch agent reviews: {str(e)}"
        )


# ============================================================================
# ADMIN DECISION ENDPOINTS
# ============================================================================

@router.post(
    "/admin/{milestone_id}",
    response_model=AdminMilestoneDecision,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Admin Decision",
    description="Admin makes final decision on milestone after reviewing agent evaluations"
)
async def create_admin_decision(
    milestone_id: str,
    decision: AdminMilestoneDecisionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit admin decision for milestone
    
    - Admin reviews milestone submission and agent evaluations
    - Makes final decision: approve, reject, or request revision
    - Triggers email notification to grantee
    - Activates next milestone if approved
    """
    try:
        # Convert to UUID
        try:
            milestone_uuid = uuid.UUID(milestone_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid milestone ID format"
            )
        
        # Get milestone
        milestone = milestones_repo.get_by_id(milestone_uuid)
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found"
            )
        
        # Check milestone status
        if milestone['status'] not in ['submitted', 'under_review']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot review milestone with status '{milestone['status']}'. Must be 'submitted' or 'under_review'."
            )
        
        # TODO: Add admin role check
        # For now, any authenticated user can make admin decision
        
        # Get admin wallet address with fallback
        admin_wallet = current_user.get('wallet_address') or current_user.get('email', 'admin@system')
        
        # Create admin decision
        created_decision = reviews_repo.create_admin_decision(
            milestone_id=milestone_uuid,
            admin_wallet_address=admin_wallet,
            admin_email=current_user.get('email'),
            decision=decision.decision.value,
            admin_feedback=decision.admin_feedback,
            override_agents=decision.override_agents,
            decision_notes=decision.decision_notes,
            approved_amount=decision.approved_amount,
            payment_authorized=decision.payment_authorized
        )
        
        logger.info(f"Admin {current_user.get('email')} made decision '{decision.decision}' for milestone {milestone_id}")
        
        # Send email notification to grantee
        try:
            grant = grants_repo.get_by_id(uuid.UUID(milestone['grant_id']))
            recipient_email = grant.get('applicant_email')
            
            # Fallback to team email if applicant_email not set
            if not recipient_email:
                metadata = grant.get('metadata', {})
                if isinstance(metadata, str):
                    import json
                    metadata = json.loads(metadata)
                detailed_proposal = metadata.get('detailed_proposal')
                if detailed_proposal:
                    if isinstance(detailed_proposal, str):
                        import json
                        detailed_proposal = json.loads(detailed_proposal)
                    team = detailed_proposal.get('team', [])
                    if team and len(team) > 0:
                        recipient_email = team[0].get('email')
            
            if grant and recipient_email:
                email_service.send_milestone_decision_email(
                    to_email=recipient_email,
                    grant_title=grant['title'],
                    milestone_number=milestone['milestone_number'],
                    milestone_title=milestone['title'],
                    decision=decision.decision.value,
                    admin_feedback=decision.admin_feedback,
                    amount=float(milestone['amount']),
                    grant_id=str(milestone['grant_id'])
                )
                logger.info(f"Decision email sent to {recipient_email}")
        except Exception as email_error:
            logger.error(f"Failed to send decision email: {email_error}")
            # Don't fail the request if email fails
        
        return AdminMilestoneDecision(**created_decision)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating admin decision: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create admin decision: {str(e)}"
        )


@router.get(
    "/admin/milestone/{milestone_id}",
    response_model=Optional[AdminMilestoneDecision],
    summary="Get Admin Decision",
    description="Get admin decision for a specific milestone"
)
async def get_admin_decision(
    milestone_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Get admin decision for a milestone"""
    try:
        # Convert to UUID
        try:
            milestone_uuid = uuid.UUID(milestone_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid milestone ID format"
            )
        
        # Get decision
        decision = reviews_repo.get_admin_decision_by_milestone(milestone_uuid)
        
        if not decision:
            return None
        
        return AdminMilestoneDecision(**decision)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin decision: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch admin decision: {str(e)}"
        )


@router.get(
    "/admin/pending",
    response_model=List[PendingAdminReview],
    summary="Get Pending Reviews",
    description="Get all milestones awaiting admin review"
)
async def get_pending_reviews(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all milestones pending admin review
    
    - Returns milestones in 'submitted' or 'under_review' status
    - Includes agent review summary
    - Sorted by submission date (oldest first)
    """
    try:
        # TODO: Add admin role check
        
        # Get pending reviews
        pending = reviews_repo.get_pending_admin_reviews(limit=limit)
        
        return [PendingAdminReview(**p) for p in pending]
        
    except Exception as e:
        logger.error(f"Error fetching pending reviews: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending reviews: {str(e)}"
        )


@router.get(
    "/status/{milestone_id}",
    response_model=MilestoneReviewStatus,
    summary="Get Review Status",
    description="Get complete review status for a milestone including agent reviews and admin decision"
)
async def get_review_status(
    milestone_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Get complete review status for a milestone"""
    try:
        # Convert to UUID
        try:
            milestone_uuid = uuid.UUID(milestone_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid milestone ID format"
            )
        
        # Get status
        status_data = reviews_repo.get_milestone_review_status(milestone_uuid)
        
        if not status_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found"
            )
        
        return MilestoneReviewStatus(**status_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching review status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch review status: {str(e)}"
        )

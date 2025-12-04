"""
Milestones Router
Handles milestone creation, submission, review, and payment tracking
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any, Optional
import logging
import uuid
from decimal import Decimal

from models import (
    MilestoneCreate,
    MilestoneUpdate,
    MilestoneSubmission,
    MilestoneReview,
    Milestone,
    MilestoneList,
    MilestoneProgressSummary
)
from repositories.milestone_repository import MilestonesRepository
from repositories.grants_repository import GrantsRepository
from middleware.auth_middleware import get_current_user, get_optional_user
from utils.database import get_db_cursor
from services.email_service import EmailService

# Setup logger
logger = logging.getLogger(__name__)

# Initialize email service
email_service = EmailService()

# Create router
router = APIRouter(
    prefix="/milestones",
    tags=["Milestones"]
)

# Initialize repositories
milestones_repo = MilestonesRepository()
grants_repo = GrantsRepository()


# ============================================================================
# MILESTONE ENDPOINTS
# ============================================================================

@router.post(
    "/grant/{grant_id}",
    response_model=List[Milestone],
    status_code=status.HTTP_201_CREATED,
    summary="Create Milestones for Grant",
    description="Create multiple milestones for a grant during submission"
)
async def create_milestones(
    grant_id: str,
    milestones: List[MilestoneCreate],
    current_user: dict = Depends(get_current_user)
):
    """
    Create milestones for a grant
    
    - Validates grant exists and belongs to user
    - Ensures milestone numbers are sequential starting from 1
    - Validates total milestone amounts match grant amount
    - First milestone is automatically set to 'active', rest are 'pending'
    """
    try:
        # Convert grant_id to UUID
        try:
            grant_uuid = uuid.UUID(grant_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid grant ID format"
            )
        
        # Check if grant exists and belongs to user
        grant = grants_repo.get_by_id(grant_uuid)
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grant not found"
            )
        
        if grant.get('user_id') != current_user['user_id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add milestones to this grant"
            )
        
        # Validate milestone numbers are sequential
        milestone_numbers = [m.milestone_number for m in milestones]
        expected_numbers = list(range(1, len(milestones) + 1))
        if sorted(milestone_numbers) != expected_numbers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Milestone numbers must be sequential starting from 1"
            )
        
        # Validate total amounts match grant amount
        total_milestone_amount = sum(m.amount for m in milestones)
        if total_milestone_amount != grant['requested_amount']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total milestone amounts ({total_milestone_amount}) must equal grant amount ({grant['requested_amount']})"
            )
        
        # Prepare milestone data
        milestone_data = []
        for milestone in sorted(milestones, key=lambda m: m.milestone_number):
            # First milestone is in_progress when grant is approved, rest are pending
            initial_status = 'in_progress' if milestone.milestone_number == 1 and grant['status'] == 'approved' else 'pending'
            
            milestone_data.append({
                'milestone_number': milestone.milestone_number,
                'title': milestone.title,
                'description': milestone.description,
                'deliverables': milestone.deliverables,
                'amount': milestone.amount,
                'currency': milestone.currency,
                'estimated_completion_date': milestone.estimated_completion_date,
                'status': initial_status
            })
        
        # Create milestones
        created_milestones = milestones_repo.create_batch(grant_uuid, milestone_data)
        
        # Update grant with milestone info
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE grants 
                SET has_milestones = TRUE,
                    total_milestones = %s,
                    current_milestone = 1,
                    milestones_payment_model = 'sequential',
                    updated_at = CURRENT_TIMESTAMP
                WHERE grant_id = %s
            """, (len(milestones), str(grant_uuid)))
            cur.connection.commit()
        
        logger.info(f"Created {len(created_milestones)} milestones for grant {grant_id}")
        
        return [Milestone(**m) for m in created_milestones]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating milestones: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create milestones: {str(e)}"
        )


@router.get(
    "/grant/{grant_id}",
    response_model=MilestoneList,
    summary="Get Grant Milestones",
    description="Get all milestones for a specific grant"
)
async def get_grant_milestones(
    grant_id: str,
    status_filter: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Get all milestones for a grant with optional status filter
    """
    try:
        # Convert grant_id to UUID
        try:
            grant_uuid = uuid.UUID(grant_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid grant ID format"
            )
        
        # Check if grant exists
        grant = grants_repo.get_by_id(grant_uuid)
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grant not found"
            )
        
        # Get milestones
        milestones = milestones_repo.get_by_grant(grant_uuid, status=status_filter)
        
        # Get progress summary
        progress = milestones_repo.get_progress_summary(grant_uuid)
        
        return MilestoneList(
            milestones=[Milestone(**m) for m in milestones],
            grant_id=grant_id,
            total_milestones=progress['total_milestones'],
            completed_milestones=progress['completed_milestones'],
            total_amount=progress['total_amount'],
            paid_amount=progress['paid_amount'],
            completion_percentage=progress['completion_percentage']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching milestones: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch milestones: {str(e)}"
        )


@router.get(
    "/{milestone_id}",
    response_model=Milestone,
    summary="Get Milestone Details",
    description="Get detailed information about a specific milestone"
)
async def get_milestone(
    milestone_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Get details of a specific milestone"""
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
        
        return Milestone(**milestone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching milestone: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch milestone: {str(e)}"
        )


@router.post(
    "/{milestone_id}/submit",
    response_model=Milestone,
    summary="Submit Milestone",
    description="Submit milestone with proof of work for review"
)
async def submit_milestone(
    milestone_id: str,
    submission: MilestoneSubmission,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit milestone for review
    
    - Only grantee can submit
    - Milestone must be in 'in_progress' status
    - Requires proof of work URL and submission notes
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
        
        # Check if user owns the grant
        grant = grants_repo.get_by_id(uuid.UUID(milestone['grant_id']))
        if grant.get('user_id') != current_user['user_id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to submit this milestone"
            )
        
        # Check milestone status
        if milestone['status'] != 'in_progress':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit milestone with status '{milestone['status']}'. Must be 'in_progress'."
            )
        
        # Submit milestone
        updated_milestone = milestones_repo.submit_milestone(
            milestone_uuid,
            submission.proof_of_work_url,
            submission.submission_notes
        )
        
        logger.info(f"Milestone {milestone_id} submitted for review by user {current_user['user_id']}")
        
        # Trigger automated agent evaluation in background
        try:
            from services.milestone_evaluator import get_milestone_evaluator
            import asyncio
            evaluator = get_milestone_evaluator()
            # Run evaluation in background without blocking response
            asyncio.create_task(evaluator.evaluate_milestone(milestone_uuid))
            logger.info(f"Triggered automated evaluation for milestone {milestone_id}")
        except Exception as eval_error:
            logger.error(f"Failed to trigger milestone evaluation: {eval_error}")
            # Don't fail the submission if evaluation trigger fails
        
        return Milestone(**updated_milestone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting milestone: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit milestone: {str(e)}"
        )


@router.post(
    "/{milestone_id}/review",
    response_model=Milestone,
    summary="Review Milestone",
    description="Review milestone submission (approve/reject/request revision)"
)
async def review_milestone(
    milestone_id: str,
    review: MilestoneReview,
    current_user: dict = Depends(get_current_user)
):
    """
    Review a submitted milestone
    
    - Requires admin/reviewer role (TODO: implement role check)
    - Milestone must be in 'submitted' status
    - Can approve, reject, or request revisions
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
        if milestone['status'] != 'in_progress':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit milestone with status '{milestone['status']}'. Must be 'in_progress'."
            )
        
        # TODO: Add admin/reviewer role check
        # For now, any authenticated user can review
        
        # Determine new status
        if review.approved:
            new_status = 'approved'
        elif review.request_revision:
            new_status = 'revision_requested'
        else:
            new_status = 'rejected'
        
        # Update milestone status
        updated_milestone = milestones_repo.update_status(
            milestone_uuid,
            new_status,
            reviewed_by=current_user['email'] or current_user['user_id'],
            reviewer_feedback=review.reviewer_feedback,
            review_score=review.review_score
        )
        
        logger.info(f"Milestone {milestone_id} reviewed with status '{new_status}' by {current_user['email']}")
        
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
                    decision=new_status,
                    admin_feedback=review.reviewer_feedback or 'No additional feedback provided.',
                    amount=float(milestone['amount']),
                    grant_id=str(milestone['grant_id'])
                )
                logger.info(f"Decision email sent to {recipient_email}")
        except Exception as email_error:
            logger.error(f"Failed to send decision email: {email_error}")
            # Don't fail the request if email fails
        
        # TODO: Trigger payment if approved
        
        return Milestone(**updated_milestone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing milestone: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to review milestone: {str(e)}"
        )


@router.post(
    "/{milestone_id}/release-payment",
    response_model=Milestone,
    summary="Release Milestone Payment",
    description="Release payment for approved milestone"
)
async def release_milestone_payment(
    milestone_id: str,
    payment_tx_hash: str,
    on_chain_milestone_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Record payment release for milestone
    
    - Milestone must be approved
    - Requires blockchain transaction hash
    - TODO: Add admin role check
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
        if milestone['status'] != 'approved':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot release payment for milestone with status '{milestone['status']}'. Must be 'approved'."
            )
        
        # Check if payment already released
        if milestone.get('payment_tx_hash'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already released for this milestone"
            )
        
        # TODO: Add admin role check
        
        # Record payment
        updated_milestone = milestones_repo.release_payment(
            milestone_uuid,
            payment_tx_hash,
            on_chain_milestone_id
        )
        
        logger.info(f"Payment released for milestone {milestone_id}: {payment_tx_hash}")
        
        # Send payment confirmation email to grantee
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
                milestone_url = f"{grant.get('title', 'Grant')}/milestones"
                # Send a simple confirmation email (reusing the decision email format)
                email_service.send_milestone_decision_email(
                    to_email=recipient_email,
                    grant_title=grant['title'],
                    milestone_number=milestone['milestone_number'],
                    milestone_title=milestone['title'],
                    decision='approved',
                    admin_feedback=f"Payment has been released!\n\nTransaction Hash: {payment_tx_hash}\nAmount: {milestone['amount']} {milestone['currency']}",
                    amount=float(milestone['amount']),
                    grant_id=str(milestone['grant_id'])
                )
                logger.info(f"Payment confirmation email sent to {recipient_email}")
        except Exception as email_error:
            logger.error(f"Failed to send payment confirmation email: {email_error}")
            # Don't fail the request if email fails
        
        return Milestone(**updated_milestone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error releasing payment: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to release payment: {str(e)}"
        )


@router.put(
    "/{milestone_id}",
    response_model=Milestone,
    summary="Update Milestone",
    description="Update milestone details (only before submission)"
)
async def update_milestone(
    milestone_id: str,
    milestone_update: MilestoneUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update milestone details
    
    - Only grantee can update
    - Can only update milestones in 'pending' or 'in_progress' status
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
        
        # Check if user owns the grant
        grant = grants_repo.get_by_id(uuid.UUID(milestone['grant_id']))
        if grant.get('user_id') != current_user['user_id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this milestone"
            )
        
        # Check milestone status
        if milestone['status'] not in ['pending', 'active']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot update milestone with status '{milestone['status']}'"
            )
        
        # Update milestone
        update_data = milestone_update.model_dump(exclude_unset=True)
        updated_milestone = milestones_repo.update(milestone_uuid, **update_data)
        
        logger.info(f"Milestone {milestone_id} updated by user {current_user['user_id']}")
        
        return Milestone(**updated_milestone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating milestone: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update milestone: {str(e)}"
        )


@router.get(
    "/grant/{grant_id}/progress",
    response_model=Dict[str, Any],
    summary="Get Milestone Progress",
    description="Get detailed progress summary for grant milestones"
)
async def get_milestone_progress(
    grant_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Get detailed progress summary for grant milestones"""
    try:
        # Convert grant_id to UUID
        try:
            grant_uuid = uuid.UUID(grant_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid grant ID format"
            )
        
        # Check if grant exists
        grant = grants_repo.get_by_id(grant_uuid)
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grant not found"
            )
        
        # Get progress summary
        progress = milestones_repo.get_progress_summary(grant_uuid)
        progress['grant_id'] = grant_id
        progress['grant_title'] = grant['title']
        
        return progress
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching progress: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch progress: {str(e)}"
        )

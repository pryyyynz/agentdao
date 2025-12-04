"""
Grants Router
Handles grant submission, retrieval, and management
"""

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import uuid
import json
import re
import httpx
from psycopg2.extras import Json
from decimal import Decimal

from repositories.grants_repository import GrantsRepository
from utils.ipfs_client import IPFSClient
from utils.common import get_utc_now
from utils.database import get_db_cursor
from config import settings
from middleware.auth_middleware import get_current_user, get_optional_user
from fastapi import Depends

# Setup logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/grants",
    tags=["Grants Management"]
)

# Initialize repositories
grants_repo = GrantsRepository()
ipfs_client = IPFSClient()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def trigger_evaluation(grant_id: int, grant_data: Dict[str, Any]) -> None:
    """
    Trigger agent evaluation workflow via MCP server
    
    Args:
        grant_id: Integer ID of the grant
        grant_data: Grant data from database
    """
    try:
        mcp_url = settings.MCP_SERVER_URL
        if not mcp_url:
            logger.info("MCP_SERVER_URL not configured, skipping evaluation trigger")
            return
        
        # Extract metadata (contains detailed_proposal and other fields)
        metadata = grant_data.get('metadata', {})
        if isinstance(metadata, str):
            import json
            try:
                metadata = json.loads(metadata)
            except:
                metadata = {}
        
        # Prepare comprehensive payload for MCP server orchestrator
        payload = {
            "grant_id": grant_id,
            "applicant": grant_data.get('applicant_address'),
            "ipfs_hash": grant_data.get('ipfs_hash'),
            "project_name": grant_data.get('title'),
            "description": grant_data.get('description'),
            "amount": float(grant_data.get('requested_amount', 0)),
            # Include metadata fields for detailed AI analysis
            "category": metadata.get('category'),
            "duration_months": metadata.get('duration_months'),
            "team_size": grant_data.get('team_size'),
            "github_repo": metadata.get('github_repo'),
            "website": metadata.get('website'),
            "twitter": metadata.get('twitter'),
            "discord": metadata.get('discord'),
            "detailed_proposal": metadata.get('detailed_proposal'),  # JSON string with full proposal
        }
        
        # Send notification to MCP server
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{mcp_url}/api/grants/evaluate",
                json=payload,
                timeout=5.0
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully triggered evaluation for grant {grant_id}")
            else:
                logger.warning(f"MCP server returned {response.status_code}: {response.text}")
                
    except httpx.TimeoutException:
        logger.warning(f"Timeout connecting to MCP server at {mcp_url}")
    except Exception as e:
        logger.error(f"Error triggering evaluation: {e}")
        # Don't raise - grant submission should succeed even if evaluation trigger fails


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class GrantSubmissionRequest(BaseModel):
    """Grant submission request model"""
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=100, max_length=5000)
    requested_amount: float = Field(..., gt=0)
    category: str = Field(...)
    duration_months: int = Field(..., ge=1, le=24)
    team_size: int = Field(default=1, ge=1)
    github_repo: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None
    discord: Optional[str] = None
    detailed_proposal: str = Field(...)  # JSON string of full proposal
    applicant_address: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "DeFi Insurance Protocol",
                "description": "A decentralized insurance protocol protecting users against smart contract exploits...",
                "requested_amount": 25.5,
                "category": "defi",
                "duration_months": 8,
                "team_size": 3,
                "github_repo": "https://github.com/example/protocol",
                "website": "https://example.com",
                "detailed_proposal": "{...full proposal data...}"
            }
        }


class GrantResponse(BaseModel):
    """Grant response model"""
    id: str
    title: str
    description: str
    requested_amount: float
    category: str
    status: str
    ipfs_hash: Optional[str]
    applicant_address: Optional[str]
    created_at: str
    updated_at: str


class GrantListResponse(BaseModel):
    """List of grants response"""
    grants: List[GrantResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# GRANT ENDPOINTS
# ============================================================================

@router.post(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Submit Grant Proposal",
    description="Submit a new grant proposal for evaluation (requires authentication)"
)
async def submit_grant(
    grant: GrantSubmissionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit a new grant proposal
    
    This endpoint:
    1. Uploads proposal to IPFS
    2. Creates grant record in database
    3. Returns grant ID and IPFS hash
    
    The grant will then be evaluated by AI agents asynchronously.
    """
    try:
        logger.info(f"Submitting grant proposal: {grant.title}")
        
        # Validate applicant address
        if not grant.applicant_address or grant.applicant_address == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Applicant wallet address is required. Please connect your wallet."
            )
        
        # Validate Ethereum address format (0x + 40 hex characters)
        import re
        if not re.match(r'^0x[a-fA-F0-9]{40}$', grant.applicant_address):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Ethereum address format. Address must start with 0x followed by 40 hexadecimal characters."
            )
        
        # Generate grant ID
        grant_id = str(uuid.uuid4())
        
        # Parse and validate detailed proposal to ensure agent-critical fields exist
        try:
            detailed_obj = json.loads(grant.detailed_proposal) if isinstance(grant.detailed_proposal, str) and grant.detailed_proposal else {}
        except Exception:
            detailed_obj = {}
        
        # Enforce critical fields so agents don't skip evaluations
        missing_fields = []
        if not detailed_obj.get('budgetBreakdown') or len(detailed_obj.get('budgetBreakdown', [])) == 0:
            missing_fields.append('budgetBreakdown')
        if not detailed_obj.get('githubProfiles') or len(detailed_obj.get('githubProfiles', [])) == 0:
            missing_fields.append('githubProfiles')
        if not detailed_obj.get('walletAddresses') or len(detailed_obj.get('walletAddresses', [])) == 0:
            missing_fields.append('walletAddresses')
        
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required proposal fields for evaluation: {', '.join(missing_fields)}"
            )
        
        # Upload detailed proposal to IPFS
        ipfs_hash = None
        try:
            proposal_data = {
                "grant_id": grant_id,
                "title": grant.title,
                "description": grant.description,
                "requested_amount": grant.requested_amount,
                "category": grant.category,
                "duration_months": grant.duration_months,
                "team_size": grant.team_size,
                "github_repo": grant.github_repo,
                "website": grant.website,
                "twitter": grant.twitter,
                "discord": grant.discord,
                "detailed_proposal": grant.detailed_proposal,
                "submitted_at": get_utc_now().isoformat()
            }
            
            ipfs_hash = ipfs_client.upload_json(proposal_data)
            logger.info(f"Proposal uploaded to IPFS: {ipfs_hash}")
        except Exception as e:
            logger.warning(f"Failed to upload to IPFS: {e}. Continuing without IPFS hash.")
        
        # Create grant in database
        try:
            from decimal import Decimal
            
            # Prepare metadata as proper JSON for PostgreSQL
            metadata_dict = {
                "category": grant.category,
                "duration_months": grant.duration_months,
                "github_repo": grant.github_repo,
                "website": grant.website,
                "twitter": grant.twitter,
                "discord": grant.discord,
                "detailed_proposal": grant.detailed_proposal
            }
            
            # Use repository's create method with correct parameters
            created_grant = grants_repo.create(
                title=grant.title,
                description=grant.description,
                requested_amount=Decimal(str(grant.requested_amount)),  # Convert to Decimal
                applicant_address=grant.applicant_address,  # Now validated, not empty
                currency="ETH",
                team_size=grant.team_size,
                ipfs_hash=ipfs_hash,
                metadata=Json(metadata_dict),  # Wrap dict in Json() for psycopg2
                user_id=current_user['user_id']  # Link grant to authenticated user
            )
            logger.info(f"Grant created in database: {created_grant.get('grant_id')}")
            
        except Exception as e:
            logger.error(f"Failed to create grant in database: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save grant: {str(e)}"
            )
        
        # Trigger agent evaluation workflow
        grant_id_int = created_grant.get('id')  # Integer ID for MCP server
        try:
            await trigger_evaluation(grant_id_int, created_grant)
            logger.info(f"Evaluation triggered for grant {grant_id_int}")
        except Exception as e:
            logger.warning(f"Failed to trigger evaluation workflow: {e}. Grant created but evaluation must be triggered manually.")
        
        # Return success response
        return {
            "success": True,
            "message": "Grant proposal submitted successfully",
            "data": {
                "grant_id": str(created_grant.get('grant_id')),
                "ipfs_hash": ipfs_hash,
                "status": "pending",
                "next_steps": "Your grant will be evaluated by AI agents within 24-48 hours"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting grant: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit grant: {str(e)}"
        )


@router.get(
    "",
    response_model=Dict[str, Any],
    summary="Get All Grants",
    description="Retrieve list of grant proposals. Authenticated users see only their grants."
)
async def get_grants(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    applicant: Optional[str] = Query(None, description="Filter by applicant address"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Get all grant proposals with optional filtering.
    Authenticated users see only their grants.
    """
    try:
        # If user is authenticated, filter by user_id
        user_id = current_user['user_id'] if current_user else None
        
        # Use repository's get_all method
        grants = grants_repo.get_all(
            status=status_filter,
            limit=page_size,
            offset=(page - 1) * page_size,
            user_id=user_id
        )
        
        # For now, return count based on results (can add proper count method later)
        total_count = len(grants) if grants else 0
        
        return {
            "success": True,
            "data": grants,
            "pagination": {
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching grants: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch grants: {str(e)}"
        )


@router.get(
    "/activities",
    response_model=Dict[str, Any],
    summary="Get Agent Activities",
    description="Get recent agent activity log entries for user's grants"
)
async def get_agent_activities(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of activities to return"),
    agent_name: Optional[str] = Query(None, description="Filter by agent name"),
    activity_type: Optional[str] = Query(None, description="Filter by activity type"),
    grant_id: Optional[str] = Query(None, description="Filter by grant ID"),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Get agent activity log with optional filters (filtered by user's grants if authenticated)
    """
    try:
        # Build query with filters
        query_parts = [
            "SELECT",
            "    aal.id, aal.activity_id, aal.agent_name, aal.grant_id, aal.activity_type,",
            "    aal.action, aal.details, aal.success, aal.error_message, aal.duration_ms,",
            "    aal.transaction_hash, aal.gas_used, aal.timestamp, aal.metadata",
            "FROM agent_activity_log aal",
        ]
        params = []
        
        # Join with grants table if user is authenticated to filter by user_id
        if current_user:
            query_parts.append("INNER JOIN grants g ON aal.grant_id = g.grant_id")
            query_parts.append("WHERE g.user_id = %s")
            params.append(current_user['user_id'])
        else:
            query_parts.append("WHERE 1=1")
        
        # Add filters
        if agent_name:
            query_parts.append("AND aal.agent_name = %s")
            params.append(agent_name)
        
        if activity_type:
            query_parts.append("AND aal.activity_type = %s")
            params.append(activity_type)
        
        if grant_id:
            # Support both int and UUID for grant_id filter
            try:
                int_id = int(grant_id)
                # Get UUID from int ID
                uuid_query = "SELECT grant_id FROM grants WHERE id = %s"
                with get_db_cursor() as cur:
                    cur.execute(uuid_query, (int_id,))
                    result = cur.fetchone()
                    if result:
                        query_parts.append("AND aal.grant_id = %s")
                        params.append(str(result['grant_id']))
            except ValueError:
                # Use as UUID directly
                query_parts.append("AND aal.grant_id = %s")
                params.append(grant_id)
        
        query_parts.append("ORDER BY aal.timestamp DESC")
        query_parts.append("LIMIT %s")
        params.append(limit)
        
        query = " ".join(query_parts)
        
        with get_db_cursor() as cur:
            cur.execute(query, tuple(params))
            activities = cur.fetchall()
        
        # Transform data to match frontend expectations
        transformed_activities = []
        for activity in activities:
            transformed = {
                "id": str(activity.get('activity_id', activity.get('id', ''))),
                "agent_type": activity.get('agent_name', ''),  # Map agent_name to agent_type
                "grant_id": activity.get('grant_id', ''),
                "action": activity.get('action', ''),
                "message": activity.get('action', ''),  # Use action as message
                "timestamp": activity.get('timestamp', '').isoformat() if activity.get('timestamp') else '',
                "metadata": {
                    "activity_type": activity.get('activity_type', ''),
                    "details": activity.get('details', {}),
                    "success": activity.get('success', True),
                    "duration_ms": activity.get('duration_ms'),
                    "error_message": activity.get('error_message')
                }
            }
            transformed_activities.append(transformed)
        
        return {
            "success": True,
            "data": transformed_activities,
            "count": len(transformed_activities)
        }
        
    except Exception as e:
        logger.error(f"Error fetching agent activities: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch activities: {str(e)}"
        )


@router.get(
    "/stats/overview",
    response_model=Dict[str, Any],
    summary="Get Grant Statistics",
    description="Get overview statistics for user's grants"
)
async def get_grant_stats(current_user: Optional[dict] = Depends(get_optional_user)):
    """
    Get overview statistics for the dashboard (filtered by user if authenticated)
    """
    try:
        # Filter by user_id if authenticated
        if current_user:
            query = """
                SELECT 
                    COUNT(*) as total_grants,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_grants,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_grants,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_grants,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN requested_amount ELSE 0 END), 0) as total_funded
                FROM grants
                WHERE user_id = %s
            """
            params = (current_user['user_id'],)
        else:
            query = """
                SELECT 
                    COUNT(*) as total_grants,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_grants,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_grants,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_grants,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN requested_amount ELSE 0 END), 0) as total_funded
                FROM grants
            """
            params = ()
        
        with get_db_cursor() as cur:
            cur.execute(query, params)
            stats = cur.fetchone()
        
        return {
            "success": True,
            "data": {
                "total_grants": stats['total_grants'] if stats else 0,
                "pending_grants": stats['pending_grants'] if stats else 0,
                "approved_grants": stats['approved_grants'] if stats else 0,
                "rejected_grants": stats['rejected_grants'] if stats else 0,
                "total_funded": str(stats['total_funded']) if stats else "0"
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching grant statistics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        )


@router.get(
    "/{grant_id}",
    response_model=Dict[str, Any],
    summary="Get Grant by ID",
    description="Retrieve a specific grant proposal by ID (integer ID or UUID)"
)
async def get_grant(grant_id: str):
    """
    Get a specific grant by ID (supports both integer ID and UUID)
    """
    try:
        grant = None
        
        # Try to parse as integer first (database ID)
        try:
            int_id = int(grant_id)
            # Get by integer ID
            query = "SELECT * FROM grants WHERE id = %s"
            with get_db_cursor() as cur:
                cur.execute(query, (int_id,))
                result = cur.fetchone()
                if result:
                    grant = dict(result)
        except ValueError:
            # Not an integer, try as UUID
            try:
                uuid_obj = uuid.UUID(grant_id)
                grant = grants_repo.get_by_id(uuid_obj)
            except ValueError:
                # Invalid format
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid grant ID format. Must be integer or UUID."
                )
        
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Grant {grant_id} not found"
            )
        
        return {
            "success": True,
            "data": grant
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching grant {grant_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch grant: {str(e)}"
        )


@router.get(
    "/{grant_id}/evaluations",
    response_model=Dict[str, Any],
    summary="Get Grant Evaluations",
    description="Get all AI agent evaluations for a grant"
)
async def get_grant_evaluations(grant_id: str):
    """
    Get all evaluations for a specific grant (supports both integer ID and UUID)
    """
    try:
        from repositories.evaluations_repository import EvaluationsRepository
        
        # First, get the grant to find its UUID and integer ID
        grant = None
        grant_uuid = None
        grant_int_id = None
        
        try:
            int_id = int(grant_id)
            grant_int_id = int_id
            # Get by integer ID
            query = "SELECT grant_id FROM grants WHERE id = %s"
            with get_db_cursor() as cur:
                cur.execute(query, (int_id,))
                result = cur.fetchone()
                if result:
                    grant_uuid = result['grant_id']
        except ValueError:
            # Try as UUID
            try:
                grant_uuid = uuid.UUID(grant_id)
                # Get integer ID from UUID
                query = "SELECT id FROM grants WHERE grant_id = %s"
                with get_db_cursor() as cur:
                    cur.execute(query, (str(grant_uuid),))
                    result = cur.fetchone()
                    if result:
                        grant_int_id = result['id']
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid grant ID format"
                )
        
        if not grant_uuid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Grant {grant_id} not found"
            )
        
        eval_repo = EvaluationsRepository()
        evaluations = eval_repo.get_by_grant(grant_uuid)  # Use UUID object, not string
        
        # Transform evaluations to match frontend interface
        transformed_evaluations = []
        for evaluation in evaluations:
            transformed = {
                "id": evaluation.get("id"),
                "grant_id": grant_int_id,  # Use integer ID for frontend
                "agent_type": evaluation.get("agent_name"),  # Map agent_name to agent_type
                "score": float(evaluation.get("score", 0)),  # Convert to float
                "reasoning": evaluation.get("summary", ""),  # Map summary to reasoning
                "created_at": evaluation.get("started_at", evaluation.get("created_at", "")),
                "vote_tx_hash": evaluation.get("on_chain_vote_tx")
            }
            transformed_evaluations.append(transformed)
        
        return {
            "success": True,
            "data": transformed_evaluations,
            "count": len(transformed_evaluations)
        }
        
    except Exception as e:
        logger.error(f"Error fetching evaluations for grant {grant_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch evaluations: {str(e)}"
        )


@router.get(
    "/{grant_id}/milestones",
    response_model=Dict[str, Any],
    summary="Get Grant Milestones",
    description="Get all milestones for a grant"
)
async def get_grant_milestones(grant_id: str):
    """
    Get all milestones for a specific grant (supports both integer ID and UUID)
    """
    try:
        grant_uuid = None
        
        try:
            int_id = int(grant_id)
            # Get UUID by integer ID
            query = "SELECT grant_id FROM grants WHERE id = %s"
            with get_db_cursor() as cur:
                cur.execute(query, (int_id,))
                result = cur.fetchone()
                if result:
                    grant_uuid = result['grant_id']
        except ValueError:
            # Try as UUID
            try:
                grant_uuid = uuid.UUID(grant_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid grant ID format"
                )
        
        if not grant_uuid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Grant {grant_id} not found"
            )
        
        # Query milestones
        query = """
            SELECT 
                id, milestone_id, grant_id, milestone_number, title, description,
                amount, deliverables, success_criteria, estimated_duration_days,
                status, review_score, reviewer_notes, on_chain_milestone_id,
                release_transaction_hash, created_at, due_date, submitted_at,
                approved_at, released_at, metadata
            FROM milestones
            WHERE grant_id = %s
            ORDER BY milestone_number ASC
        """
        
        with get_db_cursor() as cur:
            cur.execute(query, (str(grant_uuid),))
            milestones = cur.fetchall()
        
        return {
            "success": True,
            "data": milestones if milestones else [],
            "count": len(milestones) if milestones else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching milestones for grant {grant_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch milestones: {str(e)}"
        )


@router.patch(
    "/{grant_id}",
    response_model=Dict[str, Any],
    summary="Update Grant Status",
    description="Update grant status (admin only)"
)
async def update_grant_status(grant_id: str, status_update: str):
    """
    Update grant status (supports both integer ID and UUID)
    """
    try:
        valid_statuses = ["pending", "under_review", "approved", "rejected", "funded"]
        
        if status_update not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )
        
        updated_grant = None
        
        # Try integer ID first
        try:
            int_id = int(grant_id)
            # Get UUID from integer ID
            query = "SELECT grant_id FROM grants WHERE id = %s"
            with get_db_cursor() as cur:
                cur.execute(query, (int_id,))
                result = cur.fetchone()
                if result:
                    updated_grant = grants_repo.update_status(result['grant_id'], status_update)
        except ValueError:
            # Try as UUID
            try:
                uuid_obj = uuid.UUID(grant_id)
                updated_grant = grants_repo.update_status(uuid_obj, status_update)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid grant ID format"
                )
        
        if not updated_grant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Grant {grant_id} not found"
            )
        
        return {
            "success": True,
            "message": f"Grant status updated to {status_update}",
            "data": updated_grant
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating grant {grant_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update grant: {str(e)}"
        )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("✅ Grants router module loaded successfully")
    print(f"Available endpoints: {len(router.routes)}")
    for route in router.routes:
        print(f"  - {route.methods} {route.path}")


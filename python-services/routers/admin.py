from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import json
import uuid
from repositories.grants_repository import GrantsRepository
from repositories.evaluations_repository import EvaluationsRepository
from utils.database import get_db_cursor
from models import (
    AgentStatusUpdate,
    AgentWeightUpdate,
    AgentRegistration,
    GrantActionRequest,
    SystemPauseRequest,
    EmergencyStopRequest,
    EmergencyWithdrawalRequest,
    EmergencyWithdrawalApproval,
    AgentStatusResponse,
    SystemStatusResponse
)
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get(
    "/system-health",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def get_system_health():
    """
    Get system health statistics for admin dashboard
    """
    try:
        # Get grant statistics
        all_grants = GrantsRepository.get_all()
        total_grants = len(all_grants)
        
        # Count grants under evaluation
        active_evaluations = len([
            g for g in all_grants 
            if g.get('status') in ['pending', 'under_review']
        ])
        
        # Count pending admin actions (grants awaiting approval)
        pending_actions = len([
            g for g in all_grants 
            if g.get('status') == 'under_review'
        ])
        
        # Get agent activity count from database
        with get_db_cursor() as cursor:
            # Count unique agents active in last 24 hours
            cursor.execute("""
                SELECT COUNT(DISTINCT agent_name) as active_agents
                FROM agent_activity_log
                WHERE timestamp > NOW() - INTERVAL '24 hours'
            """)
            result = cursor.fetchone()
            active_agents = result['active_agents'] if result else 0
        
        # Get actual blockchain treasury balance
        from web3 import Web3
        rpc_url = "https://sepolia.infura.io/v3/12847eba0a8e4f49980a9b456e837a7d"
        treasury_address = "0x71C74477ae190d7eeF762d01AC091D021a5AbAa6"
        
        try:
            web3 = Web3(Web3.HTTPProvider(rpc_url))
            balance_wei = web3.eth.get_balance(treasury_address)
            treasury_balance = float(web3.from_wei(balance_wei, 'ether'))
        except Exception as e:
            logger.warning(f"Could not fetch blockchain treasury balance: {str(e)}")
            treasury_balance = 0
        
        # System uptime (time since first grant was created in database)
        uptime_seconds = 0
        if all_grants:
            try:
                # Get timestamps and convert to datetime objects
                timestamps = []
                for g in all_grants:
                    if g.get('created_at'):
                        created_at = g['created_at']
                        # Handle both string and datetime objects
                        if isinstance(created_at, str):
                            timestamps.append(datetime.fromisoformat(created_at.replace('Z', '+00:00')))
                        else:
                            timestamps.append(created_at)
                
                if timestamps:
                    oldest_grant = min(timestamps)
                    now = datetime.now(oldest_grant.tzinfo) if oldest_grant.tzinfo else datetime.utcnow()
                    uptime_seconds = int((now - oldest_grant).total_seconds())
            except Exception as e:
                logger.warning(f"Could not calculate uptime: {str(e)}")
                uptime_seconds = 0
        
        return {
            "status": "healthy",
            "uptime_seconds": uptime_seconds,
            "total_grants": total_grants,
            "active_evaluations": active_evaluations,
            "pending_actions": pending_actions,
            "treasury_balance": f"{treasury_balance:.2f}",
            "active_agents": active_agents,
            "total_agents": 6,  # Fixed: 6 agent types
            "last_check": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        logger.error(f"Error fetching system health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch system health: {str(e)}"
        )


@router.get(
    "/agent-statuses",
    status_code=status.HTTP_200_OK,
    response_model=List[Dict[str, Any]]
)
async def get_agent_statuses():
    """
    Get status information for all agents
    """
    try:
        agent_types = [
            'intake',
            'technical',
            'impact',
            'due_diligence',
            'budget',
            'community'
        ]
        
        agent_statuses = []
        
        with get_db_cursor() as cursor:
            for agent_type in agent_types:
                # Get agent reputation/status from database
                cursor.execute("""
                    SELECT is_active, is_suspended
                    FROM agent_reputation
                    WHERE agent_name = %s
                """, (agent_type,))
                
                rep_result = cursor.fetchone()
                
                # Determine status based on database state
                if rep_result:
                    if rep_result['is_suspended']:
                        status = 'paused'
                    elif rep_result['is_active']:
                        status = 'active'
                    else:
                        status = 'paused'
                else:
                    status = 'active'  # Default if not in database
                
                # Get activity count for this agent from database
                cursor.execute("""
                    SELECT 
                        COUNT(*) as evaluations_count,
                        MAX(timestamp) as last_active,
                        AVG(CASE WHEN details->>'score' IS NOT NULL 
                            THEN (details->>'score')::float ELSE NULL END) as avg_score
                    FROM agent_activity_log
                    WHERE agent_name = %s
                """, (agent_type,))
                
                result = cursor.fetchone()
                
                evaluations_count = result['evaluations_count'] if result else 0
                last_active = result['last_active'].isoformat() + "Z" if result and result['last_active'] else datetime.utcnow().isoformat() + "Z"
                avg_score = float(result['avg_score']) if result and result['avg_score'] else 75.0
                
                # Get voting weight from agent_weights table
                cursor.execute("""
                    SELECT weight
                    FROM agent_weights
                    WHERE agent_name = %s
                """, (agent_type,))
                
                weight_result = cursor.fetchone()
                voting_weight = float(weight_result['weight']) if weight_result else 1.0
                
                agent_statuses.append({
                    "agent_id": f"agent-{agent_type}",
                    "agent_type": agent_type,
                    "status": status,
                    "voting_weight": voting_weight,
                    "last_active": last_active,
                    "evaluations_count": evaluations_count,
                    "average_score": round(avg_score, 2),
                    "wallet_address": f"0x{agent_type[:4].ljust(40, '0')}",
                    "is_registered": True
                })
        
        return agent_statuses
        
    except Exception as e:
        logger.error(f"Error fetching agent statuses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch agent statuses: {str(e)}"
        )


@router.get(
    "/treasury-info",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def get_treasury_info():
    """
    Get treasury balance and transaction information
    """
    try:
        from web3 import Web3
        
        # Connect to blockchain and get actual treasury balance
        rpc_url = "https://sepolia.infura.io/v3/12847eba0a8e4f49980a9b456e837a7d"
        treasury_address = "0x71C74477ae190d7eeF762d01AC091D021a5AbAa6"
        
        try:
            web3 = Web3(Web3.HTTPProvider(rpc_url))
            balance_wei = web3.eth.get_balance(treasury_address)
            blockchain_balance = web3.from_wei(balance_wei, 'ether')
        except Exception as e:
            print(f"Error fetching blockchain balance: {e}")
            blockchain_balance = 0
        
        # Get all grants
        all_grants = GrantsRepository.get_all()
        
        # Calculate total approved grants sum
        approved_grants = [g for g in all_grants if g.get('status') == 'approved']
        total_approved_grants = sum([float(g.get('requested_amount', 0)) for g in approved_grants])
        
        # Get active grants for pending transfers
        active_grants = [g for g in all_grants if g.get('status') == 'active']
        
        # Get pending milestone payments
        pending_transfers = []
        for grant in active_grants[:5]:  # Show top 5
            pending_transfers.append({
                "to": grant.get('applicant_address', 'N/A'),
                "amount": f"{float(grant.get('requested_amount', 0)):.2f}",
                "reason": f"Grant: {grant.get('title', 'Unknown')}",
                "scheduled_at": grant.get('updated_at', datetime.utcnow().isoformat() + "Z")
            })
        
        # Get recent completed grants as transactions
        completed_grants = [g for g in all_grants if g.get('status') == 'completed']
        recent_transactions = []
        for grant in completed_grants[:5]:  # Show last 5
            grant_id = str(grant.get('id', 'unknown'))
            recent_transactions.append({
                "tx_hash": f"0x{grant_id.replace('-', '')[:64].ljust(64, '0')}",
                "type": "grant_payment",
                "amount": f"{float(grant.get('requested_amount', 0)):.2f}",
                "timestamp": grant.get('updated_at', datetime.utcnow().isoformat() + "Z"),
                "status": "confirmed"
            })
        
        return {
            "blockchain_balance": f"{blockchain_balance:.2f}",
            "total_approved_grants": f"{total_approved_grants:.2f}",
            "pending_transfers": pending_transfers,
            "recent_transactions": recent_transactions
        }
        
    except Exception as e:
        logger.error(f"Error fetching treasury info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch treasury info: {str(e)}"
        )


@router.get(
    "/pending-actions",
    status_code=status.HTTP_200_OK,
    response_model=List[Dict[str, Any]]
)
async def get_pending_actions():
    """
    Get pending administrative actions
    """
    try:
        # Get grants awaiting admin approval (agent-approved, pending final admin decision)
        all_grants = GrantsRepository.get_all()
        under_review = [g for g in all_grants if g.get('status') == 'under_review']
        
        pending_actions = []
        
        for grant in under_review[:10]:  # Show top 10
            grant_id = str(grant.get('id', 'unknown'))
            created_at = grant.get('created_at', datetime.utcnow().isoformat())
            if isinstance(created_at, str):
                created_at_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            else:
                created_at_dt = created_at
            
            deadline = (created_at_dt + timedelta(days=7)).isoformat()
            if not deadline.endswith('Z'):
                deadline += "Z"
            
            pending_actions.append({
                "action_id": f"action-{grant_id}",
                "action_type": "grant_approval",
                "description": f"Review grant: {grant.get('title', 'Unknown Grant')}",
                "priority": "high" if float(grant.get('requested_amount', 0)) > 10000 else "medium",
                "requires_votes": 3,
                "current_votes": 2,  # Simplified - would need voting table
                "created_at": grant.get('created_at', datetime.utcnow().isoformat() + "Z"),
                "deadline": deadline,
                "proposed_by": grant.get('applicant_address', 'Unknown'),
                "metadata": {"grant_id": grant_id}
            })
        
        return pending_actions
        
    except Exception as e:
        logger.error(f"Error fetching pending actions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending actions: {str(e)}"
        )


@router.get(
    "/system-logs",
    status_code=status.HTTP_200_OK,
    response_model=List[Dict[str, Any]]
)
async def get_system_logs(
    level: str = None,
    source: str = None,
    limit: int = 20
):
    """
    Get system logs with optional filtering
    """
    try:
        system_logs = []
        
        with get_db_cursor() as cursor:
            # Get recent activities as logs
            cursor.execute("""
                SELECT 
                    id,
                    timestamp,
                    agent_name,
                    activity_type,
                    action,
                    details
                FROM agent_activity_log
                ORDER BY timestamp DESC
                LIMIT %s
            """, (limit * 2,))  # Get more to allow for filtering
            
            activities = cursor.fetchall()
        
        for activity in activities:
            # Determine log level based on activity
            log_level = "info"
            details = activity.get('details') or {}
            
            # Handle JSONB details field
            if isinstance(details, str):
                try:
                    details = json.loads(details)
                except:
                    details = {}
            
            if activity.get('action') == 'error':
                log_level = "error"
            elif details and details.get('score'):
                try:
                    score_val = float(details.get('score', 100))
                    if score_val < 50:
                        log_level = "warning"
                except (ValueError, TypeError):
                    pass
            
            # Filter by level if specified
            if level and log_level != level:
                continue
            
            # Filter by source (agent type) if specified
            if source and activity.get('agent_name') != source:
                continue
            
            # Build message
            message = activity.get('action', 'Activity recorded')
            if details and details.get('message'):
                message = details.get('message')
            elif activity.get('activity_type'):
                message = f"{activity.get('activity_type')} - {activity.get('action', 'activity')}"
            
            system_logs.append({
                "log_id": f"log-{activity.get('id', 'unknown')}",
                "timestamp": activity.get('timestamp').isoformat() + "Z" if activity.get('timestamp') else datetime.utcnow().isoformat() + "Z",
                "level": log_level,
                "source": activity.get('agent_name', 'system'),
                "message": message,
                "details": details if isinstance(details, dict) else {}
            })
            
            # Stop if we have enough logs after filtering
            if len(system_logs) >= limit:
                break
        
        return system_logs
        
    except Exception as e:
        logger.error(f"Error fetching system logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch system logs: {str(e)}"
        )


# ============================================================================
# AGENT MANAGEMENT ENDPOINTS
# ============================================================================

@router.post(
    "/agents/{agent_name}/status",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def update_agent_status(agent_name: str, status_update: AgentStatusUpdate):
    """
    Update agent active/suspended status
    """
    try:
        with get_db_cursor() as cursor:
            # Check if agent exists
            cursor.execute("""
                SELECT agent_name FROM agent_reputation 
                WHERE agent_name = %s
            """, (agent_name,))
            
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Agent '{agent_name}' not found"
                )
            
            # Update agent status
            cursor.execute("""
                UPDATE agent_reputation
                SET is_active = %s,
                    is_suspended = %s,
                    suspension_reason = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE agent_name = %s
            """, (
                status_update.is_active,
                status_update.is_suspended or False,
                status_update.suspension_reason,
                agent_name
            ))
            
            # Log the action
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                status_update.updated_by,
                'agent_status_changed',
                'agent',
                agent_name,
                json.dumps({
                    "is_active": status_update.is_active,
                    "is_suspended": status_update.is_suspended or False,
                    "suspension_reason": status_update.suspension_reason
                })
            ))
            
            # Get updated agent info
            cursor.execute("""
                SELECT agent_name, is_active, is_suspended, suspension_reason, 
                       total_evaluations, accuracy_score, last_active_at, updated_at
                FROM agent_reputation
                WHERE agent_name = %s
            """, (agent_name,))
            
            agent = cursor.fetchone()
            
            # Get agent weight
            cursor.execute("""
                SELECT weight FROM agent_weights
                WHERE agent_name = %s
            """, (agent_name,))
            
            weight_result = cursor.fetchone()
            weight = float(weight_result['weight']) if weight_result else 1.0
            
            return {
                "success": True,
                "message": f"Agent '{agent_name}' status updated successfully",
                "agent": {
                    "agent_name": agent['agent_name'],
                    "is_active": agent['is_active'],
                    "is_suspended": agent['is_suspended'],
                    "suspension_reason": agent['suspension_reason'],
                    "weight": weight,
                    "total_evaluations": agent['total_evaluations'],
                    "accuracy_score": float(agent['accuracy_score']),
                    "last_active_at": agent['last_active_at'].isoformat() + "Z" if agent['last_active_at'] else None,
                    "updated_at": agent['updated_at'].isoformat() + "Z" if agent['updated_at'] else None
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update agent status: {str(e)}"
        )


@router.put(
    "/agents/{agent_name}/weight",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def update_agent_weight(agent_name: str, weight_update: AgentWeightUpdate):
    """
    Update agent voting weight
    """
    try:
        with get_db_cursor() as cursor:
            # Check if agent exists
            cursor.execute("""
                SELECT agent_name FROM agent_reputation 
                WHERE agent_name = %s
            """, (agent_name,))
            
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Agent '{agent_name}' not found"
                )
            
            # Update or insert weight
            cursor.execute("""
                INSERT INTO agent_weights (agent_name, weight, updated_by, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (agent_name) 
                DO UPDATE SET 
                    weight = EXCLUDED.weight,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
            """, (agent_name, weight_update.weight, weight_update.updated_by))
            
            # Log the action
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                weight_update.updated_by,
                'agent_weight_updated',
                'agent',
                agent_name,
                json.dumps({
                    "new_weight": float(weight_update.weight),
                    "reason": weight_update.reason
                })
            ))
            
            return {
                "success": True,
                "message": f"Agent '{agent_name}' weight updated to {weight_update.weight}",
                "agent_name": agent_name,
                "new_weight": float(weight_update.weight),
                "updated_by": weight_update.updated_by,
                "reason": weight_update.reason
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent weight: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update agent weight: {str(e)}"
        )


@router.post(
    "/agents/register",
    status_code=status.HTTP_201_CREATED,
    response_model=Dict[str, Any]
)
async def register_agent(registration: AgentRegistration):
    """
    Register a new agent in the system
    """
    try:
        with get_db_cursor() as cursor:
            # Check if agent already exists
            cursor.execute("""
                SELECT agent_name FROM agent_reputation 
                WHERE agent_name = %s
            """, (registration.agent_name,))
            
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Agent '{registration.agent_name}' already exists"
                )
            
            # Insert agent into reputation table
            cursor.execute("""
                INSERT INTO agent_reputation (
                    agent_name, agent_address, is_active, joined_at
                ) VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            """, (registration.agent_name, registration.agent_address, True))
            
            # Insert agent weight
            cursor.execute("""
                INSERT INTO agent_weights (
                    agent_name, weight, description, updated_by
                ) VALUES (%s, %s, %s, %s)
            """, (
                registration.agent_name,
                registration.weight,
                registration.description,
                registration.registered_by
            ))
            
            # Log the action
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                registration.registered_by,
                'agent_registered',
                'agent',
                registration.agent_name,
                json.dumps({
                    "agent_name": registration.agent_name,
                    "agent_address": registration.agent_address,
                    "weight": float(registration.weight),
                    "description": registration.description
                })
            ))
            
            return {
                "success": True,
                "message": f"Agent '{registration.agent_name}' registered successfully",
                "agent": {
                    "agent_name": registration.agent_name,
                    "agent_address": registration.agent_address,
                    "weight": float(registration.weight),
                    "description": registration.description,
                    "is_active": True,
                    "registered_by": registration.registered_by,
                    "registered_at": datetime.utcnow().isoformat() + "Z"
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering agent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register agent: {str(e)}"
        )


# ============================================================================
# GRANT ACTION ENDPOINTS
# ============================================================================

@router.post(
    "/pending-actions/{action_id}/approve",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def approve_grant_action(action_id: str, request: GrantActionRequest):
    """
    Approve a pending grant (move from under_review to approved)
    """
    try:
        # Extract grant_id from action_id (format: "action-{grant_id}")
        grant_id = action_id.replace("action-", "")
        
        # Get the grant
        grants = GrantsRepository.get_all()
        grant = None
        for g in grants:
            if str(g.get('id')) == grant_id or str(g.get('grant_id')) == grant_id:
                grant = g
                break
        
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Grant not found for action '{action_id}'"
            )
        
        # Update grant status to approved
        with get_db_cursor() as cursor:
            # Get the actual database grant_id (UUID)
            actual_grant_id = grant.get('grant_id') or grant.get('id')
            
            cursor.execute("""
                UPDATE grants
                SET status = 'approved',
                    updated_at = CURRENT_TIMESTAMP
                WHERE grant_id = %s OR id = %s
            """, (actual_grant_id, grant_id))
            
            # Create milestones from detailed_proposal if they exist
            try:
                metadata = grant.get('metadata', {})
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)
                
                detailed_proposal = metadata.get('detailed_proposal')
                if detailed_proposal:
                    if isinstance(detailed_proposal, str):
                        detailed_proposal = json.loads(detailed_proposal)
                    
                    milestones_data = detailed_proposal.get('milestones', [])
                    if milestones_data and len(milestones_data) > 0:
                        from repositories.milestone_repository import MilestonesRepository
                        milestones_repo = MilestonesRepository()
                        
                        # Use current time as project start date (approval date)
                        project_start_date = datetime.now()
                        requested_amount = float(grant.get('requested_amount', 0))
                        milestone_records = []
                        
                        for idx, m in enumerate(milestones_data):
                            funding_percentage = float(m.get('fundingPercentage', 0))
                            amount = (requested_amount * funding_percentage) / 100
                            duration_weeks = int(m.get('duration', 4))
                            
                            # Calculate estimated completion date based on cumulative weeks from project start
                            cumulative_weeks = sum(int(milestones_data[i].get('duration', 4)) for i in range(idx + 1))
                            estimated_date = project_start_date + timedelta(weeks=cumulative_weeks)
                            
                            # Handle deliverables - split by actual newlines or \\n
                            deliverables_raw = m.get('deliverables', '')
                            if isinstance(deliverables_raw, str):
                                # Split by \\n first, then by \n, and filter empty strings
                                deliverables = [d.strip() for d in deliverables_raw.replace('\\n', '\n').split('\n') if d.strip()]
                            else:
                                deliverables = deliverables_raw if deliverables_raw else []
                            
                            milestone_records.append({
                                'milestone_number': idx + 1,
                                'title': m.get('title', f'Milestone {idx + 1}'),
                                'description': m.get('description', ''),
                                'deliverables': deliverables,
                                'amount': str(amount),
                                'currency': 'ETH',
                                'estimated_completion_date': estimated_date.strftime('%Y-%m-%d'),
                                'status': 'in_progress' if idx == 0 else 'pending'  # First milestone is in_progress
                            })
                        
                        # Create milestones
                        created_milestones = milestones_repo.create_batch(
                            uuid.UUID(str(actual_grant_id)),
                            milestone_records
                        )
                        
                        # Update grant with milestone info
                        cursor.execute("""
                            UPDATE grants 
                            SET has_milestones = TRUE,
                                total_milestones = %s,
                                current_milestone = 1,
                                milestones_payment_model = 'sequential'
                            WHERE grant_id = %s
                        """, (len(milestone_records), str(actual_grant_id)))
                        
                        logger.info(f"Created {len(created_milestones)} milestones for approved grant {actual_grant_id}")
            except Exception as e:
                logger.error(f"Error creating milestones for grant {actual_grant_id}: {e}", exc_info=True)
                # Don't fail the approval if milestone creation fails
            
            # Activate the first milestone if it exists (legacy support or if created separately)
            cursor.execute("""
                UPDATE milestones
                SET status = 'in_progress',
                    updated_at = CURRENT_TIMESTAMP
                WHERE grant_id = %s
                AND milestone_number = 1
                AND status = 'pending'
            """, (actual_grant_id,))
            
            # Log the action
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                request.admin_user,
                'grant_approved',
                'grant',
                str(actual_grant_id),
                json.dumps({
                    "grant_title": grant.get('title'),
                    "requested_amount": str(grant.get('requested_amount')),
                    "decision_notes": request.decision_notes,
                    "send_notification": request.send_notification
                })
            ))
            
            # Log activity
            cursor.execute("""
                INSERT INTO agent_activity_log (
                    agent_name, grant_id, activity_type, action, details, success
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                'admin',
                actual_grant_id,
                'grant_updated',
                'Grant approved by admin',
                json.dumps({
                    "admin_user": request.admin_user,
                    "decision_notes": request.decision_notes
                }),
                True
            ))
        
        logger.info(f"Grant '{grant.get('title')}' approved by {request.admin_user}")
        
        return {
            "success": True,
            "message": f"Grant '{grant.get('title')}' approved successfully",
            "action_id": action_id,
            "grant_id": str(actual_grant_id),
            "grant_title": grant.get('title'),
            "status": "approved",
            "approved_by": request.admin_user,
            "approved_at": datetime.utcnow().isoformat() + "Z",
            "notification_sent": request.send_notification
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving grant action: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve grant: {str(e)}"
        )


@router.post(
    "/pending-actions/{action_id}/reject",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def reject_grant_action(action_id: str, request: GrantActionRequest):
    """
    Reject a pending grant (move from under_review to rejected)
    """
    try:
        # Extract grant_id from action_id
        grant_id = action_id.replace("action-", "")
        
        # Get the grant
        grants = GrantsRepository.get_all()
        grant = None
        for g in grants:
            if str(g.get('id')) == grant_id or str(g.get('grant_id')) == grant_id:
                grant = g
                break
        
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Grant not found for action '{action_id}'"
            )
        
        # Update grant status to rejected
        with get_db_cursor() as cursor:
            actual_grant_id = grant.get('grant_id') or grant.get('id')
            
            cursor.execute("""
                UPDATE grants
                SET status = 'rejected',
                    updated_at = CURRENT_TIMESTAMP
                WHERE grant_id = %s OR id = %s
            """, (actual_grant_id, grant_id))
            
            # Log the action
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                request.admin_user,
                'grant_rejected',
                'grant',
                str(actual_grant_id),
                json.dumps({
                    "grant_title": grant.get('title'),
                    "requested_amount": str(grant.get('requested_amount')),
                    "decision_notes": request.decision_notes,
                    "send_notification": request.send_notification
                })
            ))
            
            # Log activity
            cursor.execute("""
                INSERT INTO agent_activity_log (
                    agent_name, grant_id, activity_type, action, details, success
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                'admin',
                actual_grant_id,
                'grant_updated',
                'Grant rejected by admin',
                json.dumps({
                    "admin_user": request.admin_user,
                    "decision_notes": request.decision_notes
                }),
                True
            ))
        
        logger.info(f"Grant '{grant.get('title')}' rejected by {request.admin_user}")
        
        return {
            "success": True,
            "message": f"Grant '{grant.get('title')}' rejected",
            "action_id": action_id,
            "grant_id": str(actual_grant_id),
            "grant_title": grant.get('title'),
            "status": "rejected",
            "rejected_by": request.admin_user,
            "rejected_at": datetime.utcnow().isoformat() + "Z",
            "notification_sent": request.send_notification
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting grant action: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject grant: {str(e)}"
        )


# ============================================================================
# SYSTEM CONTROL ENDPOINTS
# ============================================================================

@router.post(
    "/system/pause",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def pause_system(request: SystemPauseRequest):
    """
    Pause or resume the entire system
    """
    try:
        with get_db_cursor() as cursor:
            # Update system config
            cursor.execute("""
                INSERT INTO system_config (config_key, config_value, value_type, updated_by)
                VALUES ('system_paused', %s, 'boolean', %s)
                ON CONFLICT (config_key) 
                DO UPDATE SET 
                    config_value = EXCLUDED.config_value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
            """, (str(request.paused).lower(), request.admin_user))
            
            cursor.execute("""
                INSERT INTO system_config (config_key, config_value, value_type, updated_by)
                VALUES ('pause_reason', %s, 'string', %s)
                ON CONFLICT (config_key) 
                DO UPDATE SET 
                    config_value = EXCLUDED.config_value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
            """, (request.reason, request.admin_user))
            
            # Log the action
            action_type = 'system_paused' if request.paused else 'system_resumed'
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                request.admin_user,
                action_type,
                'system',
                'global',
                json.dumps({
                    "paused": request.paused,
                    "reason": request.reason
                })
            ))
            
            # Log activity
            cursor.execute("""
                INSERT INTO agent_activity_log (
                    agent_name, activity_type, action, details, success
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                'admin',
                action_type,
                f"System {'paused' if request.paused else 'resumed'} by {request.admin_user}",
                json.dumps({"reason": request.reason}),
                True
            ))
        
        status_msg = "paused" if request.paused else "resumed"
        logger.warning(f"System {status_msg} by {request.admin_user}: {request.reason}")
        
        return {
            "success": True,
            "message": f"System {status_msg} successfully",
            "system_paused": request.paused,
            "reason": request.reason,
            "updated_by": request.admin_user,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        
    except Exception as e:
        logger.error(f"Error updating system pause status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update system pause status: {str(e)}"
        )


@router.post(
    "/system/emergency-stop",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def emergency_stop(request: EmergencyStopRequest):
    """
    Activate emergency stop - halts all system operations
    """
    try:
        with get_db_cursor() as cursor:
            timestamp = datetime.utcnow().isoformat() + "Z"
            
            # Update emergency stop config
            cursor.execute("""
                INSERT INTO system_config (config_key, config_value, value_type, updated_by)
                VALUES ('emergency_stop', 'true', 'boolean', %s)
                ON CONFLICT (config_key) 
                DO UPDATE SET 
                    config_value = 'true',
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
            """, (request.admin_user,))
            
            cursor.execute("""
                INSERT INTO system_config (config_key, config_value, value_type, updated_by)
                VALUES ('emergency_stop_reason', %s, 'string', %s)
                ON CONFLICT (config_key) 
                DO UPDATE SET 
                    config_value = EXCLUDED.config_value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
            """, (request.stop_reason, request.admin_user))
            
            cursor.execute("""
                INSERT INTO system_config (config_key, config_value, value_type, updated_by)
                VALUES ('emergency_stop_timestamp', %s, 'string', %s)
                ON CONFLICT (config_key) 
                DO UPDATE SET 
                    config_value = EXCLUDED.config_value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
            """, (timestamp, request.admin_user))
            
            # Log the action
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                request.admin_user,
                'emergency_stop_activated',
                'system',
                'global',
                json.dumps({
                    "stop_reason": request.stop_reason,
                    "notify_all": request.notify_all
                })
            ))
            
            # Log critical activity
            cursor.execute("""
                INSERT INTO agent_activity_log (
                    agent_name, activity_type, action, details, success
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                'admin',
                'emergency_stop_activated',
                f"EMERGENCY STOP activated by {request.admin_user}",
                json.dumps({
                    "reason": request.stop_reason,
                    "notify_all": request.notify_all
                }),
                True
            ))
        
        logger.critical(f"EMERGENCY STOP activated by {request.admin_user}: {request.stop_reason}")
        
        return {
            "success": True,
            "message": "Emergency stop activated - all operations halted",
            "emergency_stop": True,
            "stop_reason": request.stop_reason,
            "activated_by": request.admin_user,
            "activated_at": timestamp,
            "notify_all": request.notify_all,
            "warning": "System is now in emergency stop mode. All grant operations are suspended."
        }
        
    except Exception as e:
        logger.error(f"Error activating emergency stop: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate emergency stop: {str(e)}"
        )


@router.delete(
    "/system/emergency-stop",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def deactivate_emergency_stop(admin_user: str):
    """
    Deactivate emergency stop and resume normal operations
    """
    try:
        with get_db_cursor() as cursor:
            # Check if emergency stop is active
            cursor.execute("""
                SELECT config_value FROM system_config 
                WHERE config_key = 'emergency_stop'
            """)
            result = cursor.fetchone()
            
            if not result or result['config_value'] != 'true':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Emergency stop is not currently active"
                )
            
            # Deactivate emergency stop
            cursor.execute("""
                UPDATE system_config
                SET config_value = 'false',
                    updated_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE config_key = 'emergency_stop'
            """, (admin_user,))
            
            cursor.execute("""
                UPDATE system_config
                SET config_value = '',
                    updated_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE config_key = 'emergency_stop_reason'
            """, (admin_user,))
            
            # Log the action
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                admin_user,
                'emergency_stop_deactivated',
                'system',
                'global',
                json.dumps({"deactivated_by": admin_user})
            ))
            
            # Log activity
            cursor.execute("""
                INSERT INTO agent_activity_log (
                    agent_name, activity_type, action, details, success
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                'admin',
                'emergency_stop_deactivated',
                f"Emergency stop deactivated by {admin_user}",
                json.dumps({"admin_user": admin_user}),
                True
            ))
        
        logger.warning(f"Emergency stop deactivated by {admin_user}")
        
        return {
            "success": True,
            "message": "Emergency stop deactivated - system operations resumed",
            "emergency_stop": False,
            "deactivated_by": admin_user,
            "deactivated_at": datetime.utcnow().isoformat() + "Z"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating emergency stop: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate emergency stop: {str(e)}"
        )


@router.get(
    "/system/status",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def get_system_status():
    """
    Get current system status (paused, emergency stop, etc.)
    """
    try:
        with get_db_cursor() as cursor:
            # Get all system config
            cursor.execute("""
                SELECT config_key, config_value, updated_by, updated_at
                FROM system_config
                WHERE config_key IN (
                    'system_paused', 'pause_reason',
                    'emergency_stop', 'emergency_stop_reason', 'emergency_stop_timestamp'
                )
            """)
            
            configs = cursor.fetchall()
            config_dict = {c['config_key']: c for c in configs}
            
            system_paused = config_dict.get('system_paused', {}).get('config_value', 'false') == 'true'
            pause_reason = config_dict.get('pause_reason', {}).get('config_value', '')
            emergency_stop = config_dict.get('emergency_stop', {}).get('config_value', 'false') == 'true'
            emergency_stop_reason = config_dict.get('emergency_stop_reason', {}).get('config_value', '')
            emergency_stop_timestamp = config_dict.get('emergency_stop_timestamp', {}).get('config_value', '')
            
            # Get last update info
            last_updated = None
            updated_by = None
            for config in configs:
                if config.get('updated_at'):
                    if not last_updated or config['updated_at'] > last_updated:
                        last_updated = config['updated_at']
                        updated_by = config.get('updated_by')
        
        return {
            "system_paused": system_paused,
            "pause_reason": pause_reason,
            "emergency_stop": emergency_stop,
            "emergency_stop_reason": emergency_stop_reason,
            "emergency_stop_timestamp": emergency_stop_timestamp,
            "operational": not (system_paused or emergency_stop),
            "last_updated": last_updated.isoformat() + "Z" if last_updated else None,
            "updated_by": updated_by
        }
        
    except Exception as e:
        logger.error(f"Error fetching system status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch system status: {str(e)}"
        )


@router.post(
    "/system/emergency-withdrawal",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def emergency_withdrawal(request: EmergencyWithdrawalRequest):
    """
    Create emergency withdrawal request requiring multi-sig approval
    Requires 2 admin approvals before execution
    """
    try:
        from web3 import Web3
        
        # Treasury contract details
        treasury_address = "0x71C74477ae190d7eeF762d01AC091D021a5AbAa6"
        rpc_url = "https://sepolia.infura.io/v3/12847eba0a8e4f49980a9b456e837a7d"
        
        # Initialize Web3
        web3 = Web3(Web3.HTTPProvider(rpc_url))
        if not web3.is_connected():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to connect to Ethereum network"
            )
        
        # Validate recipient address
        if not web3.is_address(request.recipient_address):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid recipient address"
            )
        
        recipient = web3.to_checksum_address(request.recipient_address)
        
        # Convert amount to Wei
        try:
            amount_wei = web3.to_wei(float(request.amount_eth), 'ether')
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid amount format"
            )
        
        if amount_wei <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than zero"
            )
        
        # Check treasury balance
        treasury_balance = web3.eth.get_balance(treasury_address)
        if amount_wei > treasury_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient treasury balance. Available: {web3.from_wei(treasury_balance, 'ether')} ETH"
            )
        
        # Create withdrawal request in database
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO emergency_withdrawal_requests (
                    recipient_address, amount_wei, amount_eth, reason, 
                    status, required_approvals, current_approvals, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, request_id
            """, (
                recipient,
                str(amount_wei),
                request.amount_eth,
                request.reason,
                'pending',
                2,  # Require 2 approvals
                0,
                request.admin_user
            ))
            
            result = cursor.fetchone()
            withdrawal_id = result['id']
            request_id = result['request_id']
            
            # Log action
            cursor.execute("""
                INSERT INTO admin_action_log (
                    admin_user, action_type, target_type, target_id, action_details
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                request.admin_user,
                'emergency_withdrawal_requested',
                'treasury',
                str(request_id),
                json.dumps({
                    "recipient": recipient,
                    "amount_eth": request.amount_eth,
                    "amount_wei": str(amount_wei),
                    "reason": request.reason,
                    "withdrawal_id": withdrawal_id
                })
            ))
        
        logger.warning(
            f"Emergency withdrawal requested: {request.amount_eth} ETH to {recipient} | "
            f"Request ID: {request_id} | Requires 2 approvals"
        )
        
        return {
            "success": True,
            "message": "Emergency withdrawal request created. Requires 2 admin approvals.",
            "withdrawal_id": withdrawal_id,
            "request_id": str(request_id),
            "recipient": recipient,
            "amount_eth": request.amount_eth,
            "amount_wei": str(amount_wei),
            "status": "pending",
            "required_approvals": 2,
            "current_approvals": 0,
            "created_by": request.admin_user,
            "warning": "This request requires approval from 2 different admins before execution."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating emergency withdrawal request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create emergency withdrawal request: {str(e)}"
        )


@router.get(
    "/system/emergency-withdrawal/pending",
    status_code=status.HTTP_200_OK,
    response_model=List[Dict[str, Any]]
)
async def get_pending_withdrawals():
    """Get all pending emergency withdrawal requests"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id,
                    request_id,
                    recipient_address,
                    amount_eth,
                    amount_wei,
                    reason,
                    status,
                    required_approvals,
                    current_approvals,
                    created_by,
                    created_at
                FROM emergency_withdrawal_requests
                WHERE status = 'pending'
                ORDER BY created_at DESC
            """)
            
            requests = cursor.fetchall()
            
            # Get approvals for each request
            for req in requests:
                cursor.execute("""
                    SELECT admin_user, approved, comment, created_at
                    FROM emergency_withdrawal_approvals
                    WHERE withdrawal_request_id = %s
                    ORDER BY created_at DESC
                """, (req['id'],))
                
                req['approvals'] = cursor.fetchall()
                req['created_at'] = req['created_at'].isoformat() + "Z" if req['created_at'] else None
                req['request_id'] = str(req['request_id'])
                
                # Format approval timestamps
                for approval in req['approvals']:
                    approval['created_at'] = approval['created_at'].isoformat() + "Z" if approval['created_at'] else None
        
        return requests
        
    except Exception as e:
        logger.error(f"Error fetching pending withdrawals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending withdrawals: {str(e)}"
        )


@router.post(
    "/system/emergency-withdrawal/approve",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def approve_withdrawal(approval: EmergencyWithdrawalApproval):
    """
    Approve or reject an emergency withdrawal request
    When 2 approvals are reached, automatically execute the withdrawal
    """
    try:
        with get_db_cursor() as cursor:
            # Get request details
            cursor.execute("""
                SELECT * FROM emergency_withdrawal_requests
                WHERE id = %s AND status = 'pending'
            """, (approval.withdrawal_id,))
            
            request_data = cursor.fetchone()
            
            if not request_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Withdrawal request not found or already processed"
                )
            
            # Check if this admin already approved/rejected
            cursor.execute("""
                SELECT id FROM emergency_withdrawal_approvals
                WHERE withdrawal_request_id = %s AND admin_user = %s
            """, (approval.withdrawal_id, approval.admin_user))
            
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You have already voted on this request"
                )
            
            # Check if admin is the creator
            if request_data['created_by'] == approval.admin_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Request creator cannot approve their own request"
                )
            
            # Record approval/rejection
            cursor.execute("""
                INSERT INTO emergency_withdrawal_approvals (
                    withdrawal_request_id, admin_user, approved, comment
                ) VALUES (%s, %s, %s, %s)
            """, (
                approval.withdrawal_id,
                approval.admin_user,
                approval.approved,
                approval.comment
            ))
            
            if approval.approved:
                # Increment approval count
                cursor.execute("""
                    UPDATE emergency_withdrawal_requests
                    SET current_approvals = current_approvals + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING current_approvals, required_approvals
                """, (approval.withdrawal_id,))
                
                result = cursor.fetchone()
                current_approvals = result['current_approvals']
                required_approvals = result['required_approvals']
                
                # Log approval
                cursor.execute("""
                    INSERT INTO admin_action_log (
                        admin_user, action_type, target_type, target_id, action_details
                    ) VALUES (%s, %s, %s, %s, %s)
                """, (
                    approval.admin_user,
                    'emergency_withdrawal_approved',
                    'withdrawal_request',
                    str(request_data['request_id']),
                    json.dumps({
                        "withdrawal_id": approval.withdrawal_id,
                        "comment": approval.comment,
                        "current_approvals": current_approvals,
                        "required_approvals": required_approvals
                    })
                ))
                
                # Check if we have enough approvals to execute
                if current_approvals >= required_approvals:
                    # Execute the withdrawal
                    tx_hash = await execute_withdrawal(request_data)
                    
                    return {
                        "success": True,
                        "message": f"Request approved and executed! Transaction hash: {tx_hash}",
                        "withdrawal_id": approval.withdrawal_id,
                        "status": "executed",
                        "current_approvals": current_approvals,
                        "transaction_hash": tx_hash,
                        "explorer_url": f"https://sepolia.etherscan.io/tx/{tx_hash}"
                    }
                else:
                    return {
                        "success": True,
                        "message": f"Request approved. {required_approvals - current_approvals} more approval(s) needed.",
                        "withdrawal_id": approval.withdrawal_id,
                        "status": "pending",
                        "current_approvals": current_approvals,
                        "required_approvals": required_approvals
                    }
            else:
                # Rejection - mark request as rejected
                cursor.execute("""
                    UPDATE emergency_withdrawal_requests
                    SET status = 'rejected',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (approval.withdrawal_id,))
                
                # Log rejection
                cursor.execute("""
                    INSERT INTO admin_action_log (
                        admin_user, action_type, target_type, target_id, action_details
                    ) VALUES (%s, %s, %s, %s, %s)
                """, (
                    approval.admin_user,
                    'emergency_withdrawal_rejected',
                    'withdrawal_request',
                    str(request_data['request_id']),
                    json.dumps({
                        "withdrawal_id": approval.withdrawal_id,
                        "comment": approval.comment
                    })
                ))
                
                return {
                    "success": True,
                    "message": "Request rejected",
                    "withdrawal_id": approval.withdrawal_id,
                    "status": "rejected"
                }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing withdrawal approval: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process withdrawal approval: {str(e)}"
        )


async def execute_withdrawal(request_data: Dict[str, Any]) -> str:
    """Execute an approved emergency withdrawal on the blockchain"""
    from web3 import Web3
    from eth_account import Account
    import os
    
    treasury_address = "0x71C74477ae190d7eeF762d01AC091D021a5AbAa6"
    rpc_url = "https://sepolia.infura.io/v3/12847eba0a8e4f49980a9b456e837a7d"
    private_key = os.getenv("PRIVATE_KEY")
    
    if not private_key:
        raise Exception("Private key not configured")
    
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    
    # Load contract ABI
    contract_abi = [{
        "inputs": [
            {"internalType": "address payable", "name": "_recipient", "type": "address"},
            {"internalType": "uint256", "name": "_amount", "type": "uint256"}
        ],
        "name": "emergencyWithdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }]
    
    contract = web3.eth.contract(
        address=web3.to_checksum_address(treasury_address),
        abi=contract_abi
    )
    
    account = Account.from_key(private_key)
    nonce = web3.eth.get_transaction_count(account.address)
    
    recipient = web3.to_checksum_address(request_data['recipient_address'])
    amount_wei = int(request_data['amount_wei'])
    
    tx = contract.functions.emergencyWithdraw(
        recipient,
        amount_wei
    ).build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gas': 100000,
        'gasPrice': web3.eth.gas_price,
        'chainId': 11155111
    })
    
    signed_tx = web3.eth.account.sign_transaction(tx, private_key)
    tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
    tx_hash_hex = tx_hash.hex()
    
    # Update database
    with get_db_cursor() as cursor:
        cursor.execute("""
            UPDATE emergency_withdrawal_requests
            SET status = 'executed',
                transaction_hash = %s,
                executed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (tx_hash_hex, request_data['id']))
        
        # Log execution
        cursor.execute("""
            INSERT INTO admin_action_log (
                admin_user, action_type, target_type, target_id, action_details
            ) VALUES (%s, %s, %s, %s, %s)
        """, (
            'system',
            'emergency_withdrawal_executed',
            'treasury',
            str(request_data['request_id']),
            json.dumps({
                "withdrawal_id": request_data['id'],
                "recipient": recipient,
                "amount_eth": request_data['amount_eth'],
                "tx_hash": tx_hash_hex,
                "tx_url": f"https://sepolia.etherscan.io/tx/{tx_hash_hex}"
            })
        ))
        
        cursor.execute("""
            INSERT INTO agent_activity_log (
                agent_name, activity_type, action, details, success
            ) VALUES (%s, %s, %s, %s, %s)
        """, (
            'admin',
            'emergency_withdrawal',
            f"Emergency withdrawal executed (multi-sig approved)",
            json.dumps({
                "recipient": recipient,
                "amount_eth": request_data['amount_eth'],
                "tx_hash": tx_hash_hex
            }),
            True
        ))
    
    logger.critical(f"Emergency withdrawal executed: {request_data['amount_eth']} ETH | TX: {tx_hash_hex}")
    
    return tx_hash_hex




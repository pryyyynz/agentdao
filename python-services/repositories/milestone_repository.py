"""
Milestones Repository - CRUD operations for milestones table
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import uuid
import json

from utils.database import get_db_cursor, execute_query, execute_insert, execute_update


class MilestonesRepository:
    """Repository for milestones table operations"""
    
    @staticmethod
    def create(
        grant_id: uuid.UUID,
        milestone_number: int,
        title: str,
        description: str,
        deliverables: List[str],
        amount: Decimal,
        currency: str = 'ETH',
        estimated_completion_date: Optional[datetime] = None,
        status: str = 'pending'
    ) -> Dict[str, Any]:
        """
        Create a new milestone
        
        Args:
            grant_id: UUID of parent grant
            milestone_number: Sequential number (1, 2, 3, ...)
            title: Milestone title
            description: Detailed description
            deliverables: List of deliverable descriptions
            amount: Payment amount for this milestone
            currency: Currency (default: ETH)
            estimated_completion_date: Target completion date
            status: Initial status (default: pending)
        
        Returns:
            Created milestone record as dict
        """
        query = """
            INSERT INTO milestones (
                grant_id, milestone_number, title, description, deliverables,
                amount, currency, estimated_completion_date, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        
        params = (
            str(grant_id), milestone_number, title, description, deliverables,
            amount, currency, estimated_completion_date, status
        )
        
        return execute_insert(query, params)
    
    @staticmethod
    def create_batch(grant_id: uuid.UUID, milestones: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Create multiple milestones for a grant
        
        Args:
            grant_id: UUID of parent grant
            milestones: List of milestone data dicts
        
        Returns:
            List of created milestone records
        """
        created_milestones = []
        
        with get_db_cursor() as cur:
            for milestone_data in milestones:
                query = """
                    INSERT INTO milestones (
                        grant_id, milestone_number, title, description, deliverables,
                        amount, currency, estimated_completion_date, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """
                
                params = (
                    str(grant_id),
                    milestone_data['milestone_number'],
                    milestone_data['title'],
                    milestone_data['description'],
                    milestone_data.get('deliverables', []),
                    milestone_data['amount'],
                    milestone_data.get('currency', 'ETH'),
                    milestone_data.get('estimated_completion_date'),
                    milestone_data.get('status', 'pending')
                )
                
                cur.execute(query, params)
                created_milestones.append(dict(cur.fetchone()))
            
            cur.connection.commit()
        
        return created_milestones
    
    @staticmethod
    def get_by_id(milestone_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get milestone by UUID"""
        query = "SELECT * FROM milestones WHERE milestone_id = %s"
        return execute_query(query, (str(milestone_id),), fetch='one')
    
    @staticmethod
    def get_by_grant(
        grant_id: uuid.UUID,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all milestones for a grant
        
        Args:
            grant_id: UUID of parent grant
            status: Optional status filter
        
        Returns:
            List of milestone records
        """
        if status:
            query = """
                SELECT * FROM milestones 
                WHERE grant_id = %s AND status = %s
                ORDER BY milestone_number ASC
            """
            params = (str(grant_id), status)
        else:
            query = """
                SELECT * FROM milestones 
                WHERE grant_id = %s
                ORDER BY milestone_number ASC
            """
            params = (str(grant_id),)
        
        return execute_query(query, params, fetch='all')
    
    @staticmethod
    def get_current_milestone(grant_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get the current in_progress milestone for a grant"""
        query = """
            SELECT * FROM milestones 
            WHERE grant_id = %s AND status = 'in_progress'
            ORDER BY milestone_number ASC
            LIMIT 1
        """
        return execute_query(query, (str(grant_id),), fetch='one')
    
    @staticmethod
    def update_status(
        milestone_id: uuid.UUID,
        status: str,
        reviewed_by: Optional[str] = None,
        reviewer_feedback: Optional[str] = None,
        review_score: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Update milestone status
        
        Args:
            milestone_id: UUID of milestone
            status: New status
            reviewed_by: Name of reviewer (optional)
            reviewer_feedback: Review feedback (optional)
            review_score: Review score (optional)
        
        Returns:
            Updated milestone record
        """
        query = """
            UPDATE milestones 
            SET status = %s,
                reviewed_by = COALESCE(%s, reviewed_by),
                reviewer_feedback = COALESCE(%s, reviewer_feedback),
                review_score = COALESCE(%s, review_score),
                reviewed_at = CASE WHEN %s IN ('approved', 'rejected', 'revision_requested') 
                             THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
                actual_completion_date = CASE WHEN %s = 'approved' 
                                         THEN CURRENT_TIMESTAMP ELSE actual_completion_date END,
                updated_at = CURRENT_TIMESTAMP
            WHERE milestone_id = %s
            RETURNING *
        """
        
        params = (status, reviewed_by, reviewer_feedback, review_score, 
                 status, status, str(milestone_id))
        
        return execute_query(query, params, fetch='one')
    
    @staticmethod
    def submit_milestone(
        milestone_id: uuid.UUID,
        proof_of_work_url: str,
        submission_notes: str,
        proof_of_work_ipfs: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submit milestone for review
        
        Args:
            milestone_id: UUID of milestone
            proof_of_work_url: URL to proof of work
            submission_notes: Notes about completion
            proof_of_work_ipfs: Optional IPFS hash
        
        Returns:
            Updated milestone record
        """
        query = """
            UPDATE milestones 
            SET status = 'submitted',
                proof_of_work_url = %s,
                submission_notes = %s,
                proof_of_work_ipfs = %s,
                submitted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                admin_reviewed = FALSE,
                admin_decision_id = NULL
            WHERE milestone_id = %s
            RETURNING *
        """
        
        params = (proof_of_work_url, submission_notes, proof_of_work_ipfs, str(milestone_id))
        
        return execute_query(query, params, fetch='one')
    
    @staticmethod
    def release_payment(
        milestone_id: uuid.UUID,
        payment_tx_hash: str,
        on_chain_milestone_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Record payment release for milestone
        
        Args:
            milestone_id: UUID of milestone
            payment_tx_hash: Blockchain transaction hash
            on_chain_milestone_id: On-chain milestone ID (optional)
        
        Returns:
            Updated milestone record
        """
        query = """
            UPDATE milestones 
            SET payment_tx_hash = %s,
                payment_released_at = CURRENT_TIMESTAMP,
                on_chain_milestone_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE milestone_id = %s
            RETURNING *
        """
        
        params = (payment_tx_hash, on_chain_milestone_id, str(milestone_id))
        
        return execute_query(query, params, fetch='one')
    
    @staticmethod
    def update(
        milestone_id: uuid.UUID,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Update milestone fields
        
        Args:
            milestone_id: UUID of milestone
            **kwargs: Fields to update
        
        Returns:
            Updated milestone record
        """
        # Build dynamic UPDATE query
        allowed_fields = [
            'title', 'description', 'deliverables', 'amount', 
            'estimated_completion_date', 'metadata'
        ]
        
        update_fields = []
        params = []
        
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)
        
        if not update_fields:
            # Nothing to update
            return MilestonesRepository.get_by_id(milestone_id)
        
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(str(milestone_id))
        
        query = f"""
            UPDATE milestones 
            SET {', '.join(update_fields)}
            WHERE milestone_id = %s
            RETURNING *
        """
        
        return execute_query(query, tuple(params), fetch='one')
    
    @staticmethod
    def get_progress_summary(grant_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get milestone progress summary for a grant
        
        Args:
            grant_id: UUID of parent grant
        
        Returns:
            Progress summary dict
        """
        query = """
            SELECT 
                COUNT(*) as total_milestones,
                COUNT(*) FILTER (WHERE status = 'approved') as completed_milestones,
                COUNT(*) FILTER (WHERE status = 'in_progress') as active_milestones,
                COUNT(*) FILTER (WHERE status = 'submitted') as submitted_milestones,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_milestones,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as paid_amount,
                COALESCE(
                    ROUND(
                        (COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL / 
                         NULLIF(COUNT(*), 0) * 100), 
                        2
                    ), 
                    0
                ) as completion_percentage
            FROM milestones
            WHERE grant_id = %s
        """
        
        result = execute_query(query, (str(grant_id),), fetch='one')
        
        if result:
            return {
                'total_milestones': result.get('total_milestones', 0),
                'completed_milestones': result.get('completed_milestones', 0),
                'active_milestones': result.get('active_milestones', 0),
                'submitted_milestones': result.get('submitted_milestones', 0),
                'pending_milestones': result.get('pending_milestones', 0),
                'total_amount': result.get('total_amount', Decimal('0')),
                'paid_amount': result.get('paid_amount', Decimal('0')),
                'completion_percentage': result.get('completion_percentage', Decimal('0'))
            }
        
        return {
            'total_milestones': 0,
            'completed_milestones': 0,
            'active_milestones': 0,
            'submitted_milestones': 0,
            'pending_milestones': 0,
            'total_amount': Decimal('0'),
            'paid_amount': Decimal('0'),
            'completion_percentage': Decimal('0')
        }
    
    @staticmethod
    def delete(milestone_id: uuid.UUID) -> bool:
        """
        Delete a milestone (use with caution)
        
        Args:
            milestone_id: UUID of milestone
        
        Returns:
            True if deleted, False otherwise
        """
        query = "DELETE FROM milestones WHERE milestone_id = %s"
        
        with get_db_cursor() as cur:
            cur.execute(query, (str(milestone_id),))
            cur.connection.commit()
            return cur.rowcount > 0

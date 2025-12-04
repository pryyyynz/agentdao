"""
Reviews Repository
Handles agent milestone reviews and admin decisions
"""

import logging
import json
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
import uuid

from utils.database import get_db_cursor

logger = logging.getLogger(__name__)


class ReviewsRepository:
    """Repository for milestone reviews and admin decisions"""
    
    # ========================================================================
    # AGENT REVIEWS
    # ========================================================================
    
    def create_agent_review(
        self,
        milestone_id: uuid.UUID,
        agent_id: str,
        agent_name: str,
        recommendation: str,
        feedback: str,
        confidence_score: Optional[Decimal] = None,
        review_score: Optional[Decimal] = None,
        strengths: Optional[List[str]] = None,
        weaknesses: Optional[List[str]] = None,
        suggestions: Optional[List[str]] = None,
        deliverables_met: Optional[bool] = None,
        quality_rating: Optional[Decimal] = None,
        documentation_rating: Optional[Decimal] = None,
        code_quality_rating: Optional[Decimal] = None,
        review_duration_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create a new agent review for a milestone"""
        
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO agent_milestone_reviews (
                    milestone_id, agent_id, agent_name, recommendation,
                    confidence_score, review_score, feedback,
                    strengths, weaknesses, suggestions,
                    deliverables_met, quality_rating, documentation_rating,
                    code_quality_rating, review_duration_seconds
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING 
                    review_id, milestone_id, agent_id, agent_name, recommendation,
                    confidence_score, review_score, feedback,
                    strengths, weaknesses, suggestions,
                    deliverables_met, quality_rating, documentation_rating,
                    code_quality_rating, review_duration_seconds,
                    reviewed_at, created_at
            """, (
                str(milestone_id), agent_id, agent_name, recommendation,
                confidence_score, review_score, feedback,
                strengths, weaknesses, suggestions,
                deliverables_met, quality_rating, documentation_rating,
                code_quality_rating, review_duration_seconds
            ))
            
            result = cur.fetchone()
            
            # Log to agent_activity_log for tracking evaluations count
            cur.execute("""
                INSERT INTO agent_activity_log (
                    agent_name, activity_type, action, details
                )
                VALUES (%s, %s, %s, %s)
            """, (
                agent_name,
                'milestone_reviewed',  # Match the database constraint
                'completed_review',
                json.dumps({
                    'milestone_id': str(milestone_id),
                    'recommendation': recommendation,
                    'score': float(review_score) if review_score else None,
                    'review_id': str(result['review_id'])
                })
            ))
            
            cur.connection.commit()
            
            return {
                'review_id': str(result['review_id']),
                'milestone_id': str(result['milestone_id']),
                'agent_id': result['agent_id'],
                'agent_name': result['agent_name'],
                'recommendation': result['recommendation'],
                'confidence_score': result['confidence_score'],
                'review_score': result['review_score'],
                'feedback': result['feedback'],
                'strengths': result['strengths'],
                'weaknesses': result['weaknesses'],
                'suggestions': result['suggestions'],
                'deliverables_met': result['deliverables_met'],
                'quality_rating': result['quality_rating'],
                'documentation_rating': result['documentation_rating'],
                'code_quality_rating': result['code_quality_rating'],
                'review_duration_seconds': result['review_duration_seconds'],
                'reviewed_at': result['reviewed_at'],
                'created_at': result['created_at']
            }
    
    def get_agent_reviews_by_milestone(
        self,
        milestone_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """Get all agent reviews for a milestone"""
        
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT 
                    review_id, milestone_id, agent_id, agent_name, recommendation,
                    confidence_score, review_score, feedback,
                    strengths, weaknesses, suggestions,
                    deliverables_met, quality_rating, documentation_rating,
                    code_quality_rating, review_duration_seconds,
                    reviewed_at, created_at
                FROM agent_milestone_reviews
                WHERE milestone_id = %s
                ORDER BY reviewed_at DESC
            """, (str(milestone_id),))
            
            results = cur.fetchall()
            
            return [{
                'review_id': str(row['review_id']),
                'milestone_id': str(row['milestone_id']),
                'agent_id': row['agent_id'],
                'agent_name': row['agent_name'],
                'recommendation': row['recommendation'],
                'confidence_score': row['confidence_score'],
                'review_score': row['review_score'],
                'feedback': row['feedback'],
                'strengths': row['strengths'],
                'weaknesses': row['weaknesses'],
                'suggestions': row['suggestions'],
                'deliverables_met': row['deliverables_met'],
                'quality_rating': row['quality_rating'],
                'documentation_rating': row['documentation_rating'],
                'code_quality_rating': row['code_quality_rating'],
                'review_duration_seconds': row['review_duration_seconds'],
                'reviewed_at': row['reviewed_at'],
                'created_at': row['created_at']
            } for row in results]
    
    def get_agent_review_by_id(
        self,
        review_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        """Get a specific agent review by ID"""
        
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT 
                    review_id, milestone_id, agent_id, agent_name, recommendation,
                    confidence_score, review_score, feedback,
                    strengths, weaknesses, suggestions,
                    deliverables_met, quality_rating, documentation_rating,
                    code_quality_rating, review_duration_seconds,
                    reviewed_at, created_at
                FROM agent_milestone_reviews
                WHERE review_id = %s
            """, (str(review_id),))
            
            result = cur.fetchone()
            if not result:
                return None
            
            return {
                'review_id': str(result['review_id']),
                'milestone_id': str(result['milestone_id']),
                'agent_id': result['agent_id'],
                'agent_name': result['agent_name'],
                'recommendation': result['recommendation'],
                'confidence_score': result['confidence_score'],
                'review_score': result['review_score'],
                'feedback': result['feedback'],
                'strengths': result['strengths'],
                'weaknesses': result['weaknesses'],
                'suggestions': result['suggestions'],
                'deliverables_met': result['deliverables_met'],
                'quality_rating': result['quality_rating'],
                'documentation_rating': result['documentation_rating'],
                'code_quality_rating': result['code_quality_rating'],
                'review_duration_seconds': result['review_duration_seconds'],
                'reviewed_at': result['reviewed_at'],
                'created_at': result['created_at']
            }
    
    # ========================================================================
    # ADMIN DECISIONS
    # ========================================================================
    
    def create_admin_decision(
        self,
        milestone_id: uuid.UUID,
        admin_wallet_address: str,
        admin_email: Optional[str],
        decision: str,
        admin_feedback: str,
        override_agents: bool = False,
        decision_notes: Optional[str] = None,
        approved_amount: Optional[Decimal] = None,
        payment_authorized: bool = False
    ) -> Dict[str, Any]:
        """Create admin decision for milestone"""
        
        with get_db_cursor() as cur:
            # Get agent review aggregates
            cur.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE recommendation = 'approve') as approvals,
                    COUNT(*) FILTER (WHERE recommendation = 'reject') as rejections,
                    COUNT(*) FILTER (WHERE recommendation = 'revise') as revisions,
                    AVG(review_score) as avg_score
                FROM agent_milestone_reviews
                WHERE milestone_id = %s
            """, (str(milestone_id),))
            
            agg = cur.fetchone()
            total_reviews = agg['total'] if agg else 0
            agent_approvals = agg['approvals'] if agg else 0
            agent_rejections = agg['rejections'] if agg else 0
            agent_revisions = agg['revisions'] if agg else 0
            avg_score = agg['avg_score'] if agg else None
            
            # Insert admin decision
            cur.execute("""
                INSERT INTO admin_milestone_decisions (
                    milestone_id, admin_wallet_address, admin_email,
                    decision, admin_feedback, override_agents,
                    decision_notes, approved_amount, payment_authorized,
                    total_agent_reviews, agent_approvals, agent_rejections,
                    agent_revisions, avg_agent_score
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (milestone_id) DO UPDATE SET
                    decision = EXCLUDED.decision,
                    admin_feedback = EXCLUDED.admin_feedback,
                    override_agents = EXCLUDED.override_agents,
                    decision_notes = EXCLUDED.decision_notes,
                    approved_amount = EXCLUDED.approved_amount,
                    payment_authorized = EXCLUDED.payment_authorized,
                    total_agent_reviews = EXCLUDED.total_agent_reviews,
                    agent_approvals = EXCLUDED.agent_approvals,
                    agent_rejections = EXCLUDED.agent_rejections,
                    agent_revisions = EXCLUDED.agent_revisions,
                    avg_agent_score = EXCLUDED.avg_agent_score,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING 
                    decision_id, milestone_id, admin_wallet_address, admin_email,
                    decision, admin_feedback, override_agents,
                    approved_amount, payment_authorized, payment_tx_hash, payment_released_at,
                    total_agent_reviews, agent_approvals, agent_rejections,
                    agent_revisions, avg_agent_score, decision_notes,
                    decided_at, created_at, updated_at
            """, (
                str(milestone_id), admin_wallet_address, admin_email,
                decision, admin_feedback, override_agents,
                decision_notes, approved_amount, payment_authorized,
                total_reviews, agent_approvals, agent_rejections,
                agent_revisions, avg_score
            ))
            
            result = cur.fetchone()
            cur.connection.commit()
            
            return {
                'decision_id': str(result['decision_id']),
                'milestone_id': str(result['milestone_id']),
                'admin_wallet_address': result['admin_wallet_address'],
                'admin_email': result['admin_email'],
                'decision': result['decision'],
                'admin_feedback': result['admin_feedback'],
                'override_agents': result['override_agents'],
                'approved_amount': result['approved_amount'],
                'payment_authorized': result['payment_authorized'],
                'payment_tx_hash': result['payment_tx_hash'],
                'payment_released_at': result['payment_released_at'],
                'total_agent_reviews': result['total_agent_reviews'],
                'agent_approvals': result['agent_approvals'],
                'agent_rejections': result['agent_rejections'],
                'agent_revisions': result['agent_revisions'],
                'avg_agent_score': result['avg_agent_score'],
                'decision_notes': result['decision_notes'],
                'decided_at': result['decided_at'],
                'created_at': result['created_at'],
                'updated_at': result['updated_at']
            }
    
    def get_admin_decision_by_milestone(
        self,
        milestone_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        """Get admin decision for a milestone"""
        
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT 
                    decision_id, milestone_id, admin_wallet_address, admin_email,
                    decision, admin_feedback, override_agents,
                    approved_amount, payment_authorized, payment_tx_hash, payment_released_at,
                    total_agent_reviews, agent_approvals, agent_rejections,
                    agent_revisions, avg_agent_score, decision_notes,
                    decided_at, created_at, updated_at
                FROM admin_milestone_decisions
                WHERE milestone_id = %s
            """, (str(milestone_id),))
            
            result = cur.fetchone()
            if not result:
                return None
            
            return {
                'decision_id': str(result[0]),
                'milestone_id': str(result[1]),
                'admin_wallet_address': result[2],
                'admin_email': result[3],
                'decision': result[4],
                'admin_feedback': result[5],
                'override_agents': result[6],
                'approved_amount': result[7],
                'payment_authorized': result[8],
                'payment_tx_hash': result[9],
                'payment_released_at': result[10],
                'total_agent_reviews': result[11],
                'agent_approvals': result[12],
                'agent_rejections': result[13],
                'agent_revisions': result[14],
                'avg_agent_score': result[15],
                'decision_notes': result[16],
                'decided_at': result[17],
                'created_at': result[18],
                'updated_at': result[19]
            }
    
    # ========================================================================
    # VIEWS
    # ========================================================================
    
    def get_pending_admin_reviews(
        self,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get all milestones pending admin review"""
        
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT 
                    milestone_id, grant_id, milestone_number, milestone_title,
                    status, amount, proof_of_work_url, submission_notes,
                    submitted_at, agent_review_count, agent_approvals,
                    agent_rejections, agent_revisions, avg_review_score,
                    grant_title, grantee_id, total_grant_amount, hours_waiting
                FROM pending_admin_reviews
                LIMIT %s
            """, (limit,))
            
            results = cur.fetchall()
            
            return [{
                'milestone_id': str(row['milestone_id']),
                'grant_id': str(row['grant_id']),
                'milestone_number': row['milestone_number'],
                'milestone_title': row['milestone_title'],
                'status': row['status'],
                'amount': row['amount'],
                'proof_of_work_url': row['proof_of_work_url'],
                'submission_notes': row['submission_notes'],
                'submitted_at': row['submitted_at'],
                'agent_review_count': row['agent_review_count'],
                'agent_approvals': row['agent_approvals'],
                'agent_rejections': row['agent_rejections'],
                'agent_revisions': row['agent_revisions'],
                'avg_review_score': row['avg_review_score'],
                'grant_title': row['grant_title'],
                'grantee_id': row['grantee_id'],
                'total_grant_amount': row['total_grant_amount'],
                'hours_waiting': row['hours_waiting']
            } for row in results]
    
    def get_milestone_review_status(
        self,
        milestone_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        """Get complete review status for a milestone"""
        
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT 
                    milestone_id, grant_id, milestone_number, title, status,
                    amount, submitted_at, agent_reviews_count, agent_reviews_complete,
                    actual_agent_reviews, agent_approvals, agent_rejections,
                    agent_revisions, avg_agent_review_score, avg_agent_confidence,
                    admin_reviewed, admin_decision, admin_feedback, admin_decided_at,
                    payment_authorized, grant_title, grantee_id
                FROM milestone_review_status
                WHERE milestone_id = %s
            """, (str(milestone_id),))
            
            result = cur.fetchone()
            if not result:
                return None
            
            return {
                'milestone_id': str(result['milestone_id']),
                'grant_id': str(result['grant_id']),
                'milestone_number': result['milestone_number'],
                'title': result['title'],
                'status': result['status'],
                'amount': result['amount'],
                'submitted_at': result['submitted_at'],
                'agent_reviews_count': result['agent_reviews_count'],
                'agent_reviews_complete': result['agent_reviews_complete'],
                'actual_agent_reviews': result['actual_agent_reviews'],
                'agent_approvals': result['agent_approvals'],
                'agent_rejections': result['agent_rejections'],
                'agent_revisions': result['agent_revisions'],
                'avg_agent_review_score': result['avg_agent_review_score'],
                'avg_agent_confidence': result['avg_agent_confidence'],
                'admin_reviewed': result['admin_reviewed'],
                'admin_decision': result['admin_decision'],
                'admin_feedback': result['admin_feedback'],
                'admin_decided_at': result['admin_decided_at'],
                'payment_authorized': result['payment_authorized'],
                'grant_title': result['grant_title'],
                'grantee_id': result['grantee_id']
            }

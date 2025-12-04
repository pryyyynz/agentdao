"""
Evaluations Repository - CRUD operations for evaluations table
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import uuid

from utils.database import execute_query, execute_insert, execute_update, execute_delete


class EvaluationsRepository:
    """Repository for evaluations table operations"""
    
    @staticmethod
    def create(
        grant_id: uuid.UUID,
        agent_name: str,
        score: Decimal,
        vote: str,
        confidence: Decimal,
        agent_address: Optional[str] = None,
        summary: Optional[str] = None,
        detailed_analysis: Optional[Dict[str, Any]] = None,
        strengths: Optional[List[str]] = None,
        weaknesses: Optional[List[str]] = None,
        recommendations: Optional[List[str]] = None,
        red_flags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new evaluation or update if already exists (UPSERT)"""
        query = """
            INSERT INTO evaluations (
                grant_id, agent_name, agent_address, score, vote, confidence,
                summary, detailed_analysis, strengths, weaknesses,
                recommendations, red_flags, metadata, completed_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (grant_id, agent_name) 
            DO UPDATE SET
                agent_address = EXCLUDED.agent_address,
                score = EXCLUDED.score,
                vote = EXCLUDED.vote,
                confidence = EXCLUDED.confidence,
                summary = EXCLUDED.summary,
                detailed_analysis = EXCLUDED.detailed_analysis,
                strengths = EXCLUDED.strengths,
                weaknesses = EXCLUDED.weaknesses,
                recommendations = EXCLUDED.recommendations,
                red_flags = EXCLUDED.red_flags,
                metadata = EXCLUDED.metadata,
                started_at = CURRENT_TIMESTAMP,
                completed_at = CURRENT_TIMESTAMP
            RETURNING *
        """
        
        params = (
            str(grant_id), agent_name, agent_address, score, vote, confidence,
            summary, detailed_analysis, strengths, weaknesses,
            recommendations, red_flags, metadata
        )
        
        return execute_insert(query, params)
    
    @staticmethod
    def get_by_id(evaluation_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get evaluation by UUID"""
        query = "SELECT * FROM evaluations WHERE evaluation_id = %s"
        return execute_query(query, (str(evaluation_id),), fetch='one')
    
    @staticmethod
    def get_by_grant(grant_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Get all evaluations for a grant"""
        query = """
            SELECT * FROM evaluations 
            WHERE grant_id = %s
            ORDER BY started_at DESC
        """
        return execute_query(query, (str(grant_id),), fetch='all')
    
    @staticmethod
    def get_by_agent(agent_name: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all evaluations by a specific agent"""
        query = """
            SELECT * FROM evaluations 
            WHERE agent_name = %s
            ORDER BY started_at DESC
            LIMIT %s
        """
        return execute_query(query, (agent_name, limit), fetch='all')
    
    @staticmethod
    def get_by_grant_and_agent(
        grant_id: uuid.UUID,
        agent_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get specific agent's evaluation for a grant"""
        query = """
            SELECT * FROM evaluations 
            WHERE grant_id = %s AND agent_name = %s
        """
        return execute_query(query, (str(grant_id), agent_name), fetch='one')
    
    @staticmethod
    def complete_evaluation(
        evaluation_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Mark evaluation as completed"""
        query = """
            UPDATE evaluations 
            SET completed_at = CURRENT_TIMESTAMP
            WHERE evaluation_id = %s
            RETURNING *
        """
        result = execute_update(query, (str(evaluation_id),), returning=True)
        return result[0] if result else None
    
    @staticmethod
    def update_on_chain_vote(
        evaluation_id: uuid.UUID,
        transaction_hash: str
    ) -> Dict[str, Any]:
        """Update on-chain vote transaction hash"""
        query = """
            UPDATE evaluations 
            SET on_chain_vote_tx = %s
            WHERE evaluation_id = %s
            RETURNING *
        """
        result = execute_update(query, (transaction_hash, str(evaluation_id)), returning=True)
        return result[0] if result else None
    
    @staticmethod
    def get_completed_count(grant_id: uuid.UUID) -> int:
        """Count completed evaluations for a grant"""
        query = """
            SELECT COUNT(*) as count 
            FROM evaluations 
            WHERE grant_id = %s AND completed_at IS NOT NULL
        """
        result = execute_query(query, (str(grant_id),), fetch='one')
        return result['count'] if result else 0
    
    @staticmethod
    def get_average_score(grant_id: uuid.UUID) -> Optional[Decimal]:
        """Get average score for a grant"""
        query = """
            SELECT AVG(score) as avg_score 
            FROM evaluations 
            WHERE grant_id = %s AND completed_at IS NOT NULL
        """
        result = execute_query(query, (str(grant_id),), fetch='one')
        return result['avg_score'] if result else None
    
    @staticmethod
    def get_vote_counts(grant_id: uuid.UUID) -> Dict[str, int]:
        """Get vote counts for a grant"""
        query = """
            SELECT 
                COUNT(CASE WHEN vote = 'approve' THEN 1 END) as approvals,
                COUNT(CASE WHEN vote = 'reject' THEN 1 END) as rejections,
                COUNT(CASE WHEN vote = 'abstain' THEN 1 END) as abstentions
            FROM evaluations 
            WHERE grant_id = %s AND completed_at IS NOT NULL
        """
        result = execute_query(query, (str(grant_id),), fetch='one')
        return result if result else {'approvals': 0, 'rejections': 0, 'abstentions': 0}
    
    @staticmethod
    def delete(evaluation_id: uuid.UUID) -> int:
        """Delete an evaluation"""
        query = "DELETE FROM evaluations WHERE evaluation_id = %s"
        return execute_delete(query, (str(evaluation_id),))


# Export for easy importing
__all__ = ['EvaluationsRepository']

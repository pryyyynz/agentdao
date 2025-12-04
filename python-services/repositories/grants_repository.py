"""
Grants Repository - CRUD operations for grants table
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import uuid

from utils.database import get_db_cursor, execute_query, execute_insert, execute_update, execute_delete


class GrantsRepository:
    """Repository for grants table operations"""
    
    @staticmethod
    def create(
        title: str,
        description: str,
        requested_amount: Decimal,
        applicant_address: str,
        currency: str = 'ETH',
        applicant_email: Optional[str] = None,
        team_size: int = 1,
        ipfs_hash: Optional[str] = None,
        document_urls: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new grant proposal
        
        Args:
            title: Grant title
            description: Grant description
            requested_amount: Amount requested
            applicant_address: Ethereum address of applicant
            currency: Currency (default: ETH)
            applicant_email: Email address (optional)
            team_size: Team size (default: 1)
            ipfs_hash: IPFS hash of full proposal
            document_urls: List of additional document URLs
            metadata: Additional metadata as JSON
        
        Returns:
            Created grant record as dict
        """
        query = """
            INSERT INTO grants (
                title, description, requested_amount, currency,
                applicant_address, applicant_email, team_size,
                ipfs_hash, document_urls, metadata, user_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        
        params = (
            title, description, requested_amount, currency,
            applicant_address, applicant_email, team_size,
            ipfs_hash, document_urls, 
            metadata if metadata else None,
            user_id
        )
        
        return execute_insert(query, params)
    
    @staticmethod
    def get_by_id(grant_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get grant by UUID"""
        query = "SELECT * FROM grants WHERE grant_id = %s"
        return execute_query(query, (str(grant_id),), fetch='one')
    
    @staticmethod
    def get_by_on_chain_id(on_chain_id: int) -> Optional[Dict[str, Any]]:
        """Get grant by on-chain ID"""
        query = "SELECT * FROM grants WHERE on_chain_id = %s"
        return execute_query(query, (on_chain_id,), fetch='one')
    
    @staticmethod
    def get_all(
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all grants with optional filtering
        
        Args:
            status: Filter by status (optional)
            limit: Maximum number of results
            offset: Offset for pagination
            user_id: Filter by user_id (optional, for user-specific grants)
        
        Returns:
            List of grant records
        """
        conditions = []
        params = []
        
        if status:
            conditions.append("status = %s")
            params.append(status)
        
        if user_id:
            conditions.append("user_id = %s")
            params.append(user_id)
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        params.extend([limit, offset])
        
        query = f"""
            SELECT * FROM grants 
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        
        return execute_query(query, tuple(params), fetch='all')
    
    @staticmethod
    def get_by_applicant(
        applicant_address: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all grants by a specific applicant"""
        query = """
            SELECT * FROM grants 
            WHERE applicant_address = %s
            ORDER BY created_at DESC
            LIMIT %s
        """
        return execute_query(query, (applicant_address, limit), fetch='all')
    
    @staticmethod
    def update_status(
        grant_id: uuid.UUID,
        status: str
    ) -> Dict[str, Any]:
        """Update grant status"""
        query = """
            UPDATE grants 
            SET status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE grant_id = %s
            RETURNING *
        """
        result = execute_update(query, (status, str(grant_id)), returning=True)
        return result[0] if result else None
    
    @staticmethod
    def start_evaluation(grant_id: uuid.UUID) -> Dict[str, Any]:
        """Mark grant evaluation as started"""
        query = """
            UPDATE grants 
            SET status = 'under_evaluation',
                evaluation_started_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE grant_id = %s
            RETURNING *
        """
        result = execute_update(query, (str(grant_id),), returning=True)
        return result[0] if result else None
    
    @staticmethod
    def complete_evaluation(
        grant_id: uuid.UUID,
        overall_score: Decimal,
        consensus_reached: bool,
        final_status: str = 'approved'
    ) -> Dict[str, Any]:
        """Mark grant evaluation as completed"""
        query = """
            UPDATE grants 
            SET status = %s,
                overall_score = %s,
                consensus_reached = %s,
                evaluation_completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE grant_id = %s
            RETURNING *
        """
        result = execute_update(
            query,
            (final_status, overall_score, consensus_reached, str(grant_id)),
            returning=True
        )
        return result[0] if result else None
    
    @staticmethod
    def update_on_chain_data(
        grant_id: uuid.UUID,
        on_chain_id: int,
        transaction_hash: str
    ) -> Dict[str, Any]:
        """Update on-chain reference data"""
        query = """
            UPDATE grants 
            SET on_chain_id = %s,
                transaction_hash = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE grant_id = %s
            RETURNING *
        """
        result = execute_update(
            query,
            (on_chain_id, transaction_hash, str(grant_id)),
            returning=True
        )
        return result[0] if result else None
    
    @staticmethod
    def update(
        grant_id: uuid.UUID,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Update grant with arbitrary fields
        
        Args:
            grant_id: Grant UUID
            **kwargs: Fields to update (e.g., title="New Title")
        
        Returns:
            Updated grant record
        """
        if not kwargs:
            return GrantsRepository.get_by_id(grant_id)
        
        # Build dynamic UPDATE query
        set_clauses = []
        params = []
        
        for key, value in kwargs.items():
            set_clauses.append(f"{key} = %s")
            params.append(value)
        
        # Add updated_at
        set_clauses.append("updated_at = CURRENT_TIMESTAMP")
        
        # Add grant_id for WHERE clause
        params.append(str(grant_id))
        
        query = f"""
            UPDATE grants 
            SET {', '.join(set_clauses)}
            WHERE grant_id = %s
            RETURNING *
        """
        
        result = execute_update(query, tuple(params), returning=True)
        return result[0] if result else None
    
    @staticmethod
    def delete(grant_id: uuid.UUID) -> int:
        """
        Delete a grant (use with caution - cascades to evaluations and milestones)
        
        Returns:
            Number of rows deleted
        """
        query = "DELETE FROM grants WHERE grant_id = %s"
        return execute_delete(query, (str(grant_id),))
    
    @staticmethod
    def count_by_status(status: Optional[str] = None) -> int:
        """Count grants by status"""
        if status:
            query = "SELECT COUNT(*) as count FROM grants WHERE status = %s"
            result = execute_query(query, (status,), fetch='one')
        else:
            query = "SELECT COUNT(*) as count FROM grants"
            result = execute_query(query, fetch='one')
        
        return result['count'] if result else 0
    
    @staticmethod
    def get_summary(grant_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get grant with evaluation summary from view"""
        query = "SELECT * FROM grant_summary WHERE grant_id = %s"
        return execute_query(query, (str(grant_id),), fetch='one')
    
    @staticmethod
    def get_active_grants() -> List[Dict[str, Any]]:
        """Get all active grants from dashboard view"""
        query = "SELECT * FROM active_grants_dashboard ORDER BY created_at DESC"
        return execute_query(query, fetch='all')


if __name__ == '__main__':
    """Test grants repository"""
    print("Testing Grants Repository...\n")
    
    # Test create
    try:
        grant = GrantsRepository.create(
            title="Test Grant",
            description="This is a test grant proposal",
            requested_amount=Decimal("10.5"),
            applicant_address="0x1234567890123456789012345678901234567890",
            applicant_email="test@example.com",
            ipfs_hash="QmTest123"
        )
        print(f"✅ Created grant: {grant['grant_id']}")
        
        # Test get by ID
        retrieved = GrantsRepository.get_by_id(grant['grant_id'])
        print(f"✅ Retrieved grant: {retrieved['title']}")
        
        # Test update status
        updated = GrantsRepository.update_status(grant['grant_id'], 'under_evaluation')
        print(f"✅ Updated status: {updated['status']}")
        
        # Test delete
        deleted = GrantsRepository.delete(grant['grant_id'])
        print(f"✅ Deleted {deleted} grant(s)")
        
    except Exception as e:
        print(f"❌ Error: {e}")

"""
Users Repository
Handles database operations for users
"""

import logging
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from utils.database import get_db_cursor

logger = logging.getLogger(__name__)

class UsersRepository:
    """Repository for user data operations"""
    
    def create_user(self, email: str, display_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Create a new user
        
        Args:
            email: User email address
            display_name: Optional display name
            
        Returns:
            User data dict or None if creation failed
        """
        try:
            user_id = uuid.uuid4()
            with get_db_cursor() as cursor:
                cursor.execute("""
                    INSERT INTO users (user_id, email, display_name, email_verified)
                    VALUES (%s, %s, %s, FALSE)
                    RETURNING user_id, email, wallet_address, display_name, bio, 
                              email_verified, created_at, updated_at, last_login_at
                """, (str(user_id), email, display_name))
                
                result = cursor.fetchone()
                cursor.connection.commit()
                
                if result:
                    # RealDictCursor returns dict, access by key
                    user = {
                        'user_id': str(result['user_id']),
                        'email': result['email'],
                        'wallet_address': result['wallet_address'],
                        'display_name': result['display_name'],
                        'bio': result['bio'],
                        'email_verified': result['email_verified'],
                        'created_at': result['created_at'],
                        'updated_at': result['updated_at'],
                        'last_login_at': result['last_login_at']
                    }
                    logger.info(f"User created: {email} ({user_id})")
                    return user
                    
        except Exception as e:
            logger.error(f"Failed to create user {email}: {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email
        
        Args:
            email: User email address
            
        Returns:
            User data dict or None if not found
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT user_id, email, wallet_address, display_name, bio,
                           email_verified, created_at, updated_at, last_login_at
                    FROM users
                    WHERE email = %s
                """, (email,))
                
                result = cursor.fetchone()
                
                if result:
                    # RealDictCursor returns dict, access by key
                    return {
                        'user_id': str(result['user_id']),
                        'email': result['email'],
                        'wallet_address': result['wallet_address'],
                        'display_name': result['display_name'],
                        'bio': result['bio'],
                        'email_verified': result['email_verified'],
                        'created_at': result['created_at'],
                        'updated_at': result['updated_at'],
                        'last_login_at': result['last_login_at']
                    }
                return None
                
        except Exception as e:
            logger.error(f"Failed to get user by email {email}: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by user_id
        
        Args:
            user_id: User UUID
            
        Returns:
            User data dict or None if not found
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT user_id, email, wallet_address, display_name, bio,
                           email_verified, created_at, updated_at, last_login_at
                    FROM users
                    WHERE user_id = %s
                """, (user_id,))
                
                result = cursor.fetchone()
                
                if result:
                    # RealDictCursor returns dict, access by key
                    return {
                        'user_id': str(result['user_id']),
                        'email': result['email'],
                        'wallet_address': result['wallet_address'],
                        'display_name': result['display_name'],
                        'bio': result['bio'],
                        'email_verified': result['email_verified'],
                        'created_at': result['created_at'],
                        'updated_at': result['updated_at'],
                        'last_login_at': result['last_login_at']
                    }
                return None
                
        except Exception as e:
            logger.error(f"Failed to get user by ID {user_id}: {e}")
            return None
    
    def get_user_by_wallet(self, wallet_address: str) -> Optional[Dict[str, Any]]:
        """
        Get user by wallet address
        
        Args:
            wallet_address: Ethereum wallet address
            
        Returns:
            User data dict or None if not found
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT user_id, email, wallet_address, display_name, bio,
                           email_verified, created_at, updated_at, last_login_at
                    FROM users
                    WHERE wallet_address = %s
                """, (wallet_address,))
                
                result = cursor.fetchone()
                
                if result:
                    # RealDictCursor returns dict, access by key
                    return {
                        'user_id': str(result['user_id']),
                        'email': result['email'],
                        'wallet_address': result['wallet_address'],
                        'display_name': result['display_name'],
                        'bio': result['bio'],
                        'email_verified': result['email_verified'],
                        'created_at': result['created_at'],
                        'updated_at': result['updated_at'],
                        'last_login_at': result['last_login_at']
                    }
                return None
                
        except Exception as e:
            logger.error(f"Failed to get user by wallet {wallet_address}: {e}")
            return None
    
    def update_user(self, user_id: str, **kwargs) -> bool:
        """
        Update user fields
        
        Args:
            user_id: User UUID
            **kwargs: Fields to update (display_name, bio, email_verified, etc.)
            
        Returns:
            True if updated successfully, False otherwise
        """
        if not kwargs:
            return False
        
        allowed_fields = ['display_name', 'bio', 'email_verified', 'wallet_address']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not updates:
            return False
        
        try:
            with get_db_cursor() as cursor:
                set_clauses = [f"{field} = %s" for field in updates.keys()]
                values = list(updates.values()) + [user_id]
                
                query = f"""
                    UPDATE users
                    SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """
                
                cursor.execute(query, values)
                cursor.connection.commit()
                
                logger.info(f"User {user_id} updated: {list(updates.keys())}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to update user {user_id}: {e}")
            return False
    
    def link_wallet(self, user_id: str, wallet_address: str) -> tuple[bool, int]:
        """
        Link wallet address to user and return count of linked grants
        
        Args:
            user_id: User UUID
            wallet_address: Ethereum wallet address
            
        Returns:
            Tuple of (success, grants_linked_count)
        """
        try:
            with get_db_cursor() as cursor:
                # Check if wallet is already linked to another user
                cursor.execute("""
                    SELECT user_id FROM users
                    WHERE wallet_address = %s AND user_id != %s
                """, (wallet_address, user_id))
                
                if cursor.fetchone():
                    logger.warning(f"Wallet {wallet_address} already linked to another user")
                    return False, 0
                
                # Update user's wallet address
                cursor.execute("""
                    UPDATE users
                    SET wallet_address = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """, (wallet_address, user_id))
                
                # Link grants to user using the database function with explicit type casts
                try:
                    cursor.execute("""
                        SELECT link_grants_to_user(%s::UUID, %s::VARCHAR(42))
                    """, (user_id, wallet_address))
                    
                    result = cursor.fetchone()
                    grants_linked = result[0] if result else 0
                except Exception as db_error:
                    # If the database function doesn't exist or fails, continue without linking grants
                    logger.warning(f"Could not link grants automatically: {db_error}")
                    grants_linked = 0
                
                cursor.connection.commit()
                
                logger.info(f"Wallet {wallet_address} linked to user {user_id}, {grants_linked} grants linked")
                return True, grants_linked
                
        except Exception as e:
            logger.error(f"Failed to link wallet for user {user_id}: {e}")
            return False, 0
    
    def unlink_wallet(self, user_id: str) -> bool:
        """
        Unlink wallet address from user
        
        Args:
            user_id: User UUID
            
        Returns:
            True if unlinked successfully, False otherwise
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    UPDATE users
                    SET wallet_address = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """, (user_id,))
                cursor.connection.commit()
                
                logger.info(f"Wallet unlinked from user {user_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to unlink wallet for user {user_id}: {e}")
            return False
    
    def update_last_login(self, user_id: str) -> bool:
        """
        Update user's last login timestamp
        
        Args:
            user_id: User UUID
            
        Returns:
            True if updated successfully, False otherwise
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    UPDATE users
                    SET last_login_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """, (user_id,))
                cursor.connection.commit()
                return True
                
        except Exception as e:
            logger.error(f"Failed to update last login for user {user_id}: {e}")
            return False


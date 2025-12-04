"""
OTP Service for AgentDAO
Handles OTP generation, validation, and rate limiting
"""

import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from utils.database import get_db_cursor
from config import settings

logger = logging.getLogger(__name__)

class OTPService:
    """Service for OTP generation and validation"""
    
    def __init__(self):
        self.expiration_minutes = settings.OTP_EXPIRATION_MINUTES
        self.rate_limit_per_hour = settings.OTP_RATE_LIMIT_PER_HOUR
    
    def generate_otp(self) -> str:
        """
        Generate a 6-digit OTP code
        
        Returns:
            6-digit numeric OTP code
        """
        return f"{secrets.randbelow(1000000):06d}"
    
    def store_otp(self, email: str, otp_code: str) -> bool:
        """
        Store OTP code in database
        
        Args:
            email: User email
            otp_code: Generated OTP code
            
        Returns:
            True if stored successfully, False otherwise
        """
        expires_at = datetime.utcnow() + timedelta(minutes=self.expiration_minutes)
        
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    INSERT INTO otp_codes (email, code, expires_at)
                    VALUES (%s, %s, %s)
                """, (email, otp_code, expires_at))
                cursor.connection.commit()
                logger.info(f"OTP stored for {email}")
                return True
        except Exception as e:
            logger.error(f"Failed to store OTP for {email}: {e}")
            return False
    
    def verify_otp(self, email: str, otp_code: str) -> Tuple[bool, str]:
        """
        Verify OTP code
        
        Args:
            email: User email
            otp_code: OTP code to verify
            
        Returns:
            Tuple of (is_valid, message)
        """
        try:
            with get_db_cursor() as cursor:
                # Find valid, unused OTP
                cursor.execute("""
                    SELECT id, expires_at, used_at
                    FROM otp_codes
                    WHERE email = %s 
                      AND code = %s
                      AND expires_at > CURRENT_TIMESTAMP
                      AND used_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (email, otp_code))
                
                result = cursor.fetchone()
                
                if not result:
                    logger.warning(f"Invalid or expired OTP attempt for {email}")
                    return False, "Invalid or expired OTP code"
                
                # RealDictCursor returns a dict, so access by key
                otp_id = result['id']
                
                # Mark OTP as used
                cursor.execute("""
                    UPDATE otp_codes
                    SET used_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (otp_id,))
                cursor.connection.commit()
                
                logger.info(f"OTP verified successfully for {email}")
                return True, "OTP verified successfully"
                
        except Exception as e:
            logger.error(f"Error verifying OTP for {email}: {e}")
            return False, "Error verifying OTP"
    
    def check_rate_limit(self, email: str) -> Tuple[bool, str]:
        """
        Check if user has exceeded rate limit for OTP requests
        
        Args:
            email: User email
            
        Returns:
            Tuple of (within_limit, message)
        """
        try:
            with get_db_cursor() as cursor:
                # Count OTP requests in the last hour
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM otp_codes
                    WHERE email = %s
                      AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
                """, (email,))
                
                count = cursor.fetchone()[0]
                
                if count >= self.rate_limit_per_hour:
                    logger.warning(f"Rate limit exceeded for {email}: {count} requests in last hour")
                    return False, f"Too many OTP requests. Please wait before requesting another code."
                
                return True, "Rate limit OK"
                
        except Exception as e:
            logger.error(f"Error checking rate limit for {email}: {e}")
            return True, "Rate limit check failed, allowing request"
    
    def cleanup_expired_otps(self) -> int:
        """
        Clean up expired OTP codes
        
        Returns:
            Number of deleted OTP codes
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    DELETE FROM otp_codes
                    WHERE expires_at < CURRENT_TIMESTAMP
                       OR (used_at IS NOT NULL AND used_at < CURRENT_TIMESTAMP - INTERVAL '1 day')
                """)
                deleted_count = cursor.rowcount
                cursor.connection.commit()
                
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} expired OTP codes")
                
                return deleted_count
                
        except Exception as e:
            logger.error(f"Error cleaning up expired OTPs: {e}")
            return 0


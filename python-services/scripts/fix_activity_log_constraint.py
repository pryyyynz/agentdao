"""
Fix agent_activity_log constraint to include milestone activity types
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.database import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fix_activity_log_constraint():
    """Update agent_activity_log constraint"""
    
    with get_db_cursor() as cur:
        try:
            logger.info("Dropping old constraint...")
            cur.execute("""
                ALTER TABLE agent_activity_log 
                DROP CONSTRAINT IF EXISTS agent_activity_log_activity_type_check
            """)
            
            logger.info("Adding updated constraint with milestone and system types...")
            cur.execute("""
                ALTER TABLE agent_activity_log 
                ADD CONSTRAINT agent_activity_log_activity_type_check CHECK (
                    activity_type IN (
                        'evaluation_started',
                        'evaluation_completed',
                        'evaluation_failed',
                        'vote_cast',
                        'message_sent',
                        'message_received',
                        'milestone_reviewed',
                        'error_encountered',
                        'consensus_reached',
                        'fund_release_approved',
                        'grant_created',
                        'grant_updated',
                        'agent_initialized',
                        'agent_shutdown',
                        'milestone_created',
                        'milestone_activated',
                        'milestone_submitted',
                        'milestone_under_review',
                        'milestone_approved',
                        'milestone_rejected',
                        'milestone_revision_requested',
                        'milestone_payment_released',
                        'milestone_completed',
                        'system_paused',
                        'system_resumed',
                        'emergency_stop_activated',
                        'emergency_stop_deactivated'
                    )
                )
            """)
            
            logger.info("✅ Constraint updated successfully!")
            
        except Exception as e:
            logger.error(f"Error updating constraint: {e}")
            raise


if __name__ == "__main__":
    logger.info("Fixing agent_activity_log constraint...")
    fix_activity_log_constraint()
    logger.info("Done!")

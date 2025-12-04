"""
Add 'under_review' status to grants table
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
parent_dir = str(Path(__file__).parent.parent.parent)
sys.path.insert(0, parent_dir)
os.chdir(parent_dir)

from utils.database import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Add under_review status to grants table"""
    try:
        with get_db_cursor() as cur:
            logger.info("Adding 'under_review' status to grants table...")
            
            # Drop old constraint
            cur.execute("ALTER TABLE grants DROP CONSTRAINT IF EXISTS grants_status_check")
            
            # Add new constraint with 'under_review'
            cur.execute("""
                ALTER TABLE grants ADD CONSTRAINT grants_status_check CHECK (
                    status IN (
                        'pending',
                        'under_evaluation',
                        'under_review',
                        'approved',
                        'rejected',
                        'active',
                        'completed',
                        'cancelled'
                    )
                )
            """)
            
            cur.connection.commit()
            logger.info("✅ Successfully added 'under_review' status")
            
            # Verify
            cur.execute("""
                SELECT conname, consrc 
                FROM pg_constraint 
                WHERE conname = 'grants_status_check'
            """)
            result = cur.fetchone()
            if result:
                logger.info(f"Constraint verified: {result}")
            
            return True
            
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

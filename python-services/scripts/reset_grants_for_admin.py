"""
Reset approved grants to under_review status for admin review
This allows testing the admin pending actions functionality
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.database import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def reset_grants_to_under_evaluation():
    """Move approved grants back to under_evaluation for admin testing"""
    
    with get_db_cursor() as cur:
        # Get approved grants that have evaluations
        cur.execute("""
            SELECT 
                g.id,
                g.grant_id,
                g.title,
                g.status,
                g.overall_score,
                COUNT(e.evaluation_id) as eval_count
            FROM grants g
            LEFT JOIN evaluations e ON g.grant_id = e.grant_id
            WHERE g.status = 'approved'
            GROUP BY g.id, g.grant_id, g.title, g.status, g.overall_score
            HAVING COUNT(e.evaluation_id) >= 5
            ORDER BY g.created_at DESC
        """)
        
        approved_grants = cur.fetchall()
        
        if not approved_grants:
            logger.info("No approved grants found")
            return
        
        logger.info(f"\nFound {len(approved_grants)} approved grants with full evaluations")
        logger.info("=" * 80)
        
        reset_count = 0
        
        for grant in approved_grants:
            grant_id = grant['grant_id']
            title = grant['title']
            score = grant['overall_score']
            
            try:
                # Move grant back to under_evaluation
                cur.execute("""
                    UPDATE grants
                    SET 
                        status = 'under_evaluation',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE grant_id = %s
                    RETURNING grant_id, status
                """, (str(grant_id),))
                
                result = cur.fetchone()
                
                if result:
                    logger.info(f"✅ Reset: {title[:50]:50} | Score: {score}%")
                    reset_count += 1
                else:
                    logger.warning(f"❌ Failed: {title[:50]}")
                    
            except Exception as e:
                logger.error(f"Error resetting grant {grant_id}: {e}")
        
        logger.info("=" * 80)
        logger.info(f"✅ Successfully reset {reset_count}/{len(approved_grants)} grants to 'under_evaluation'")
        logger.info("\nThese grants will now appear in:")
        logger.info("  - Admin Dashboard > Pending Actions panel")
        logger.info("  - Ready for admin approval/rejection")
        logger.info("  - Milestones will be created when admin approves")


if __name__ == "__main__":
    logger.info("Resetting approved grants to under_evaluation status...")
    reset_grants_to_under_evaluation()
    logger.info("\nDone! Check the admin dashboard pending actions.")

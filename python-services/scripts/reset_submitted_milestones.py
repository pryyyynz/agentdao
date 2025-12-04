"""
Reset submitted milestones back to active status
This allows grantees to submit them again manually
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.database import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def reset_submitted_milestones():
    """Reset all submitted milestones back to active status"""
    
    with get_db_cursor() as cur:
        # Get all submitted milestones
        cur.execute("""
            SELECT 
                m.milestone_id,
                m.milestone_number,
                m.title,
                g.title as grant_title,
                g.grant_id
            FROM milestones m
            JOIN grants g ON m.grant_id = g.grant_id
            WHERE m.status = 'submitted'
            ORDER BY g.title, m.milestone_number
        """)
        
        submitted_milestones = cur.fetchall()
        
        if not submitted_milestones:
            logger.info("No submitted milestones found")
            return
        
        logger.info(f"\nFound {len(submitted_milestones)} submitted milestones")
        logger.info("=" * 80)
        
        reset_count = 0
        
        for milestone in submitted_milestones:
            milestone_id = milestone['milestone_id']
            milestone_num = milestone['milestone_number']
            milestone_title = milestone['title']
            grant_title = milestone['grant_title']
            
            # Reset the milestone to active status and clear submission data
            try:
                cur.execute("""
                    UPDATE milestones
                    SET 
                        status = 'active',
                        proof_of_work_url = NULL,
                        proof_of_work_ipfs = NULL,
                        submission_notes = NULL,
                        submitted_at = NULL,
                        reviewer_notes = NULL,
                        review_score = NULL
                    WHERE milestone_id = %s
                    RETURNING milestone_id, status
                """, (str(milestone_id),))
                
                result = cur.fetchone()
                
                if result:
                    logger.info(f"✅ Reset: {grant_title[:40]:40} | M{milestone_num} | {milestone_title[:30]}")
                    reset_count += 1
                else:
                    logger.warning(f"❌ Failed: {grant_title[:40]:40} | M{milestone_num}")
                    
            except Exception as e:
                logger.error(f"Error resetting milestone {milestone_id}: {e}")
        
        logger.info("=" * 80)
        logger.info(f"✅ Successfully reset {reset_count}/{len(submitted_milestones)} milestones to active status")
        logger.info("\nThese milestones are now:")
        logger.info("  - Back in 'active' status")
        logger.info("  - Ready for manual submission")
        logger.info("  - Submit button should be visible on grant detail pages")
        logger.info("  - All previous submission data cleared")


if __name__ == "__main__":
    logger.info("Resetting submitted milestones back to active status...")
    reset_submitted_milestones()
    logger.info("\nDone! You can now submit these milestones manually.")


"""
Submit active milestones with test proof of work data
This simulates grantees submitting their completed work for review
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.database import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def submit_active_milestones():
    """Submit all active milestones with test data"""
    
    with get_db_cursor() as cur:
        # Get all active milestones
        cur.execute("""
            SELECT 
                m.milestone_id,
                m.milestone_number,
                m.title,
                g.title as grant_title,
                g.grant_id
            FROM milestones m
            JOIN grants g ON m.grant_id = g.grant_id
            WHERE m.status = 'active'
            ORDER BY g.title, m.milestone_number
        """)
        
        active_milestones = cur.fetchall()
        
        if not active_milestones:
            logger.info("No active milestones found")
            return
        
        logger.info(f"\nFound {len(active_milestones)} active milestones")
        logger.info("=" * 80)
        
        submitted_count = 0
        
        for milestone in active_milestones:
            milestone_id = milestone['milestone_id']
            milestone_num = milestone['milestone_number']
            milestone_title = milestone['title']
            grant_title = milestone['grant_title']
            
            # Create test proof of work data
            proof_url = f"https://github.com/example/{grant_title.lower().replace(' ', '-')}/milestone-{milestone_num}"
            submission_notes = f"""Completed milestone {milestone_num}: {milestone_title}

Key Deliverables:
- Implemented core functionality as specified
- Completed all required features
- Passed internal testing and quality checks
- Documentation updated with usage examples
- Code deployed to staging environment

Technical Details:
- All acceptance criteria met
- Code review completed by team
- Unit tests written with >90% coverage
- Integration tests passing

Ready for agent and admin review."""
            
            # Submit the milestone
            try:
                cur.execute("""
                    UPDATE milestones
                    SET 
                        status = 'submitted',
                        proof_of_work_url = %s,
                        submission_notes = %s,
                        submitted_at = CURRENT_TIMESTAMP
                    WHERE milestone_id = %s
                    RETURNING milestone_id, status
                """, (proof_url, submission_notes, str(milestone_id)))
                
                result = cur.fetchone()
                
                if result:
                    logger.info(f"✅ Submitted: {grant_title[:40]:40} | M{milestone_num} | {milestone_title[:30]}")
                    submitted_count += 1
                else:
                    logger.warning(f"❌ Failed: {grant_title[:40]:40} | M{milestone_num}")
                    
            except Exception as e:
                logger.error(f"Error submitting milestone {milestone_id}: {e}")
        
        logger.info("=" * 80)
        logger.info(f"✅ Successfully submitted {submitted_count}/{len(active_milestones)} milestones")
        logger.info("\nThese milestones are now in 'submitted' status and will appear in:")
        logger.info("  - Admin Dashboard > Milestone Reviews panel")
        logger.info("  - Available for agent reviews")
        logger.info("  - Ready for admin approval/rejection")


if __name__ == "__main__":
    logger.info("Submitting active milestones for testing...")
    submit_active_milestones()
    logger.info("\nDone! Check the admin dashboard to see the submitted milestones.")

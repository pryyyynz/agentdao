"""
Script to trigger milestone creation for all approved grants that don't have milestones yet
"""

import sys
import os
import logging
import json
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config import get_settings
from utils.database import get_db_cursor
from repositories.milestone_repository import MilestonesRepository

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def extract_milestones_from_grant(grant: dict) -> list:
    """Extract milestone data from grant's detailed_proposal"""
    try:
        metadata = grant.get('metadata', {})
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        
        detailed_proposal = metadata.get('detailed_proposal')
        if not detailed_proposal:
            return []
        
        if isinstance(detailed_proposal, str):
            detailed_proposal = json.loads(detailed_proposal)
        
        milestones_data = detailed_proposal.get('milestones', [])
        return milestones_data if isinstance(milestones_data, list) else []
    
    except Exception as e:
        logger.error(f"Error extracting milestones: {e}")
        return []


def create_milestones_for_grant(grant: dict, milestones_data: list) -> int:
    """Create milestones for a grant"""
    try:
        grant_id = uuid.UUID(str(grant.get('grant_id')))
        milestones_repo = MilestonesRepository()
        
        requested_amount = float(grant.get('requested_amount', 0))
        milestone_records = []
        
        logger.info(f"Processing {len(milestones_data)} milestones for grant '{grant.get('title')}'")
        
        for idx, m in enumerate(milestones_data):
            funding_percentage = float(m.get('fundingPercentage', 0))
            amount = (requested_amount * funding_percentage) / 100
            duration_weeks = int(m.get('duration', 4))
            
            # Calculate estimated completion date
            cumulative_weeks = sum(int(milestones_data[i].get('duration', 4)) for i in range(idx + 1))
            estimated_date = datetime.now() + timedelta(weeks=cumulative_weeks)
            
            # Handle deliverables - can be string or list
            deliverables = m.get('deliverables', '')
            if isinstance(deliverables, str):
                deliverables = [d.strip() for d in deliverables.split('\n') if d.strip()]
            
            milestone_records.append({
                'milestone_number': idx + 1,
                'title': m.get('title', f'Milestone {idx + 1}'),
                'description': m.get('description', ''),
                'deliverables': deliverables,
                'amount': str(amount),
                'currency': 'ETH',
                'estimated_completion_date': estimated_date.strftime('%Y-%m-%d'),
                'status': 'active' if idx == 0 else 'pending'  # First milestone is active
            })
            
            logger.info(f"  Milestone {idx + 1}: {m.get('title')} - {amount:.4f} ETH ({funding_percentage}%)")
        
        # Create milestones
        created_milestones = milestones_repo.create_batch(grant_id, milestone_records)
        
        # Update grant with milestone info
        with get_db_cursor() as cursor:
            cursor.execute("""
                UPDATE grants 
                SET has_milestones = TRUE,
                    total_milestones = %s,
                    current_milestone = 1,
                    milestones_payment_model = 'sequential',
                    updated_at = CURRENT_TIMESTAMP
                WHERE grant_id = %s
            """, (len(milestone_records), str(grant_id)))
            cursor.connection.commit()
        
        logger.info(f"✅ Created {len(created_milestones)} milestones for grant '{grant.get('title')}'")
        return len(created_milestones)
    
    except Exception as e:
        logger.error(f"❌ Error creating milestones for grant '{grant.get('title')}': {e}", exc_info=True)
        return 0


def main():
    """Main function"""
    logger.info("=" * 80)
    logger.info("MILESTONE CREATION TRIGGER SCRIPT")
    logger.info("=" * 80)
    
    try:
        # Get all approved grants
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id,
                    grant_id,
                    title,
                    requested_amount,
                    status,
                    has_milestones,
                    total_milestones,
                    metadata
                FROM grants
                WHERE status = 'approved'
                ORDER BY created_at DESC
            """)
            
            approved_grants = cursor.fetchall()
        
        if not approved_grants:
            logger.info("No approved grants found")
            return
        
        logger.info(f"\nFound {len(approved_grants)} approved grant(s)")
        logger.info("-" * 80)
        
        total_created = 0
        grants_processed = 0
        grants_skipped = 0
        
        for grant in approved_grants:
            logger.info(f"\nGrant: {grant.get('title')}")
            logger.info(f"  ID: {grant.get('grant_id')}")
            logger.info(f"  Amount: {grant.get('requested_amount')} ETH")
            logger.info(f"  Has Milestones: {grant.get('has_milestones', False)}")
            
            # Skip if already has milestones created
            if grant.get('has_milestones') and grant.get('total_milestones', 0) > 0:
                # Check if milestones actually exist in DB
                with get_db_cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(*) as count
                        FROM milestones
                        WHERE grant_id = %s
                    """, (str(grant.get('grant_id')),))
                    result = cursor.fetchone()
                    
                    if result.get('count', 0) > 0:
                        logger.info(f"  ⏭️  Skipping - already has {result.get('count')} milestone(s)")
                        grants_skipped += 1
                        continue
            
            # Extract milestones from detailed_proposal
            milestones_data = extract_milestones_from_grant(grant)
            
            if not milestones_data:
                logger.info("  ⏭️  Skipping - no milestones in detailed_proposal")
                grants_skipped += 1
                continue
            
            # Create milestones
            created_count = create_milestones_for_grant(grant, milestones_data)
            if created_count > 0:
                total_created += created_count
                grants_processed += 1
        
        logger.info("\n" + "=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total approved grants: {len(approved_grants)}")
        logger.info(f"Grants processed: {grants_processed}")
        logger.info(f"Grants skipped: {grants_skipped}")
        logger.info(f"Total milestones created: {total_created}")
        logger.info("=" * 80)
        
        if grants_processed > 0:
            logger.info("\n✅ Milestone creation completed successfully!")
            logger.info("You can now view the milestones in the grants page.")
        else:
            logger.info("\nℹ️  No new milestones created (all grants either have milestones or no milestone data)")
    
    except Exception as e:
        logger.error(f"Error in main: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

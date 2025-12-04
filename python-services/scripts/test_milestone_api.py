"""
Test milestone API endpoint to see what data is being returned
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from repositories.milestone_repository import MilestonesRepository
from repositories.grants_repository import GrantsRepository
import json

# Get a grant with milestones
grants_repo = GrantsRepository()
grants = grants_repo.get_all()

print("Testing Milestone API Data:\n")

for grant in grants:
    if grant.get('has_milestones'):
        grant_id = grant.get('grant_id')
        print(f"Grant: {grant.get('title', 'N/A')[:50]}")
        print(f"  grant_id (UUID): {grant_id}")
        print(f"  id (int): {grant.get('id')}")
        
        # Test what the API would return
        milestones = MilestonesRepository.get_by_grant(grant_id)
        progress = MilestonesRepository.get_progress_summary(grant_id)
        
        print(f"  Milestones count: {len(milestones) if milestones else 0}")
        print(f"  Progress: {progress}")
        
        if milestones:
            print(f"  First milestone: {milestones[0].get('title')[:40]} - Status: {milestones[0].get('status')}")
        
        print()
        break  # Just test the first one

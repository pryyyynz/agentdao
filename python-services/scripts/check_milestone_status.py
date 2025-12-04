"""
Quick script to check milestone status values in database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from repositories.milestone_repository import MilestonesRepository
from repositories.grants_repository import GrantsRepository
import json

# Get all grants
grants_repo = GrantsRepository()
grants = grants_repo.get_all()

print(f"Found {len(grants)} grants\n")

for grant in grants:
    grant_id = grant.get('grant_id')
    milestones = MilestonesRepository.get_by_grant(grant_id)
    
    if milestones:
        print(f"Grant: {grant.get('title', 'N/A')[:50]}")
        print(f"  ID: {grant_id}")
        print(f"  Has Milestones: {grant.get('has_milestones', False)}")
        print(f"  Milestones Count: {len(milestones)}")
        
        for m in milestones:
            print(f"    M{m.get('milestone_number')}: {m.get('title', 'N/A')[:40]} - Status: {m.get('status')}")
        print()

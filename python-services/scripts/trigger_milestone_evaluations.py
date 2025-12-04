"""
Trigger agent evaluations for all submitted milestones that don't have reviews yet.
"""
import asyncio
import sys
import os
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv()

from services.milestone_evaluator import get_milestone_evaluator

DATABASE_URL = os.getenv('DATABASE_URL')


def get_db_connection():
    """Create database connection"""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable not set")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)


async def trigger_evaluations():
    """Find submitted milestones without agent reviews and trigger evaluations."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Find submitted milestones without agent reviews
        cur.execute("""
            SELECT m.milestone_id, m.title, m.grant_id
            FROM milestones m
            WHERE m.status = 'submitted'
            AND NOT EXISTS (
                SELECT 1 FROM agent_milestone_reviews amr
                WHERE amr.milestone_id = m.milestone_id
            )
            ORDER BY m.created_at DESC
        """)
        
        milestones = cur.fetchall()
        
        if not milestones:
            print("✅ No submitted milestones need evaluation (all have reviews or none submitted)")
            return
        
        print(f"Found {len(milestones)} submitted milestone(s) without agent reviews:\n")
        
        evaluator = get_milestone_evaluator()
        
        for milestone_id, title, grant_id in milestones:
            print(f"📝 Milestone: {title}")
            print(f"   ID: {milestone_id}")
            print(f"   Grant ID: {grant_id}")
            print(f"   Triggering evaluation...")
            
            try:
                await evaluator.evaluate_milestone(milestone_id)
                print(f"   ✅ Evaluation completed\n")
            except Exception as e:
                print(f"   ❌ Error: {str(e)}\n")
                continue
        
        print(f"\n✅ Triggered evaluations for {len(milestones)} milestone(s)")
        
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    print("🤖 Triggering agent evaluations for submitted milestones...\n")
    asyncio.run(trigger_evaluations())

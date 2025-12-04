import psycopg2
import os
import json
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

grant_uuid = '95450a81-06f2-4b79-a960-d15a414f05a3'

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

try:
    # Get grant data
    cur.execute("""
        SELECT id, grant_id, requested_amount, metadata
        FROM grants 
        WHERE grant_id = %s
    """, (grant_uuid,))
    
    grant = cur.fetchone()
    if not grant:
        print("Grant not found!")
        exit(1)
    
    grant_id_int, grant_uuid_str, requested_amount, metadata = grant
    print(f"Found grant: {grant_id_int} / {grant_uuid_str}")
    print(f"Requested amount: {requested_amount}")
    
    # Parse metadata
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    
    detailed_proposal = metadata.get('detailed_proposal')
    if not detailed_proposal:
        print("No detailed_proposal in metadata!")
        exit(1)
    
    if isinstance(detailed_proposal, str):
        detailed_proposal = json.loads(detailed_proposal)
    
    milestones_data = detailed_proposal.get('milestones', [])
    print(f"\nFound {len(milestones_data)} milestones in proposal")
    
    if not milestones_data:
        print("No milestones data!")
        exit(1)
    
    # Create milestones
    project_start_date = datetime.now()
    requested_amount_float = float(requested_amount)
    
    for idx, m in enumerate(milestones_data):
        funding_percentage = float(m.get('fundingPercentage', 0))
        amount = (requested_amount_float * funding_percentage) / 100
        duration_weeks = int(m.get('duration', 4))
        
        # Calculate estimated completion date
        cumulative_weeks = sum(int(milestones_data[i].get('duration', 4)) for i in range(idx + 1))
        estimated_date = project_start_date + timedelta(weeks=cumulative_weeks)
        
        title = m.get('title', f'Milestone {idx + 1}')
        description = m.get('description', '')
        deliverables_raw = m.get('deliverables', '')
        
        # Handle deliverables
        if isinstance(deliverables_raw, str):
            deliverables = [d.strip() for d in deliverables_raw.split('\\n') if d.strip()]
        else:
            deliverables = deliverables_raw
        
        status = 'in_progress' if idx == 0 else 'pending'
        
        print(f"\n  Creating Milestone {idx + 1}: {title}")
        print(f"    Amount: {amount:.2f} ETH ({funding_percentage}%)")
        print(f"    Status: {status}")
        print(f"    Estimated completion: {estimated_date.strftime('%Y-%m-%d')}")
        
        # Insert milestone
        cur.execute("""
            INSERT INTO milestones (
                grant_id, milestone_number, title, description, deliverables,
                amount, currency, estimated_completion_date, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING milestone_id
        """, (
            grant_uuid_str,
            idx + 1,
            title,
            description,
            deliverables,  # Pass as list, psycopg2 will convert to PostgreSQL array
            str(amount),
            'ETH',
            estimated_date.strftime('%Y-%m-%d'),
            status
        ))
        
        milestone_id = cur.fetchone()[0]
        print(f"    Created with ID: {milestone_id}")
    
    # Update grant with milestone info
    cur.execute("""
        UPDATE grants 
        SET has_milestones = TRUE,
            total_milestones = %s,
            current_milestone = 1,
            milestones_payment_model = 'sequential'
        WHERE grant_id = %s
    """, (len(milestones_data), grant_uuid_str))
    
    conn.commit()
    print(f"\n✅ Successfully created {len(milestones_data)} milestones and updated grant")
    
except Exception as e:
    conn.rollback()
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    cur.close()
    conn.close()

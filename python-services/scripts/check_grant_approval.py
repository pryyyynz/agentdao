import psycopg2
import os
import json
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

grant_uuid = '95450a81-06f2-4b79-a960-d15a414f05a3'

print("=== Checking Admin Action Log ===")
try:
    cur.execute("""
        SELECT action_type, action_details, admin_user
        FROM admin_action_log 
        WHERE target_id = %s
        ORDER BY id DESC 
        LIMIT 10
    """, (grant_uuid,))

    rows = cur.fetchall()
    print(f"Found {len(rows)} admin actions for this grant")
    for row in rows:
        print(f"\n{row[0]} by {row[2]}")
        print(f"Details: {row[1]}")
except Exception as e:
    print(f"Could not query admin_action_log: {e}")

print("\n=== Checking Grant Status ===")
cur.execute("""
    SELECT id, grant_id, title, status, has_milestones, total_milestones, 
           created_at, updated_at
    FROM grants 
    WHERE grant_id = %s
""", (grant_uuid,))

grant = cur.fetchone()
if grant:
    print(f"Grant ID: {grant[0]}")
    print(f"Grant UUID: {grant[1]}")
    print(f"Title: {grant[2]}")
    print(f"Status: {grant[3]}")
    print(f"Has Milestones: {grant[4]}")
    print(f"Total Milestones: {grant[5]}")
    print(f"Created: {grant[6]}")
    print(f"Updated: {grant[7]}")

print("\n=== Checking if Milestones Exist ===")
cur.execute("""
    SELECT milestone_id, milestone_number, title, status, amount
    FROM milestones 
    WHERE grant_id = %s
    ORDER BY milestone_number
""", (grant_uuid,))

milestones = cur.fetchall()
print(f"Found {len(milestones)} milestones")
for m in milestones:
    print(f"  Milestone {m[1]}: {m[2]} - {m[3]} ({m[4]} ETH)")

cur.close()
conn.close()

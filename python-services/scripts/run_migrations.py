"""
Database Migration Runner for AgentDAO
Runs SQL migration files against PostgreSQL database
"""

import os
import sys
from pathlib import Path
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
MIGRATIONS_DIR = Path(__file__).parent.parent.parent / 'database' / 'migrations'


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


def create_migrations_table(conn):
    """Create table to track applied migrations"""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                version VARCHAR(50) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        """)
    conn.commit()
    print("✅ Migrations tracking table ready")


def get_applied_migrations(conn):
    """Get list of already applied migrations"""
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM schema_migrations ORDER BY version")
        return {row[0] for row in cur.fetchall()}


def get_pending_migrations(applied):
    """Get list of migrations to apply"""
    if not MIGRATIONS_DIR.exists():
        print(f"❌ Migrations directory not found: {MIGRATIONS_DIR}")
        return []
    
    all_migrations = sorted([
        f for f in MIGRATIONS_DIR.glob('*.sql')
        if not f.name.endswith('_down.sql')
    ])
    
    pending = [
        m for m in all_migrations
        if m.stem not in applied
    ]
    
    return pending


def apply_migration(conn, migration_file):
    """Apply a single migration file"""
    version = migration_file.stem
    
    print(f"\n📦 Applying migration: {version}")
    
    try:
        # Read migration SQL
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Execute migration
        with conn.cursor() as cur:
            cur.execute(sql_content)
        
        # Record migration
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO schema_migrations (version, description) VALUES (%s, %s)",
                (version, f"Migration {version}")
            )
        
        conn.commit()
        print(f"✅ Successfully applied: {version}")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Failed to apply migration {version}: {e}")
        return False


def rollback_migration(conn, version):
    """Rollback a specific migration"""
    down_file = MIGRATIONS_DIR / f"{version}_down.sql"
    
    if not down_file.exists():
        print(f"❌ Rollback file not found: {down_file}")
        return False
    
    print(f"\n🔄 Rolling back migration: {version}")
    
    try:
        # Read rollback SQL
        with open(down_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Execute rollback
        with conn.cursor() as cur:
            cur.execute(sql_content)
        
        # Remove from migrations table
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM schema_migrations WHERE version = %s",
                (version,)
            )
        
        conn.commit()
        print(f"✅ Successfully rolled back: {version}")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Failed to rollback migration {version}: {e}")
        return False


def run_migrations():
    """Run all pending migrations"""
    print("🚀 Starting database migrations...\n")
    
    conn = get_db_connection()
    
    try:
        # Ensure migrations table exists
        create_migrations_table(conn)
        
        # Get applied and pending migrations
        applied = get_applied_migrations(conn)
        pending = get_pending_migrations(applied)
        
        if not pending:
            print("✨ No pending migrations. Database is up to date!")
            return
        
        print(f"📋 Found {len(pending)} pending migration(s):\n")
        for m in pending:
            print(f"   - {m.stem}")
        
        # Apply each migration
        success_count = 0
        for migration in pending:
            if apply_migration(conn, migration):
                success_count += 1
            else:
                print("\n❌ Migration failed. Stopping.")
                break
        
        print(f"\n✨ Successfully applied {success_count}/{len(pending)} migrations")
        
    finally:
        conn.close()


def rollback_last():
    """Rollback the last applied migration"""
    print("🔄 Rolling back last migration...\n")
    
    conn = get_db_connection()
    
    try:
        create_migrations_table(conn)
        
        # Get last applied migration
        with conn.cursor() as cur:
            cur.execute("""
                SELECT version FROM schema_migrations 
                ORDER BY applied_at DESC 
                LIMIT 1
            """)
            result = cur.fetchone()
        
        if not result:
            print("ℹ️  No migrations to rollback")
            return
        
        version = result[0]
        rollback_migration(conn, version)
        
    finally:
        conn.close()


def show_status():
    """Show migration status"""
    print("📊 Migration Status\n")
    
    conn = get_db_connection()
    
    try:
        create_migrations_table(conn)
        
        # Get applied migrations
        with conn.cursor() as cur:
            cur.execute("""
                SELECT version, applied_at 
                FROM schema_migrations 
                ORDER BY applied_at
            """)
            applied = cur.fetchall()
        
        if applied:
            print("Applied migrations:")
            for version, applied_at in applied:
                print(f"  ✅ {version} (applied: {applied_at})")
        else:
            print("  No migrations applied yet")
        
        # Get pending migrations
        applied_versions = {v for v, _ in applied}
        pending = get_pending_migrations(applied_versions)
        
        if pending:
            print("\nPending migrations:")
            for migration in pending:
                print(f"  ⏳ {migration.stem}")
        else:
            print("\n✨ All migrations applied!")
        
    finally:
        conn.close()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python run_migrations.py up       - Apply pending migrations")
        print("  python run_migrations.py down     - Rollback last migration")
        print("  python run_migrations.py status   - Show migration status")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'up':
        run_migrations()
    elif command == 'down':
        rollback_last()
    elif command == 'status':
        show_status()
    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)

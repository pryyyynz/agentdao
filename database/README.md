# Grantify Database

PostgreSQL 15+ database schema for grant management, AI agent evaluations, and milestone tracking.

---

## 🗄️ Database Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Core Tables                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  grants                    evaluations                      │
│  ├─ id (PK)               ├─ id (PK)                       │
│  ├─ grant_id (UUID)       ├─ grant_id (FK → grants)       │
│  ├─ title                 ├─ agent_name                    │
│  ├─ status                ├─ score (0-100)                 │
│  ├─ requested_amount      ├─ vote (approve/reject)        │
│  ├─ applicant_address     ├─ summary                       │
│  ├─ overall_score         ├─ detailed_analysis (JSONB)    │
│  └─ metadata (JSONB)      └─ strengths/weaknesses         │
│                                                              │
│  milestones               agent_reputation                 │
│  ├─ id (PK)               ├─ id (PK)                       │
│  ├─ grant_id (FK)         ├─ agent_name                    │
│  ├─ milestone_number      ├─ total_evaluations            │
│  ├─ amount                ├─ accuracy_score                │
│  ├─ status                ├─ average_response_time         │
│  └─ deliverables[]        └─ uptime_percentage            │
│                                                              │
│  agent_activity_log       users                            │
│  ├─ id (PK)               ├─ id (PK)                       │
│  ├─ agent_name            ├─ email                         │
│  ├─ grant_id (FK)         ├─ wallet_address               │
│  ├─ activity_type         ├─ is_verified                  │
│  └─ timestamp             └─ created_at                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Setup

### Prerequisites

- PostgreSQL 15 or higher
- `psql` command-line tool
- Database user with CREATE privileges

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE grantify;

# Create user (optional)
CREATE USER grantify_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE grantify TO grantify_user;
```

### Initialize Schema

```bash
# Run main schema
psql -U grantify_user -d grantify -f database/schema.sql

# Or via connection string
psql postgresql://grantify_user:password@localhost:5432/grantify -f database/schema.sql
```

### Run Migrations

Execute migrations in order:

```bash
cd database

# Initial schema
psql -d grantify -f migrations/001_initial_schema.sql

# Admin controls
psql -d grantify -f migrations/002_admin_controls.sql

# User authentication
psql -d grantify -f migrations/003_add_user_authentication.sql

# System activity types
psql -d grantify -f migrations/004_add_system_activity_types.sql

# Milestones
psql -d grantify -f migrations/005_add_milestones.sql

# Review system
psql -d grantify -f migrations/006_add_review_system.sql

# Under review status
psql -d grantify -f migrations/007_add_under_review_status.sql
```

### Using Python Migration Scripts

For complex migrations with data validation:

```bash
cd database

# Run with Python
python run_migration.py          # Main migration runner
python run_auth_migration.py     # Authentication setup
python run_milestone_migration.py # Milestones with validation
python run_review_migration.py   # Review system

# Check migration status
python check_migration_status.py
```

---

## 📊 Schema Overview

### 1. Grants Table

**Purpose:** Stores all grant proposals and their lifecycle.

**Key Columns:**
- `grant_id` (UUID) - Unique identifier
- `title`, `description` - Proposal details
- `requested_amount` - Funding amount (ETH)
- `applicant_address` - Ethereum wallet
- `status` - Workflow state
- `overall_score` - Aggregated evaluation score (0-100)
- `ipfs_hash` - Full proposal storage
- `on_chain_id` - Smart contract reference
- `metadata` (JSONB) - Flexible additional data

**Status Flow:**
```
pending → under_evaluation → approved/rejected
                               ↓
approved → active → completed
```

**Indexes:**
- `grant_id` (unique)
- `status`, `applicant_address`, `created_at`, `on_chain_id`

### 2. Evaluations Table

**Purpose:** Individual agent assessments for each grant.

**Key Columns:**
- `grant_id` (FK) - References grants
- `agent_name` - Agent type (technical, impact, due_diligence, budget, community)
- `score` (0-100) - Numeric assessment
- `vote` - Decision (approve/reject/abstain/conditional)
- `confidence` (0-100) - Agent's confidence level
- `summary` - Brief evaluation text
- `detailed_analysis` (JSONB) - Structured analysis
- `strengths`, `weaknesses`, `recommendations` - Text arrays
- `on_chain_vote_tx` - Blockchain vote transaction

**Agent Types:**
- `technical` - Code quality, feasibility
- `impact` - Social impact, alignment
- `due_diligence` - Team verification, risk
- `budget` - Financial planning
- `community` - Community feedback

**Unique Constraint:** One evaluation per (grant_id, agent_name)

### 3. Milestones Table

**Purpose:** Tracks milestone-based fund releases.

**Key Columns:**
- `grant_id` (FK)
- `milestone_number` - Sequential number
- `amount` - Partial funding amount
- `status` - Progress state
- `deliverables`, `success_criteria` - Arrays
- `due_date`, `submitted_at`, `released_at` - Timestamps

**Status Flow:**
```
pending → in_progress → submitted → approved → completed
                          ↓           ↓
                      (rejected)  (funds released)
```

### 4. Agent Reputation Table

**Purpose:** Performance metrics for AI agents.

**Key Columns:**
- `agent_name` - Unique identifier
- `total_evaluations` - Count of evaluations
- `accuracy_score` - Alignment with consensus (0-100)
- `average_response_time_seconds` - Performance metric
- `total_approvals/rejections` - Vote distribution
- `uptime_percentage` - Reliability (0-100)
- `is_active`, `is_suspended` - Status flags

**Metrics Tracked:**
- Evaluation success rate
- Voting behavior patterns
- Response time statistics
- Uptime and reliability

### 5. Agent Activity Log Table

**Purpose:** Audit trail of all agent actions.

**Key Columns:**
- `agent_name` - Agent identifier
- `grant_id` (FK) - Related grant
- `activity_type` - Event type
- `timestamp` - Event time
- `details` (JSONB) - Additional context

**Activity Types:**
- `evaluation_started`
- `evaluation_completed`
- `vote_submitted`
- `error_occurred`
- `status_changed`

**Retention:** Logs stored indefinitely for compliance.

### 6. Users Table

**Purpose:** User authentication and profile management.

**Key Columns:**
- `email` - Unique email address
- `wallet_address` - Ethereum address (optional)
- `is_verified` - Email verification status
- `otp_secret` - One-time password secret
- `last_login_at` - Session tracking

---

## 🔄 Database Migrations

### Migration Files

Located in `database/migrations/`:

| File | Purpose | Status |
|------|---------|--------|
| `001_initial_schema.sql` | Base schema | Required |
| `002_admin_controls.sql` | Admin features | Optional |
| `003_add_user_authentication.sql` | User auth | Recommended |
| `004_add_system_activity_types.sql` | Activity types | Recommended |
| `005_add_milestones.sql` | Milestone tracking | Required |
| `006_add_review_system.sql` | Review workflow | Optional |
| `007_add_under_review_status.sql` | Status update | Recommended |

### Migration Helpers

**Python Scripts:**
- `run_migration.py` - Main migration executor
- `check_migration_status.py` - Verify applied migrations
- `check_constraints.py` - Validate data integrity
- `check_milestones_columns.py` - Verify milestone schema

**SQL Fixes:**
- `fix_admin_decision_trigger.sql` - Repair trigger issues
- `fix_agent_review_trigger.sql` - Fix review triggers

### Rollback Migrations

```bash
# Down migrations (when available)
psql -d grantify -f migrations/001_initial_schema_down.sql
psql -d grantify -f migrations/005_add_milestones_down.sql
```

---

## 🔧 Maintenance

### Backup Database

```bash
# Full backup
pg_dump -U grantify_user grantify > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump -U grantify_user --schema-only grantify > schema_backup.sql

# Data only
pg_dump -U grantify_user --data-only grantify > data_backup.sql
```

### Restore Database

```bash
# Restore from backup
psql -U grantify_user -d grantify < backup_20250128.sql
```

### Vacuum & Analyze

```sql
-- Optimize database
VACUUM ANALYZE grants;
VACUUM ANALYZE evaluations;
VACUUM ANALYZE milestones;

-- Full vacuum (requires downtime)
VACUUM FULL;
```

### Check Database Size

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('grantify'));

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🔍 Useful Queries

### Grant Statistics

```sql
-- Grants by status
SELECT status, COUNT(*) as count
FROM grants
GROUP BY status
ORDER BY count DESC;

-- Average evaluation scores
SELECT
    AVG(overall_score) as avg_score,
    MIN(overall_score) as min_score,
    MAX(overall_score) as max_score
FROM grants
WHERE overall_score IS NOT NULL;

-- Recent grants
SELECT grant_id, title, status, created_at
FROM grants
ORDER BY created_at DESC
LIMIT 10;
```

### Agent Performance

```sql
-- Agent evaluation counts
SELECT agent_name, COUNT(*) as evaluations
FROM evaluations
GROUP BY agent_name
ORDER BY evaluations DESC;

-- Agent reputation summary
SELECT
    agent_name,
    accuracy_score,
    total_evaluations,
    average_response_time_seconds,
    uptime_percentage
FROM agent_reputation
WHERE is_active = TRUE
ORDER BY accuracy_score DESC;

-- Recent agent activity
SELECT
    agent_name,
    activity_type,
    timestamp
FROM agent_activity_log
ORDER BY timestamp DESC
LIMIT 20;
```

### Milestone Tracking

```sql
-- Milestones by status
SELECT status, COUNT(*) as count, SUM(amount) as total_amount
FROM milestones
GROUP BY status;

-- Overdue milestones
SELECT
    m.milestone_id,
    g.title,
    m.milestone_number,
    m.due_date
FROM milestones m
JOIN grants g ON m.grant_id = g.grant_id
WHERE m.due_date < NOW() AND m.status NOT IN ('completed', 'cancelled')
ORDER BY m.due_date;
```

---

## 🛡️ Security

### Database Roles

```sql
-- Create read-only role
CREATE ROLE grantify_readonly;
GRANT CONNECT ON DATABASE grantify TO grantify_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grantify_readonly;

-- Create application role
CREATE ROLE grantify_app;
GRANT CONNECT ON DATABASE grantify TO grantify_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO grantify_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO grantify_app;
```

### Row-Level Security (Optional)

```sql
-- Enable RLS on grants table
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own grants
CREATE POLICY user_grants ON grants
    FOR SELECT
    USING (applicant_address = current_setting('app.current_user_address'));
```

### Sensitive Data

**PII Storage:**
- Email addresses encrypted at application layer
- Wallet addresses are public (blockchain)
- No passwords stored (OTP-based auth)

**Audit Trail:**
- All changes logged in `agent_activity_log`
- Timestamps on all tables
- Metadata JSONB for additional context

---

## 🐛 Troubleshooting

### Connection Issues

```bash
# Test connection
psql -U grantify_user -d grantify -c "SELECT 1"

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check port
sudo netstat -tlnp | grep 5432
```

### Migration Failures

```bash
# Check which migrations have run
python database/check_migration_status.py

# Verify constraints
python database/check_constraints.py

# Kill active connections (if needed)
python database/kill_connections.py
```

### Performance Issues

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Missing indexes
SELECT schemaname, tablename, attname, n_distinct
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 1000;
```

---

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JSONB Data Type](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Database Best Practices](https://wiki.postgresql.org/wiki/Don't_Do_This)

---

## 📞 Support

Database issues?
- Check connection: `psql -d grantify -c "SELECT version()"`
- Review logs: `/var/log/postgresql/`
- Run diagnostics: `python database/check_migration_status.py`
- Open [GitHub Issue](https://github.com/pryyyynz/agentdao/issues)
- Email: dugboryeleprince@gmail.com
-- Migration: 001 - Initial Schema Rollback
-- Description: Drop all tables, views, functions, and triggers
-- Created: January 2025

-- Drop views
DROP VIEW IF EXISTS agent_performance;
DROP VIEW IF EXISTS grant_summary;

-- Drop triggers
DROP TRIGGER IF EXISTS log_evaluation_completion_trigger ON evaluations;
DROP TRIGGER IF EXISTS update_agent_reputation_updated_at ON agent_reputation;
DROP TRIGGER IF EXISTS update_grants_updated_at ON grants;

-- Drop functions
DROP FUNCTION IF EXISTS log_evaluation_completion();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS agent_activity_log;
DROP TABLE IF EXISTS agent_reputation;
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS grants;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";

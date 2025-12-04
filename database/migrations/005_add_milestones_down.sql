-- Migration 005 Rollback: Remove Milestones Support
-- This script reverses the changes made in 005_add_milestones.sql

-- Drop views
DROP VIEW IF EXISTS milestone_progress_summary;

-- Drop triggers
DROP TRIGGER IF EXISTS milestone_activity_logger ON milestones;
DROP TRIGGER IF EXISTS milestone_approved_activate_next ON milestones;
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;

-- Drop functions
DROP FUNCTION IF EXISTS log_milestone_submission();
DROP FUNCTION IF EXISTS activate_next_milestone();

-- Restore original activity_type constraint
ALTER TABLE agent_activity_log DROP CONSTRAINT IF EXISTS agent_activity_log_activity_type_check;

ALTER TABLE agent_activity_log 
ADD CONSTRAINT agent_activity_log_activity_type_check CHECK (
    activity_type IN (
        'evaluation_started',
        'evaluation_completed',
        'evaluation_failed',
        'vote_cast',
        'message_sent',
        'message_received',
        'milestone_reviewed',
        'error_encountered',
        'consensus_reached',
        'fund_release_approved',
        'grant_created',
        'grant_updated',
        'agent_initialized',
        'agent_shutdown'
    )
);

-- Drop milestones table
DROP TABLE IF EXISTS milestones CASCADE;

-- Remove milestone columns from grants table
ALTER TABLE grants 
DROP COLUMN IF EXISTS milestones_payment_model,
DROP COLUMN IF EXISTS current_milestone,
DROP COLUMN IF EXISTS total_milestones,
DROP COLUMN IF EXISTS has_milestones;

-- Migration rollback complete

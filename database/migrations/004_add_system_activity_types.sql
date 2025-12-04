-- Migration: Add system control activity types to agent_activity_log
-- Purpose: Allow emergency controls (pause, resume, emergency stop) to be logged
-- Date: 2024-12-03

-- Drop existing constraint
ALTER TABLE agent_activity_log 
DROP CONSTRAINT IF EXISTS agent_activity_log_activity_type_check;

-- Add new constraint with additional system control types
ALTER TABLE agent_activity_log
ADD CONSTRAINT agent_activity_log_activity_type_check CHECK (
    activity_type IN (
        -- Existing evaluation activities
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
        'agent_shutdown',
        -- New system control activities
        'system_paused',
        'system_resumed',
        'emergency_stop_activated',
        'emergency_stop_deactivated',
        'agent_status_changed',
        'agent_weight_updated',
        'system_config_updated',
        'emergency_withdrawal',
        'emergency_withdrawal_requested',
        'emergency_withdrawal_approved',
        'emergency_withdrawal_rejected',
        'emergency_withdrawal_executed'
    )
);

-- Verify constraint was added
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'agent_activity_log_activity_type_check';

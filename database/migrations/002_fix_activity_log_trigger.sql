-- Migration: Fix activity log trigger to work with INSERT and UPDATE
-- Date: 2025-11-18
-- Issue: Activity logs weren't being created because trigger only fires on UPDATE with specific condition

-- Description:
-- The original trigger only logged activities when completed_at changed from NULL to a timestamp
-- during an UPDATE. However, the upsert pattern sets completed_at on INSERT, so the trigger
-- never fired. This migration fixes the trigger to work with both INSERT and UPDATE operations.

BEGIN;

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS log_evaluation_completion_trigger ON evaluations;
DROP FUNCTION IF EXISTS log_evaluation_completion();

-- Create improved function that handles both INSERT and UPDATE
CREATE OR REPLACE FUNCTION log_evaluation_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT: Log if completed_at is set
    IF (TG_OP = 'INSERT' AND NEW.completed_at IS NOT NULL) THEN
        INSERT INTO agent_activity_log (
            agent_name,
            grant_id,
            activity_type,
            action,
            details,
            success,
            duration_ms
        ) VALUES (
            NEW.agent_name,
            NEW.grant_id,
            'evaluation_completed',
            'Agent completed evaluation for grant',
            jsonb_build_object(
                'score', NEW.score,
                'vote', NEW.vote,
                'confidence', NEW.confidence,
                'evaluation_id', NEW.evaluation_id
            ),
            TRUE,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
        );
    END IF;
    
    -- For UPDATE: Log if completed_at changed from NULL to a timestamp
    IF (TG_OP = 'UPDATE' AND NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL) THEN
        INSERT INTO agent_activity_log (
            agent_name,
            grant_id,
            activity_type,
            action,
            details,
            success,
            duration_ms
        ) VALUES (
            NEW.agent_name,
            NEW.grant_id,
            'evaluation_completed',
            'Agent completed evaluation for grant',
            jsonb_build_object(
                'score', NEW.score,
                'vote', NEW.vote,
                'confidence', NEW.confidence,
                'evaluation_id', NEW.evaluation_id
            ),
            TRUE,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER log_evaluation_completion_trigger
    AFTER INSERT OR UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION log_evaluation_completion();

-- Verify the trigger was created correctly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'log_evaluation_completion_trigger'
    ) THEN
        RAISE NOTICE 'Migration successful: activity log trigger updated for INSERT and UPDATE';
    ELSE
        RAISE EXCEPTION 'Migration failed: trigger not found';
    END IF;
END $$;

COMMIT;

-- Optional: Backfill activity logs for existing completed evaluations
-- This will create activity logs for evaluations that were completed before this fix
-- Uncomment to run after migration:

-- INSERT INTO agent_activity_log (
--     agent_name,
--     grant_id,
--     activity_type,
--     action,
--     details,
--     success,
--     duration_ms,
--     timestamp
-- )
-- SELECT 
--     agent_name,
--     grant_id,
--     'evaluation_completed' as activity_type,
--     'Agent completed evaluation for grant' as action,
--     jsonb_build_object(
--         'score', score,
--         'vote', vote,
--         'confidence', confidence,
--         'evaluation_id', evaluation_id,
--         'backfilled', true
--     ) as details,
--     TRUE as success,
--     EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 as duration_ms,
--     completed_at as timestamp
-- FROM evaluations
-- WHERE completed_at IS NOT NULL
-- AND NOT EXISTS (
--     SELECT 1 FROM agent_activity_log 
--     WHERE agent_activity_log.grant_id = evaluations.grant_id
--     AND agent_activity_log.agent_name = evaluations.agent_name
--     AND agent_activity_log.activity_type = 'evaluation_completed'
-- );

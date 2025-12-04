-- Fix log_agent_review_activity trigger
-- The agent_activity_log table uses agent_name, not agent_id
-- And uses 'details' and 'action' columns

DROP TRIGGER IF EXISTS trigger_log_agent_review ON agent_milestone_reviews;
DROP FUNCTION IF EXISTS log_agent_review_activity();

CREATE OR REPLACE FUNCTION log_agent_review_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_grant_id UUID;
BEGIN
    -- Get grant_id from milestone
    SELECT grant_id INTO v_grant_id
    FROM milestones
    WHERE milestone_id = NEW.milestone_id;
    
    -- Log the activity (using correct column names for agent_activity_log)
    INSERT INTO agent_activity_log (
        grant_id,
        agent_name,
        activity_type,
        action,
        details,
        timestamp
    ) VALUES (
        v_grant_id,
        NEW.agent_name,
        'milestone_reviewed',
        'Agent reviewed milestone: ' || NEW.recommendation,
        jsonb_build_object(
            'milestone_id', NEW.milestone_id,
            'agent_id', NEW.agent_id,
            'recommendation', NEW.recommendation,
            'review_score', NEW.review_score,
            'confidence_score', NEW.confidence_score
        ),
        NEW.reviewed_at
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_agent_review
    AFTER INSERT ON agent_milestone_reviews
    FOR EACH ROW
    EXECUTE FUNCTION log_agent_review_activity();

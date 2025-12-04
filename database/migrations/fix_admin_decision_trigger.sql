-- Fix admin decision trigger to use correct milestone status values

DROP TRIGGER IF EXISTS trigger_admin_decision ON admin_milestone_decisions;
DROP FUNCTION IF EXISTS update_milestone_on_admin_decision();

CREATE OR REPLACE FUNCTION update_milestone_on_admin_decision()
RETURNS TRIGGER AS $$
DECLARE
    v_milestone_status VARCHAR(50);
BEGIN
    -- Map admin decision to milestone status
    CASE NEW.decision
        WHEN 'approved' THEN
            v_milestone_status := 'approved';
        WHEN 'rejected' THEN
            v_milestone_status := 'rejected';
        WHEN 'revision_requested' THEN
            v_milestone_status := 'in_progress';  -- Set back to in_progress for revision
        ELSE
            v_milestone_status := 'submitted';
    END CASE;
    
    -- Update milestone with admin decision
    UPDATE milestones
    SET 
        status = v_milestone_status,
        admin_reviewed = TRUE,
        admin_decision_id = NEW.decision_id,
        reviewed_at = NEW.decided_at,
        reviewed_by = NEW.admin_email,
        reviewer_feedback = NEW.admin_feedback,
        updated_at = CURRENT_TIMESTAMP
    WHERE milestone_id = NEW.milestone_id;
    
    -- If approved and next milestone exists, activate it
    IF NEW.decision = 'approved' THEN
        UPDATE milestones
        SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
        WHERE grant_id = (SELECT grant_id FROM milestones WHERE milestone_id = NEW.milestone_id)
          AND milestone_number = (
              SELECT milestone_number + 1 
              FROM milestones 
              WHERE milestone_id = NEW.milestone_id
          )
          AND status = 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_decision
    AFTER INSERT OR UPDATE ON admin_milestone_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_on_admin_decision();

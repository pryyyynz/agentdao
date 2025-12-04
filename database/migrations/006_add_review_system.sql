-- Migration 006: Agent Reviews and Admin Decision System
-- Phase 4: Add agent evaluation and admin final decision for milestones

-- ============================================================================
-- UPDATE MILESTONES TABLE FIRST
-- ============================================================================

-- Add fields for tracking review process
ALTER TABLE milestones
ADD COLUMN IF NOT EXISTS agent_reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_reviews_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_decision_id UUID;

CREATE INDEX IF NOT EXISTS idx_milestones_agent_reviews_complete ON milestones(agent_reviews_complete);
CREATE INDEX IF NOT EXISTS idx_milestones_admin_reviewed ON milestones(admin_reviewed);


-- ============================================================================
-- AGENT MILESTONE REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_milestone_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES milestones(milestone_id) ON DELETE CASCADE,
    agent_id VARCHAR(255) NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    
    -- Review decision
    recommendation VARCHAR(20) NOT NULL CHECK (recommendation IN ('approve', 'reject', 'revise')),
    confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    review_score DECIMAL(5, 2) CHECK (review_score >= 0 AND review_score <= 100),
    
    -- Feedback
    feedback TEXT NOT NULL,
    strengths TEXT[],
    weaknesses TEXT[],
    suggestions TEXT[],
    
    -- Evaluation criteria
    deliverables_met BOOLEAN,
    quality_rating DECIMAL(5, 2) CHECK (quality_rating >= 0 AND quality_rating <= 100),
    documentation_rating DECIMAL(5, 2) CHECK (documentation_rating >= 0 AND documentation_rating <= 100),
    code_quality_rating DECIMAL(5, 2) CHECK (code_quality_rating >= 0 AND code_quality_rating <= 100),
    
    -- Metadata
    review_duration_seconds INTEGER,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(milestone_id, agent_id)
);

CREATE INDEX idx_agent_reviews_milestone ON agent_milestone_reviews(milestone_id);
CREATE INDEX idx_agent_reviews_agent ON agent_milestone_reviews(agent_id);
CREATE INDEX idx_agent_reviews_recommendation ON agent_milestone_reviews(recommendation);
CREATE INDEX idx_agent_reviews_created_at ON agent_milestone_reviews(created_at DESC);


-- ============================================================================
-- ADMIN MILESTONE DECISIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_milestone_decisions (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES milestones(milestone_id) ON DELETE CASCADE,
    admin_wallet_address VARCHAR(255) NOT NULL,
    admin_email VARCHAR(255),
    
    -- Final decision
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'revision_requested')),
    admin_feedback TEXT NOT NULL,
    override_agents BOOLEAN DEFAULT FALSE,
    
    -- Payment info (if approved)
    approved_amount DECIMAL(20, 8),
    payment_authorized BOOLEAN DEFAULT FALSE,
    payment_tx_hash VARCHAR(255),
    payment_released_at TIMESTAMP,
    
    -- Aggregated agent data
    total_agent_reviews INTEGER DEFAULT 0,
    agent_approvals INTEGER DEFAULT 0,
    agent_rejections INTEGER DEFAULT 0,
    agent_revisions INTEGER DEFAULT 0,
    avg_agent_score DECIMAL(5, 2),
    
    -- Metadata
    decision_notes TEXT,
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(milestone_id)
);

CREATE INDEX idx_admin_decisions_milestone ON admin_milestone_decisions(milestone_id);
CREATE INDEX idx_admin_decisions_admin ON admin_milestone_decisions(admin_wallet_address);
CREATE INDEX idx_admin_decisions_decision ON admin_milestone_decisions(decision);
CREATE INDEX idx_admin_decisions_created_at ON admin_milestone_decisions(created_at DESC);


-- Add foreign key constraint now that admin_decisions table exists
ALTER TABLE milestones
ADD CONSTRAINT fk_milestones_admin_decision 
FOREIGN KEY (admin_decision_id) REFERENCES admin_milestone_decisions(decision_id);


-- ============================================================================
-- MILESTONE REVIEW STATUS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW milestone_review_status AS
SELECT 
    m.milestone_id,
    m.grant_id,
    m.milestone_number,
    m.title,
    m.status,
    m.amount,
    m.submitted_at,
    
    -- Agent reviews
    m.agent_reviews_count,
    m.agent_reviews_complete,
    COUNT(DISTINCT amr.review_id) as actual_agent_reviews,
    COUNT(DISTINCT CASE WHEN amr.recommendation = 'approve' THEN amr.review_id END) as agent_approvals,
    COUNT(DISTINCT CASE WHEN amr.recommendation = 'reject' THEN amr.review_id END) as agent_rejections,
    COUNT(DISTINCT CASE WHEN amr.recommendation = 'revise' THEN amr.review_id END) as agent_revisions,
    AVG(amr.review_score) as avg_agent_review_score,
    AVG(amr.confidence_score) as avg_agent_confidence,
    
    -- Admin decision
    m.admin_reviewed,
    amd.decision as admin_decision,
    amd.admin_feedback,
    amd.decided_at as admin_decided_at,
    amd.payment_authorized,
    
    -- Grant info
    g.title as grant_title,
    g.user_id as grantee_id
    
FROM milestones m
LEFT JOIN agent_milestone_reviews amr ON m.milestone_id = amr.milestone_id
LEFT JOIN admin_milestone_decisions amd ON m.milestone_id = amd.milestone_id
LEFT JOIN grants g ON m.grant_id = g.grant_id
GROUP BY 
    m.milestone_id, m.grant_id, m.milestone_number, m.title, m.status, 
    m.amount, m.submitted_at, m.agent_reviews_count, m.agent_reviews_complete,
    m.admin_reviewed, amd.decision, amd.admin_feedback, amd.decided_at,
    amd.payment_authorized, g.title, g.user_id;


-- ============================================================================
-- PENDING ADMIN REVIEWS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW pending_admin_reviews AS
SELECT 
    m.milestone_id,
    m.grant_id,
    m.milestone_number,
    m.title as milestone_title,
    m.status,
    m.amount,
    m.proof_of_work_url,
    m.submission_notes,
    m.submitted_at,
    
    -- Agent review summary
    COUNT(DISTINCT amr.review_id) as agent_review_count,
    COUNT(DISTINCT CASE WHEN amr.recommendation = 'approve' THEN amr.review_id END) as agent_approvals,
    COUNT(DISTINCT CASE WHEN amr.recommendation = 'reject' THEN amr.review_id END) as agent_rejections,
    COUNT(DISTINCT CASE WHEN amr.recommendation = 'revise' THEN amr.review_id END) as agent_revisions,
    AVG(amr.review_score) as avg_review_score,
    
    -- Grant info
    g.title as grant_title,
    g.user_id as grantee_id,
    g.requested_amount as total_grant_amount,
    
    -- Waiting time
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - m.submitted_at))/3600 as hours_waiting
    
FROM milestones m
LEFT JOIN agent_milestone_reviews amr ON m.milestone_id = amr.milestone_id
LEFT JOIN grants g ON m.grant_id = g.grant_id
WHERE m.status IN ('submitted', 'under_review')
  AND m.admin_reviewed = FALSE
GROUP BY 
    m.milestone_id, m.grant_id, m.milestone_number, m.title, m.status,
    m.amount, m.proof_of_work_url, m.submission_notes, m.submitted_at,
    g.title, g.user_id, g.requested_amount
ORDER BY m.submitted_at ASC;


-- ============================================================================
-- TRIGGER: Update milestone status when admin decides
-- ============================================================================
CREATE OR REPLACE FUNCTION update_milestone_on_admin_decision()
RETURNS TRIGGER AS $$
BEGIN
    -- Update milestone with admin decision
    UPDATE milestones
    SET 
        status = NEW.decision,
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
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE grant_id = (SELECT grant_id FROM milestones WHERE milestone_id = NEW.milestone_id)
          AND milestone_number = (
              SELECT milestone_number + 1 
              FROM milestones 
              WHERE milestone_id = NEW.milestone_id
          )
          AND status = 'pending';
    END IF;
    
    -- If revision requested, set back to active
    IF NEW.decision = 'revision_requested' THEN
        UPDATE milestones
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE milestone_id = NEW.milestone_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_admin_decision ON admin_milestone_decisions;
CREATE TRIGGER trigger_admin_decision
    AFTER INSERT OR UPDATE ON admin_milestone_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_on_admin_decision();


-- ============================================================================
-- TRIGGER: Update milestone when agent review added
-- ============================================================================
CREATE OR REPLACE FUNCTION update_milestone_on_agent_review()
RETURNS TRIGGER AS $$
BEGIN
    -- Update agent review count
    UPDATE milestones
    SET 
        agent_reviews_count = (
            SELECT COUNT(*) 
            FROM agent_milestone_reviews 
            WHERE milestone_id = NEW.milestone_id
        ),
        status = CASE 
            WHEN status = 'submitted' THEN 'under_review'
            ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE milestone_id = NEW.milestone_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_review ON agent_milestone_reviews;
CREATE TRIGGER trigger_agent_review
    AFTER INSERT ON agent_milestone_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_on_agent_review();


-- ============================================================================
-- ACTIVITY LOG INTEGRATION
-- ============================================================================

-- Log agent review activity
CREATE OR REPLACE FUNCTION log_agent_review_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_grant_id UUID;
BEGIN
    -- Get grant_id from milestone
    SELECT grant_id INTO v_grant_id
    FROM milestones
    WHERE milestone_id = NEW.milestone_id;
    
    -- Log the activity
    INSERT INTO agent_activity_log (
        grant_id,
        agent_id,
        action_type,
        action_details,
        action_timestamp
    ) VALUES (
        v_grant_id,
        NEW.agent_id,
        'milestone_review',
        jsonb_build_object(
            'milestone_id', NEW.milestone_id,
            'recommendation', NEW.recommendation,
            'review_score', NEW.review_score,
            'confidence_score', NEW.confidence_score
        ),
        NEW.reviewed_at
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_agent_review ON agent_milestone_reviews;
CREATE TRIGGER trigger_log_agent_review
    AFTER INSERT ON agent_milestone_reviews
    FOR EACH ROW
    EXECUTE FUNCTION log_agent_review_activity();


-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant permissions for agent review operations
GRANT SELECT, INSERT, UPDATE ON agent_milestone_reviews TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON admin_milestone_decisions TO PUBLIC;
GRANT SELECT ON milestone_review_status TO PUBLIC;
GRANT SELECT ON pending_admin_reviews TO PUBLIC;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

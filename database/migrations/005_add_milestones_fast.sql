-- Migration 005: Add Milestones Support (Optimized)
-- Created: December 2, 2025
-- Description: Adds milestone-based payment tracking for grants

-- ============================================================================
-- STEP 1: Add milestone-related columns to grants table
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'grants' AND column_name = 'has_milestones') THEN
        ALTER TABLE grants ADD COLUMN has_milestones BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added has_milestones column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'grants' AND column_name = 'total_milestones') THEN
        ALTER TABLE grants ADD COLUMN total_milestones INTEGER DEFAULT 0;
        RAISE NOTICE 'Added total_milestones column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'grants' AND column_name = 'current_milestone') THEN
        ALTER TABLE grants ADD COLUMN current_milestone INTEGER DEFAULT 1;
        RAISE NOTICE 'Added current_milestone column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'grants' AND column_name = 'milestones_payment_model') THEN
        ALTER TABLE grants ADD COLUMN milestones_payment_model VARCHAR(20) DEFAULT 'sequential' 
            CHECK (milestones_payment_model IN ('sequential', 'parallel'));
        RAISE NOTICE 'Added milestones_payment_model column';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create milestones table
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    milestone_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    grant_id UUID NOT NULL REFERENCES grants(grant_id) ON DELETE CASCADE,
    
    -- Milestone Details
    milestone_number INTEGER NOT NULL CHECK (milestone_number > 0),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deliverables TEXT[] NOT NULL DEFAULT '{}',
    
    -- Financial
    amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'ETH',
    
    -- Timeline
    estimated_completion_date DATE,
    actual_completion_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'active',
            'submitted',
            'under_review',
            'approved',
            'rejected',
            'revision_requested'
        )
    ),
    
    -- Submission
    proof_of_work_url TEXT,
    proof_of_work_ipfs VARCHAR(100),
    submission_notes TEXT,
    submitted_at TIMESTAMP,
    
    -- Review
    reviewer_feedback TEXT,
    review_score DECIMAL(5, 2) CHECK (review_score >= 0 AND review_score <= 100),
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(100),
    
    -- Blockchain
    payment_tx_hash VARCHAR(66),
    payment_released_at TIMESTAMP,
    on_chain_milestone_id BIGINT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    -- Constraints
    UNIQUE(grant_id, milestone_number)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_milestones_grant_id ON milestones(grant_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_milestone_number ON milestones(grant_id, milestone_number);
CREATE INDEX IF NOT EXISTS idx_milestones_created_at ON milestones(created_at DESC);

-- ============================================================================
-- STEP 3: Create trigger for updated_at timestamp on milestones
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_milestones_updated_at') THEN
        CREATE TRIGGER update_milestones_updated_at
            BEFORE UPDATE ON milestones
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created update_milestones_updated_at trigger';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Update activity_type constraint
-- ============================================================================

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
        'agent_shutdown',
        'milestone_created',
        'milestone_activated',
        'milestone_submitted',
        'milestone_under_review',
        'milestone_approved',
        'milestone_rejected',
        'milestone_revision_requested',
        'milestone_payment_released',
        'milestone_completed'
    )
);

-- ============================================================================
-- STEP 5: Create helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_next_milestone()
RETURNS TRIGGER AS $$
DECLARE
    next_milestone_num INTEGER;
    grant_has_milestones BOOLEAN;
    payment_model VARCHAR(20);
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        SELECT has_milestones, milestones_payment_model 
        INTO grant_has_milestones, payment_model
        FROM grants 
        WHERE grant_id = NEW.grant_id;
        
        IF grant_has_milestones AND payment_model = 'sequential' THEN
            next_milestone_num := NEW.milestone_number + 1;
            
            UPDATE milestones 
            SET status = 'active',
                updated_at = CURRENT_TIMESTAMP
            WHERE grant_id = NEW.grant_id 
                AND milestone_number = next_milestone_num
                AND status = 'pending';
            
            IF FOUND THEN
                UPDATE grants 
                SET current_milestone = next_milestone_num,
                    updated_at = CURRENT_TIMESTAMP
                WHERE grant_id = NEW.grant_id;
                
                INSERT INTO agent_activity_log (
                    agent_name, grant_id, activity_type, action, details, success
                ) VALUES (
                    'system', NEW.grant_id, 'milestone_activated',
                    'Next milestone activated',
                    jsonb_build_object('milestone_number', next_milestone_num, 'previous_milestone', NEW.milestone_number),
                    TRUE
                );
            ELSE
                UPDATE grants 
                SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE grant_id = NEW.grant_id;
                
                INSERT INTO agent_activity_log (
                    agent_name, grant_id, activity_type, action, details, success
                ) VALUES (
                    'system', NEW.grant_id, 'milestone_completed',
                    'All milestones completed',
                    jsonb_build_object('total_milestones', NEW.milestone_number),
                    TRUE
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'milestone_approved_activate_next') THEN
        CREATE TRIGGER milestone_approved_activate_next
            AFTER UPDATE ON milestones
            FOR EACH ROW
            EXECUTE FUNCTION activate_next_milestone();
        RAISE NOTICE 'Created milestone_approved_activate_next trigger';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION log_milestone_submission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
        INSERT INTO agent_activity_log (
            agent_name, grant_id, activity_type, action, details, success
        ) VALUES (
            'grantee', NEW.grant_id, 'milestone_submitted',
            'Milestone submitted for review',
            jsonb_build_object(
                'milestone_id', NEW.milestone_id,
                'milestone_number', NEW.milestone_number,
                'title', NEW.title,
                'proof_of_work_url', NEW.proof_of_work_url
            ),
            TRUE
        );
    END IF;
    
    IF NEW.payment_tx_hash IS NOT NULL AND OLD.payment_tx_hash IS NULL THEN
        INSERT INTO agent_activity_log (
            agent_name, grant_id, activity_type, action, details, success, transaction_hash
        ) VALUES (
            'system', NEW.grant_id, 'milestone_payment_released',
            'Milestone payment released',
            jsonb_build_object(
                'milestone_id', NEW.milestone_id,
                'milestone_number', NEW.milestone_number,
                'amount', NEW.amount,
                'currency', NEW.currency
            ),
            TRUE,
            NEW.payment_tx_hash
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'milestone_activity_logger') THEN
        CREATE TRIGGER milestone_activity_logger
            AFTER UPDATE ON milestones
            FOR EACH ROW
            EXECUTE FUNCTION log_milestone_submission();
        RAISE NOTICE 'Created milestone_activity_logger trigger';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Create view
-- ============================================================================

CREATE OR REPLACE VIEW milestone_progress_summary AS
SELECT 
    g.grant_id,
    g.title as grant_title,
    g.has_milestones,
    g.total_milestones,
    g.current_milestone,
    COUNT(m.id) as milestones_count,
    COUNT(m.id) FILTER (WHERE m.status = 'approved') as completed_milestones,
    COUNT(m.id) FILTER (WHERE m.status = 'active') as active_milestones,
    COUNT(m.id) FILTER (WHERE m.status = 'submitted') as submitted_milestones,
    COUNT(m.id) FILTER (WHERE m.status = 'pending') as pending_milestones,
    SUM(m.amount) as total_milestone_amount,
    SUM(m.amount) FILTER (WHERE m.status = 'approved') as paid_amount,
    ROUND(
        (COUNT(m.id) FILTER (WHERE m.status = 'approved')::DECIMAL / 
         NULLIF(COUNT(m.id), 0) * 100), 
        2
    ) as completion_percentage
FROM grants g
LEFT JOIN milestones m ON g.grant_id = m.grant_id
WHERE g.has_milestones = TRUE
GROUP BY g.grant_id, g.title, g.has_milestones, g.total_milestones, g.current_milestone;

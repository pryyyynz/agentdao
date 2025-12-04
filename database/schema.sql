-- AgentDAO Database Schema
-- PostgreSQL 15+
-- Created: January 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- GRANTS TABLE
-- Stores all grant proposals submitted to the DAO
-- ============================================================================
CREATE TABLE grants (
    id SERIAL PRIMARY KEY,
    grant_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Proposal Details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requested_amount DECIMAL(20, 8) NOT NULL CHECK (requested_amount > 0),
    currency VARCHAR(10) DEFAULT 'ETH',
    
    -- Applicant Information
    applicant_address VARCHAR(42) NOT NULL, -- Ethereum address
    applicant_email VARCHAR(255),
    team_size INTEGER DEFAULT 1,
    
    -- IPFS Storage
    ipfs_hash VARCHAR(100), -- Full proposal stored on IPFS
    document_urls TEXT[], -- Additional documents
    
    -- Blockchain Integration
    on_chain_id BIGINT, -- ID from smart contract
    transaction_hash VARCHAR(66), -- Creation transaction
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN (
            'pending',           -- Awaiting evaluation
            'under_evaluation',  -- Being evaluated by agents
            'approved',          -- Passed evaluation, funds approved
            'rejected',          -- Failed evaluation
            'active',            -- Funds released, work in progress
            'completed',         -- All milestones completed
            'cancelled'          -- Cancelled by applicant or DAO
        )
    ),
    
    -- Evaluation Results
    overall_score DECIMAL(5, 2), -- 0.00 to 100.00
    consensus_reached BOOLEAN DEFAULT FALSE,
    evaluation_started_at TIMESTAMP,
    evaluation_completed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB, -- Additional flexible data
    
    -- Indexes for performance
    CONSTRAINT valid_applicant_address CHECK (applicant_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Indexes for grants table
CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_applicant ON grants(applicant_address);
CREATE INDEX idx_grants_created_at ON grants(created_at DESC);
CREATE INDEX idx_grants_on_chain_id ON grants(on_chain_id);
CREATE INDEX idx_grants_grant_id ON grants(grant_id);

-- ============================================================================
-- EVALUATIONS TABLE
-- Stores individual agent evaluations for each grant
-- ============================================================================
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    evaluation_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Foreign Keys
    grant_id UUID NOT NULL REFERENCES grants(grant_id) ON DELETE CASCADE,
    
    -- Agent Information
    agent_name VARCHAR(100) NOT NULL, -- technical, impact, dd, budget, community
    agent_address VARCHAR(42), -- Agent's wallet address
    
    -- Evaluation Results
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    vote VARCHAR(20) CHECK (vote IN ('approve', 'reject', 'abstain', 'conditional')),
    confidence DECIMAL(5, 2) CHECK (confidence >= 0 AND confidence <= 100),
    
    -- Analysis Details
    summary TEXT,
    detailed_analysis JSONB, -- Structured analysis data
    strengths TEXT[],
    weaknesses TEXT[],
    recommendations TEXT[],
    red_flags TEXT[],
    
    -- Blockchain Integration
    on_chain_vote_tx VARCHAR(66), -- Transaction hash of on-chain vote
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    CONSTRAINT valid_agent_address CHECK (agent_address IS NULL OR agent_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Indexes for evaluations table
CREATE INDEX idx_evaluations_grant_id ON evaluations(grant_id);
CREATE INDEX idx_evaluations_agent_name ON evaluations(agent_name);
CREATE INDEX idx_evaluations_completed_at ON evaluations(completed_at DESC);
CREATE UNIQUE INDEX idx_evaluations_grant_agent ON evaluations(grant_id, agent_name);

-- ============================================================================
-- MILESTONES TABLE
-- Tracks milestone-based fund releases for approved grants
-- ============================================================================
CREATE TABLE milestones (
    id SERIAL PRIMARY KEY,
    milestone_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Foreign Keys
    grant_id UUID NOT NULL REFERENCES grants(grant_id) ON DELETE CASCADE,
    
    -- Milestone Details
    milestone_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
    
    -- Requirements
    deliverables TEXT[],
    success_criteria TEXT[],
    estimated_duration_days INTEGER,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN (
            'pending',      -- Not started
            'in_progress',  -- Work ongoing
            'submitted',    -- Deliverables submitted for review
            'approved',     -- Approved by agents
            'rejected',     -- Rejected, needs revision
            'completed',    -- Funds released
            'cancelled'     -- Milestone cancelled
        )
    ),
    
    -- Review Results
    review_score DECIMAL(5, 2),
    reviewer_notes TEXT,
    
    -- Blockchain Integration
    on_chain_milestone_id BIGINT,
    release_transaction_hash VARCHAR(66),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    released_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    CONSTRAINT valid_milestone_number CHECK (milestone_number > 0)
);

-- Indexes for milestones table
CREATE INDEX idx_milestones_grant_id ON milestones(grant_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE UNIQUE INDEX idx_milestones_grant_number ON milestones(grant_id, milestone_number);

-- ============================================================================
-- AGENT_REPUTATION TABLE
-- Tracks performance metrics for each agent
-- ============================================================================
CREATE TABLE agent_reputation (
    id SERIAL PRIMARY KEY,
    
    -- Agent Identification
    agent_name VARCHAR(100) UNIQUE NOT NULL,
    agent_address VARCHAR(42) UNIQUE,
    
    -- Performance Metrics
    total_evaluations INTEGER DEFAULT 0,
    successful_evaluations INTEGER DEFAULT 0,
    failed_evaluations INTEGER DEFAULT 0,
    
    -- Accuracy Tracking
    accuracy_score DECIMAL(5, 2) DEFAULT 100.00, -- How often agent's vote aligns with consensus
    average_confidence DECIMAL(5, 2) DEFAULT 0.00,
    
    -- Response Time Metrics
    average_response_time_seconds INTEGER DEFAULT 0,
    fastest_response_seconds INTEGER,
    slowest_response_seconds INTEGER,
    
    -- Voting Behavior
    total_approvals INTEGER DEFAULT 0,
    total_rejections INTEGER DEFAULT 0,
    total_abstentions INTEGER DEFAULT 0,
    
    -- Reliability
    uptime_percentage DECIMAL(5, 2) DEFAULT 100.00,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    
    -- Timestamps
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    CONSTRAINT valid_reputation_agent_address CHECK (agent_address IS NULL OR agent_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Indexes for agent_reputation table
CREATE INDEX idx_agent_reputation_name ON agent_reputation(agent_name);
CREATE INDEX idx_agent_reputation_active ON agent_reputation(is_active);
CREATE INDEX idx_agent_reputation_accuracy ON agent_reputation(accuracy_score DESC);

-- ============================================================================
-- AGENT_ACTIVITY_LOG TABLE
-- Detailed audit log of all agent activities
-- ============================================================================
CREATE TABLE agent_activity_log (
    id SERIAL PRIMARY KEY,
    activity_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Agent & Grant Context
    agent_name VARCHAR(100) NOT NULL,
    grant_id UUID REFERENCES grants(grant_id) ON DELETE SET NULL,
    
    -- Activity Details
    activity_type VARCHAR(100) NOT NULL CHECK (
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
    ),
    action VARCHAR(255) NOT NULL,
    
    -- Details
    details JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Performance Tracking
    duration_ms INTEGER, -- How long the action took
    
    -- Blockchain Integration
    transaction_hash VARCHAR(66),
    gas_used BIGINT,
    
    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB
);

-- Indexes for agent_activity_log table
CREATE INDEX idx_activity_log_agent_name ON agent_activity_log(agent_name);
CREATE INDEX idx_activity_log_grant_id ON agent_activity_log(grant_id);
CREATE INDEX idx_activity_log_activity_type ON agent_activity_log(activity_type);
CREATE INDEX idx_activity_log_timestamp ON agent_activity_log(timestamp DESC);
CREATE INDEX idx_activity_log_success ON agent_activity_log(success);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for grants table
CREATE TRIGGER update_grants_updated_at
    BEFORE UPDATE ON grants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for agent_reputation table
CREATE TRIGGER update_agent_reputation_updated_at
    BEFORE UPDATE ON agent_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log evaluation completion
CREATE OR REPLACE FUNCTION log_evaluation_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
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
                'confidence', NEW.confidence
            ),
            TRUE,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for evaluation completion
CREATE TRIGGER log_evaluation_completion_trigger
    AFTER UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION log_evaluation_completion();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Grant Summary with Evaluation Stats
CREATE VIEW grant_summary AS
SELECT 
    g.grant_id,
    g.title,
    g.requested_amount,
    g.currency,
    g.applicant_address,
    g.status,
    g.overall_score,
    g.created_at,
    COUNT(e.id) as total_evaluations,
    AVG(e.score) as average_score,
    COUNT(CASE WHEN e.vote = 'approve' THEN 1 END) as approvals,
    COUNT(CASE WHEN e.vote = 'reject' THEN 1 END) as rejections,
    COUNT(CASE WHEN e.vote = 'abstain' THEN 1 END) as abstentions
FROM grants g
LEFT JOIN evaluations e ON g.grant_id = e.grant_id
GROUP BY g.grant_id, g.title, g.requested_amount, g.currency, g.applicant_address,
         g.status, g.overall_score, g.created_at;

-- View: Agent Performance Summary
CREATE VIEW agent_performance AS
SELECT 
    ar.agent_name,
    ar.accuracy_score,
    ar.total_evaluations,
    ar.average_response_time_seconds,
    ar.uptime_percentage,
    ar.is_active,
    COUNT(DISTINCT e.grant_id) as grants_evaluated,
    AVG(e.score) as average_score_given
FROM agent_reputation ar
LEFT JOIN evaluations e ON ar.agent_name = e.agent_name
GROUP BY ar.agent_name, ar.accuracy_score, ar.total_evaluations, 
         ar.average_response_time_seconds, ar.uptime_percentage, ar.is_active;

-- View: Active Grants Dashboard
CREATE VIEW active_grants_dashboard AS
SELECT 
    g.grant_id,
    g.title,
    g.requested_amount,
    g.status,
    g.created_at,
    g.evaluation_started_at,
    COUNT(e.id) as completed_evaluations,
    COUNT(m.id) as total_milestones,
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completed_milestones,
    SUM(CASE WHEN m.status = 'completed' THEN m.amount ELSE 0 END) as funds_released
FROM grants g
LEFT JOIN evaluations e ON g.grant_id = e.grant_id AND e.completed_at IS NOT NULL
LEFT JOIN milestones m ON g.grant_id = m.grant_id
WHERE g.status IN ('under_evaluation', 'approved', 'active')
GROUP BY g.grant_id;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Initialize agent reputation records for each agent type
INSERT INTO agent_reputation (agent_name, agent_address) VALUES
    ('technical', NULL),
    ('impact', NULL),
    ('due_diligence', NULL),
    ('budget', NULL),
    ('community', NULL),
    ('coordinator', NULL),
    ('executor', NULL)
ON CONFLICT (agent_name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE grants IS 'Stores all grant proposals submitted to AgentDAO';
COMMENT ON TABLE evaluations IS 'Individual agent evaluations for each grant';
COMMENT ON TABLE milestones IS 'Milestone-based fund release tracking';
COMMENT ON TABLE agent_reputation IS 'Performance metrics for each agent';
COMMENT ON TABLE agent_activity_log IS 'Detailed audit log of all agent activities';

COMMENT ON COLUMN grants.grant_id IS 'Unique UUID for grant identification';
COMMENT ON COLUMN grants.ipfs_hash IS 'IPFS hash of full proposal document';
COMMENT ON COLUMN grants.on_chain_id IS 'ID from GrantRegistry smart contract';
COMMENT ON COLUMN evaluations.detailed_analysis IS 'Structured JSON analysis from agent';
COMMENT ON COLUMN agent_reputation.accuracy_score IS 'How often agent vote aligns with consensus';

-- ============================================================================
-- SECURITY: Row Level Security (RLS) - Optional, enable if needed
-- ============================================================================

-- Enable RLS on grants table (example)
-- ALTER TABLE grants ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read all grants
-- CREATE POLICY grants_public_read ON grants
--     FOR SELECT
--     USING (true);

-- Policy: Only authenticated users can insert grants
-- CREATE POLICY grants_authenticated_insert ON grants
--     FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Migration: 001 - Initial Schema
-- Description: Create initial database tables for AgentDAO
-- Created: January 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grants table
CREATE TABLE grants (
    id SERIAL PRIMARY KEY,
    grant_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requested_amount DECIMAL(20, 8) NOT NULL CHECK (requested_amount > 0),
    currency VARCHAR(10) DEFAULT 'ETH',
    applicant_address VARCHAR(42) NOT NULL,
    applicant_email VARCHAR(255),
    team_size INTEGER DEFAULT 1,
    ipfs_hash VARCHAR(100),
    document_urls TEXT[],
    on_chain_id BIGINT,
    transaction_hash VARCHAR(66),
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'under_evaluation', 'approved', 'rejected', 'active', 'completed', 'cancelled')
    ),
    overall_score DECIMAL(5, 2),
    consensus_reached BOOLEAN DEFAULT FALSE,
    evaluation_started_at TIMESTAMP,
    evaluation_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    CONSTRAINT valid_applicant_address CHECK (applicant_address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_applicant ON grants(applicant_address);
CREATE INDEX idx_grants_created_at ON grants(created_at DESC);
CREATE INDEX idx_grants_on_chain_id ON grants(on_chain_id);
CREATE INDEX idx_grants_grant_id ON grants(grant_id);

-- Evaluations table
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    evaluation_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    grant_id UUID NOT NULL REFERENCES grants(grant_id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    agent_address VARCHAR(42),
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    vote VARCHAR(20) CHECK (vote IN ('approve', 'reject', 'abstain')),
    confidence DECIMAL(5, 2) CHECK (confidence >= 0 AND confidence <= 100),
    summary TEXT,
    detailed_analysis JSONB,
    strengths TEXT[],
    weaknesses TEXT[],
    recommendations TEXT[],
    red_flags TEXT[],
    on_chain_vote_tx VARCHAR(66),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB,
    CONSTRAINT valid_agent_address CHECK (agent_address IS NULL OR agent_address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE INDEX idx_evaluations_grant_id ON evaluations(grant_id);
CREATE INDEX idx_evaluations_agent_name ON evaluations(agent_name);
CREATE INDEX idx_evaluations_completed_at ON evaluations(completed_at DESC);
CREATE UNIQUE INDEX idx_evaluations_grant_agent ON evaluations(grant_id, agent_name);

-- Milestones table
CREATE TABLE milestones (
    id SERIAL PRIMARY KEY,
    milestone_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    grant_id UUID NOT NULL REFERENCES grants(grant_id) ON DELETE CASCADE,
    milestone_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
    deliverables TEXT[],
    success_criteria TEXT[],
    estimated_duration_days INTEGER,
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled')
    ),
    review_score DECIMAL(5, 2),
    reviewer_notes TEXT,
    on_chain_milestone_id BIGINT,
    release_transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    released_at TIMESTAMP,
    metadata JSONB,
    CONSTRAINT valid_milestone_number CHECK (milestone_number > 0)
);

CREATE INDEX idx_milestones_grant_id ON milestones(grant_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE UNIQUE INDEX idx_milestones_grant_number ON milestones(grant_id, milestone_number);

-- Agent reputation table
CREATE TABLE agent_reputation (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(100) UNIQUE NOT NULL,
    agent_address VARCHAR(42) UNIQUE,
    total_evaluations INTEGER DEFAULT 0,
    successful_evaluations INTEGER DEFAULT 0,
    failed_evaluations INTEGER DEFAULT 0,
    accuracy_score DECIMAL(5, 2) DEFAULT 100.00,
    average_confidence DECIMAL(5, 2) DEFAULT 0.00,
    average_response_time_seconds INTEGER DEFAULT 0,
    fastest_response_seconds INTEGER,
    slowest_response_seconds INTEGER,
    total_approvals INTEGER DEFAULT 0,
    total_rejections INTEGER DEFAULT 0,
    total_abstentions INTEGER DEFAULT 0,
    uptime_percentage DECIMAL(5, 2) DEFAULT 100.00,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    CONSTRAINT valid_reputation_agent_address CHECK (agent_address IS NULL OR agent_address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE INDEX idx_agent_reputation_name ON agent_reputation(agent_name);
CREATE INDEX idx_agent_reputation_active ON agent_reputation(is_active);
CREATE INDEX idx_agent_reputation_accuracy ON agent_reputation(accuracy_score DESC);

-- Agent activity log table
CREATE TABLE agent_activity_log (
    id SERIAL PRIMARY KEY,
    activity_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    grant_id UUID REFERENCES grants(grant_id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL CHECK (
        activity_type IN (
            'evaluation_started', 'evaluation_completed', 'evaluation_failed',
            'vote_cast', 'message_sent', 'message_received', 'milestone_reviewed',
            'error_encountered', 'consensus_reached', 'fund_release_approved',
            'grant_created', 'grant_updated', 'agent_initialized', 'agent_shutdown'
        )
    ),
    action VARCHAR(255) NOT NULL,
    details JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    duration_ms INTEGER,
    transaction_hash VARCHAR(66),
    gas_used BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_activity_log_agent_name ON agent_activity_log(agent_name);
CREATE INDEX idx_activity_log_grant_id ON agent_activity_log(grant_id);
CREATE INDEX idx_activity_log_activity_type ON agent_activity_log(activity_type);
CREATE INDEX idx_activity_log_timestamp ON agent_activity_log(timestamp DESC);
CREATE INDEX idx_activity_log_success ON agent_activity_log(success);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grants_updated_at
    BEFORE UPDATE ON grants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_reputation_updated_at
    BEFORE UPDATE ON agent_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION log_evaluation_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        INSERT INTO agent_activity_log (
            agent_name, grant_id, activity_type, action, details, success, duration_ms
        ) VALUES (
            NEW.agent_name, NEW.grant_id, 'evaluation_completed',
            'Agent completed evaluation for grant',
            jsonb_build_object('score', NEW.score, 'vote', NEW.vote, 'confidence', NEW.confidence),
            TRUE,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_evaluation_completion_trigger
    AFTER UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION log_evaluation_completion();

-- Views
CREATE VIEW grant_summary AS
SELECT 
    g.grant_id, g.title, g.requested_amount, g.currency, g.applicant_address,
    g.status, g.overall_score, g.created_at,
    COUNT(e.id) as total_evaluations,
    AVG(e.score) as average_score,
    COUNT(CASE WHEN e.vote = 'approve' THEN 1 END) as approvals,
    COUNT(CASE WHEN e.vote = 'reject' THEN 1 END) as rejections,
    COUNT(CASE WHEN e.vote = 'abstain' THEN 1 END) as abstentions
FROM grants g
LEFT JOIN evaluations e ON g.grant_id = e.grant_id
GROUP BY g.grant_id, g.title, g.requested_amount, g.currency, g.applicant_address,
         g.status, g.overall_score, g.created_at;

CREATE VIEW agent_performance AS
SELECT 
    ar.agent_name, ar.accuracy_score, ar.total_evaluations,
    ar.average_response_time_seconds, ar.uptime_percentage, ar.is_active,
    COUNT(DISTINCT e.grant_id) as grants_evaluated,
    AVG(e.score) as average_score_given
FROM agent_reputation ar
LEFT JOIN evaluations e ON ar.agent_name = e.agent_name
GROUP BY ar.agent_name, ar.accuracy_score, ar.total_evaluations,
         ar.average_response_time_seconds, ar.uptime_percentage, ar.is_active;

-- Initialize agent reputation
INSERT INTO agent_reputation (agent_name, agent_address) VALUES
    ('technical', NULL),
    ('impact', NULL),
    ('due_diligence', NULL),
    ('budget', NULL),
    ('community', NULL),
    ('coordinator', NULL),
    ('executor', NULL)
ON CONFLICT (agent_name) DO NOTHING;

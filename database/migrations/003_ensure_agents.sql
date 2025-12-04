-- Migration: Ensure All Agents Exist
-- Created: 2024-12-02
-- Purpose: Ensure all agent types have entries in agent_reputation and agent_weights

-- ============================================================================
-- INSERT MISSING AGENTS INTO AGENT_REPUTATION
-- ============================================================================

-- Insert all agent types if they don't exist
INSERT INTO agent_reputation (agent_name, agent_address, is_active, is_suspended) VALUES
    ('intake', NULL, TRUE, FALSE),
    ('technical', NULL, TRUE, FALSE),
    ('impact', NULL, TRUE, FALSE),
    ('due_diligence', NULL, TRUE, FALSE),
    ('budget', NULL, TRUE, FALSE),
    ('community', NULL, TRUE, FALSE),
    ('coordinator', NULL, TRUE, FALSE),
    ('executor', NULL, TRUE, FALSE)
ON CONFLICT (agent_name) DO NOTHING;

-- ============================================================================
-- ENSURE ALL AGENTS HAVE WEIGHTS
-- ============================================================================

-- Insert weights for any missing agents
INSERT INTO agent_weights (agent_name, weight, description) VALUES
    ('intake', 1.00, 'Initial grant intake and validation'),
    ('technical', 1.00, 'Technical feasibility and implementation analysis'),
    ('impact', 1.00, 'Project impact and alignment with DAO goals'),
    ('due_diligence', 1.00, 'Background checks and risk assessment'),
    ('budget', 1.00, 'Budget analysis and cost-benefit evaluation'),
    ('community', 1.00, 'Community engagement and support assessment'),
    ('coordinator', 0.50, 'Coordination and consensus management'),
    ('executor', 0.50, 'Execution and milestone tracking')
ON CONFLICT (agent_name) DO UPDATE SET
    weight = EXCLUDED.weight,
    description = EXCLUDED.description;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agent_reputation IS 'Performance metrics and status for each agent type';
COMMENT ON TABLE agent_weights IS 'Voting weights for consensus calculation';

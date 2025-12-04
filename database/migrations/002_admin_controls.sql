-- Migration: Admin Control System
-- Created: 2024-12-02
-- Purpose: Add tables for admin control features (system pause, emergency stop, agent weights)

-- ============================================================================
-- SYSTEM_CONFIG TABLE
-- Stores system-wide configuration and control flags
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    value_type VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'boolean', 'number', 'json')),
    description TEXT,
    updated_by VARCHAR(100), -- Admin username or wallet address
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for system_config
CREATE INDEX idx_system_config_key ON system_config(config_key);

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, value_type, description) VALUES
    ('system_paused', 'false', 'boolean', 'Whether the entire system is paused'),
    ('pause_reason', '', 'string', 'Reason for system pause'),
    ('emergency_stop', 'false', 'boolean', 'Emergency stop flag - halts all operations'),
    ('emergency_stop_reason', '', 'string', 'Reason for emergency stop'),
    ('emergency_stop_timestamp', '', 'string', 'When emergency stop was activated')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- AGENT_WEIGHTS TABLE
-- Stores voting weights for each agent (for weighted consensus)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_weights (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(100) UNIQUE NOT NULL,
    weight DECIMAL(5, 2) DEFAULT 1.00 CHECK (weight >= 0 AND weight <= 10.00),
    is_enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (agent_name) REFERENCES agent_reputation(agent_name) ON DELETE CASCADE
);

-- Indexes for agent_weights
CREATE INDEX idx_agent_weights_name ON agent_weights(agent_name);
CREATE INDEX idx_agent_weights_enabled ON agent_weights(is_enabled);

-- Insert default weights for all agents
INSERT INTO agent_weights (agent_name, weight, description) VALUES
    ('technical', 1.00, 'Technical feasibility and implementation analysis'),
    ('impact', 1.00, 'Project impact and alignment with DAO goals'),
    ('due_diligence', 1.00, 'Background checks and risk assessment'),
    ('budget', 1.00, 'Budget analysis and cost-benefit evaluation'),
    ('community', 1.00, 'Community engagement and support assessment'),
    ('coordinator', 0.50, 'Coordination and consensus management'),
    ('executor', 0.50, 'Execution and milestone tracking')
ON CONFLICT (agent_name) DO NOTHING;

-- ============================================================================
-- ADMIN_ACTION_LOG TABLE
-- Audit log for all admin actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_action_log (
    id SERIAL PRIMARY KEY,
    action_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    admin_user VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL CHECK (
        action_type IN (
            'grant_approved',
            'grant_rejected',
            'agent_status_changed',
            'agent_weight_updated',
            'agent_registered',
            'system_paused',
            'system_resumed',
            'emergency_stop_activated',
            'emergency_stop_deactivated',
            'config_updated'
        )
    ),
    target_type VARCHAR(50), -- 'grant', 'agent', 'system'
    target_id VARCHAR(255), -- grant_id, agent_name, or config_key
    action_details JSONB NOT NULL,
    ip_address VARCHAR(45), -- Support IPv6
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for admin_action_log
CREATE INDEX idx_admin_action_log_admin_user ON admin_action_log(admin_user);
CREATE INDEX idx_admin_action_log_action_type ON admin_action_log(action_type);
CREATE INDEX idx_admin_action_log_target ON admin_action_log(target_type, target_id);
CREATE INDEX idx_admin_action_log_timestamp ON admin_action_log(timestamp DESC);

-- ============================================================================
-- TRIGGERS FOR AUDIT LOGGING
-- ============================================================================

-- Trigger to update updated_at on agent_weights
CREATE OR REPLACE FUNCTION update_agent_weights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_weights_updated_at
    BEFORE UPDATE ON agent_weights
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_weights_timestamp();

-- Trigger to update updated_at on system_config
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get system config value
CREATE OR REPLACE FUNCTION get_system_config(key VARCHAR)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT config_value INTO result
    FROM system_config
    WHERE config_key = key;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to set system config value
CREATE OR REPLACE FUNCTION set_system_config(
    key VARCHAR,
    value TEXT,
    updated_by_user VARCHAR DEFAULT 'system'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_config (config_key, config_value, updated_by, updated_at)
    VALUES (key, value, updated_by_user, CURRENT_TIMESTAMP)
    ON CONFLICT (config_key) 
    DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to check if system is operational
CREATE OR REPLACE FUNCTION is_system_operational()
RETURNS BOOLEAN AS $$
DECLARE
    is_paused BOOLEAN;
    is_emergency BOOLEAN;
BEGIN
    SELECT 
        COALESCE((SELECT config_value::boolean FROM system_config WHERE config_key = 'system_paused'), FALSE),
        COALESCE((SELECT config_value::boolean FROM system_config WHERE config_key = 'emergency_stop'), FALSE)
    INTO is_paused, is_emergency;
    
    RETURN NOT (is_paused OR is_emergency);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE system_config IS 'System-wide configuration and control flags';
COMMENT ON TABLE agent_weights IS 'Voting weights for each agent in consensus calculation';
COMMENT ON TABLE admin_action_log IS 'Audit log for all administrative actions';

COMMENT ON COLUMN system_config.config_key IS 'Unique configuration key';
COMMENT ON COLUMN system_config.value_type IS 'Data type for proper parsing';
COMMENT ON COLUMN agent_weights.weight IS 'Voting weight (0.0 to 10.0), 1.0 is standard';
COMMENT ON COLUMN admin_action_log.action_details IS 'JSON details of the action taken';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

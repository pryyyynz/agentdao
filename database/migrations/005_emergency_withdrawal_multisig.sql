-- Migration: Add multi-sig approval system for emergency withdrawals
-- Purpose: Track withdrawal requests and require multiple admin approvals
-- Date: 2024-12-03

-- Create emergency withdrawal requests table
CREATE TABLE IF NOT EXISTS emergency_withdrawal_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    
    -- Withdrawal Details
    recipient_address VARCHAR(42) NOT NULL,
    amount_wei VARCHAR(78) NOT NULL, -- Store as string to handle large numbers
    amount_eth VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    
    -- Request Status
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('pending', 'approved', 'rejected', 'executed', 'cancelled')
    ) DEFAULT 'pending',
    
    -- Approval Tracking
    required_approvals INTEGER NOT NULL DEFAULT 2, -- Require 2 approvals
    current_approvals INTEGER NOT NULL DEFAULT 0,
    
    -- Transaction Details (after execution)
    transaction_hash VARCHAR(66),
    executed_at TIMESTAMP,
    
    -- Metadata
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for emergency_withdrawal_requests
CREATE INDEX idx_withdrawal_status ON emergency_withdrawal_requests(status);
CREATE INDEX idx_withdrawal_created_at ON emergency_withdrawal_requests(created_at);

-- Create approval tracking table
CREATE TABLE IF NOT EXISTS emergency_withdrawal_approvals (
    id SERIAL PRIMARY KEY,
    withdrawal_request_id INTEGER NOT NULL REFERENCES emergency_withdrawal_requests(id) ON DELETE CASCADE,
    
    -- Approval Details
    admin_user VARCHAR(100) NOT NULL,
    approved BOOLEAN NOT NULL,
    comment TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for emergency_withdrawal_approvals
CREATE INDEX idx_approval_withdrawal_request ON emergency_withdrawal_approvals(withdrawal_request_id);
CREATE UNIQUE INDEX idx_unique_admin_vote ON emergency_withdrawal_approvals(withdrawal_request_id, admin_user);

-- Add comment
COMMENT ON TABLE emergency_withdrawal_requests IS 'Tracks emergency withdrawal requests requiring multi-sig approval';
COMMENT ON TABLE emergency_withdrawal_approvals IS 'Tracks individual admin approvals for withdrawal requests';

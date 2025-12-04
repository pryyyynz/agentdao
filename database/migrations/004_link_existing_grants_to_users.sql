-- Migration: 004 - Link Existing Grants to Users by Wallet Address
-- Description: Match existing grants to users based on applicant_address
-- Created: January 2025

-- This migration will be run after users have linked their wallets
-- It matches grants to users based on applicant_address = wallet_address

-- Function to link grants to users when wallet is linked
CREATE OR REPLACE FUNCTION link_grants_to_user(p_user_id UUID, p_wallet_address VARCHAR(42))
RETURNS INTEGER AS $$
DECLARE
    v_linked_count INTEGER;
BEGIN
    -- Link grants that match the wallet address and don't already have a user_id
    UPDATE grants
    SET user_id = p_user_id
    WHERE applicant_address = p_wallet_address
      AND user_id IS NULL
      AND applicant_address IS NOT NULL;
    
    GET DIAGNOSTICS v_linked_count = ROW_COUNT;
    
    RETURN v_linked_count;
END;
$$ LANGUAGE plpgsql;

-- Note: This function will be called automatically when a user links their wallet
-- via the API endpoint. No manual migration needed for existing grants.


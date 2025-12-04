-- Migration: Add 'conditional' vote type and fix constraint
-- Date: 2025-11-18
-- Issue: Vote constraint was preventing 'conditional' votes from being saved

-- Description:
-- This migration adds 'conditional' as a valid vote option in the evaluations table.
-- Agents can now save evaluations with vote = 'conditional' for proposals that need
-- additional work or clarification before approval/rejection.

BEGIN;

-- Drop the existing vote check constraint
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_vote_check;

-- Add the new constraint including 'conditional'
ALTER TABLE evaluations ADD CONSTRAINT evaluations_vote_check 
    CHECK (vote IN ('approve', 'reject', 'abstain', 'conditional'));

-- Add a comment explaining the vote types
COMMENT ON COLUMN evaluations.vote IS 'Agent vote decision: approve (fund), reject (deny), abstain (neutral), conditional (needs changes)';

-- Verify the constraint was added correctly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'evaluations_vote_check'
    ) THEN
        RAISE NOTICE 'Migration successful: vote constraint updated to include conditional';
    ELSE
        RAISE EXCEPTION 'Migration failed: vote constraint not found';
    END IF;
END $$;

COMMIT;

-- Test: Try inserting a conditional vote (should succeed)
-- Uncomment to test after migration:
-- SELECT vote FROM evaluations WHERE vote = 'conditional' LIMIT 1;

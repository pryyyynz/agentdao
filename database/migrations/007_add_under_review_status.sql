-- Add 'under_review' status to grants table
-- This status represents grants that have been approved by agents but await final admin approval

ALTER TABLE grants DROP CONSTRAINT IF EXISTS grants_status_check;

ALTER TABLE grants ADD CONSTRAINT grants_status_check CHECK (
    status IN (
        'pending',           -- Awaiting evaluation
        'under_evaluation',  -- Being evaluated by agents
        'under_review',      -- Agent-approved, awaiting admin final approval
        'approved',          -- Passed evaluation, funds approved by admin
        'rejected',          -- Failed evaluation
        'active',            -- Funds released, work in progress
        'completed',         -- All milestones completed
        'cancelled'          -- Cancelled by applicant or DAO
    )
);

-- Update the admin endpoint to recognize 'under_review' as a pending action status
COMMENT ON COLUMN grants.status IS 'Grant status: pending -> under_evaluation -> under_review -> approved -> active -> completed';

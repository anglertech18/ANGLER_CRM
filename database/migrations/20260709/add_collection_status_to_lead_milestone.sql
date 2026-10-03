-- Migration: Add Collection Status to Lead Milestone
-- Date: 2026-07-09
-- Description: Adds an auto-calculated Collection Status (Pending/Partial Paid/
--              Fully Paid), with a manual "Stuck" override that sticks until the
--              user changes it away. Independent of poa_status and the existing
--              workflow status column.

ALTER TABLE lead_milestone
  ADD COLUMN IF NOT EXISTS collection_status VARCHAR(20) NOT NULL DEFAULT 'Pending' AFTER poa_status;

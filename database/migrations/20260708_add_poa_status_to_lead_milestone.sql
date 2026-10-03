-- Migration: Add POA Status to Lead Milestone
-- Date: 2026-07-08
-- Description: Adds an editable POA Status dropdown (Pending/In Progress/Completed)
--              per milestone, independent of the existing workflow status column.

ALTER TABLE lead_milestone
  ADD COLUMN IF NOT EXISTS poa_status VARCHAR(20) NOT NULL DEFAULT 'Pending' AFTER bant_poa_edc;

-- Migration: Add requires_requalification flag to Lead
-- Date: 2026-07-01
-- Purpose: Support updated Quadrant/Sales Stage lifecycle (Nurturing reset + nightly
--          auto-degradation) by flagging leads that must be requalified (new Lead Score
--          and BANT values entered) before they can progress again.

ALTER TABLE `Lead`
  ADD COLUMN IF NOT EXISTS `requires_requalification` BOOLEAN NOT NULL DEFAULT false;

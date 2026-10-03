-- Migration: Add order_won_at to Lead
-- Date: 2026-07-04
-- Purpose: SEAL Dashboard and other reports currently bucket "Order Won" leads by
--          `updated_at`, which shifts whenever the row is later touched by any
--          unrelated edit — causing the achievement to appear in the wrong month.
--          `order_won_at` is stamped exactly once, at the moment sales_stage
--          transitions to "Order Won", and is never overwritten afterward.

ALTER TABLE `lead`
  ADD COLUMN IF NOT EXISTS `order_won_at` DATETIME(3) NULL;

-- Backfill: leads already in "Order Won" stage predate this column and have no
-- order_won_at value. Approximate their achievement date using updated_at (the
-- best available signal at migration time) so historical SEAL figures aren't lost.
-- New Order Won transitions after this migration are stamped precisely by the
-- application (leadController.ts) and do not rely on this backfill.
UPDATE `lead` l
  JOIN `salesstage` s ON s.id = l.sales_stage_id
  SET l.order_won_at = l.updated_at
  WHERE s.name = 'Order Won' AND l.order_won_at IS NULL;

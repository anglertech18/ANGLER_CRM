-- Migration: Add Remarks to Payment Collection History
-- Date: 2026-07-10
-- Description: CR9 — the Collection History popup now needs to display a Remarks
--              column per payment entry (e.g. "Advance Collection", "Final Collection").
--              collection_date already exists and is already settable per-row; no
--              change needed there — the "Add Collection" form added in CR9 simply
--              starts passing an explicit collection_date instead of always relying
--              on the column default.

ALTER TABLE lead_milestone_payment_history
  ADD COLUMN IF NOT EXISTS remarks VARCHAR(255) NULL AFTER collected_by_id;

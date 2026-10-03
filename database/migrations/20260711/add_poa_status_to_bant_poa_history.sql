-- Migration: Add POA Status to BANT POA History
-- Date: 2026-07-11
-- Description: CR11 — the Cashflow Report's new "POA History" popup (and the
--              existing Cashflow Tracker BANT POA history tab) need to display
--              a POA Status column per history entry (Date, POA, POA Status,
--              POA EDC, Updated By). The history table only ever captured
--              bant_poa/bant_poa_edc; poa_status changes were not logged at
--              all. This column starts capturing it going forward — rows
--              logged before this migration will show a blank POA Status,
--              since that value was never recorded historically.

ALTER TABLE lead_milestone_bant_poa_history
  ADD COLUMN IF NOT EXISTS poa_status VARCHAR(20) NULL AFTER bant_poa_edc;

-- Migration: Fix missing PRIMARY KEY / AUTO_INCREMENT on lead milestone history tables
-- Date: 2026-07-20
-- Description: CR13 — lead_milestone_payment_history and lead_milestone_bant_poa_history
--              were created (20260707_create_lead_milestone_history_tables.sql) with `id`
--              intended as an AUTO_INCREMENT PRIMARY KEY, but the deployed UAT table for
--              both ended up with `id` as a plain NOT NULL column — no PRIMARY KEY, no
--              AUTO_INCREMENT. Every insert into either table (payment collections and
--              BANT POA history) has therefore been failing with a null constraint
--              violation on `id` since the tables were created; the app-layer insert calls
--              swallow the error (log + continue) so this was silent — collections and POA
--              edits keep working, only their history trail is empty. Both tables were
--              confirmed empty (0 rows) before this migration, so no data is at risk.

ALTER TABLE `lead_milestone_payment_history`
  MODIFY COLUMN `id` INT NOT NULL AUTO_INCREMENT,
  ADD PRIMARY KEY (`id`);

ALTER TABLE `lead_milestone_bant_poa_history`
  MODIFY COLUMN `id` INT NOT NULL AUTO_INCREMENT,
  ADD PRIMARY KEY (`id`);

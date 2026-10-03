-- Migration: Make Cashflow Forecast device_count / milestone amount & percentage nullable
-- Date: 2026-07-22
-- Description: Device Count, milestone Expected Amount and Percentage are no longer
--              mandatory (not every product has a device count, and BDEs commonly add
--              or refine forecast milestones incrementally across multiple edits rather
--              than completing the whole plan in one save). If
--              20260721_create_cashflow_forecast_tables.sql already ran against this
--              database with the original NOT NULL definitions, saving a forecast/
--              milestone without those values now fails with a NOT NULL constraint
--              violation (500) — this migration relaxes the columns to NULL-able.
--              Safe to run even if the table was freshly created already nullable
--              (MODIFY COLUMN is idempotent).

ALTER TABLE `forecast_headers`
  MODIFY COLUMN `device_count` INT NULL;

ALTER TABLE `forecast_milestones`
  MODIFY COLUMN `expected_amount` DECIMAL(15,2) NULL,
  MODIFY COLUMN `percentage` DECIMAL(5,2) NULL;

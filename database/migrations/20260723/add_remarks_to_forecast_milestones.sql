-- Migration: Add remarks column to forecast_milestones
-- Date: 2026-07-23
-- Description: Cashflow Forecast Dashboard (md files/forecast/forecastUI.md) displays a
--              per-milestone "Remarks" column in the Forecast Table (e.g. "Waiting for
--              PO", "Customer Approval Pending"). forecast_milestones had no field for
--              this — adds an optional per-milestone remarks column, entered from the
--              Forecast Milestones editor on the Lead form alongside the existing
--              milestone fields.

ALTER TABLE `forecast_milestones`
  ADD COLUMN IF NOT EXISTS `remarks` TEXT NULL AFTER `expected_collection_date`;

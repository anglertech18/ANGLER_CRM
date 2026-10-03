-- Migration: Add expected_order_closure_date to forecast_headers
-- Date: 2026-08-27
-- Description: Section 9 (Order & Cashflow Forecast) on the Lead form now captures an
--              Expected Order Closure Date alongside the Expected Order Value. Nullable —
--              existing forecasts and forecasts saved without a date are unaffected.

ALTER TABLE `forecast_headers`
  ADD COLUMN IF NOT EXISTS `expected_order_closure_date` DATETIME(3) NULL AFTER `expected_order_value`;

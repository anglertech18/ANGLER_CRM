-- Per-user opt-in for the automated Daily Report cron, independent of the
-- user's general active/inactive status. Defaults to false: existing and new
-- users are excluded until explicitly enabled.
ALTER TABLE `user`
  ADD COLUMN `daily_report_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `reset_token_expiry`;

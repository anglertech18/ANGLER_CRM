-- Migration: Indexes for the Dashboard "Sales Activities" cards
-- Date: 2026-08-05
-- Purpose: Category 2 of the dashboard revamp counts leads by their Sales
--          Engagement Date (`lead.follow_up_datetime`) and Call Tracker
--          follow-ups still outside the pipeline (`calltracker.next_follow_up_date`
--          + `pipeline_action`). Both columns were previously unindexed, so each
--          dashboard load produced a full table scan. The same indexes also serve
--          the new Lead Report engagement-date filter and the Call Tracker
--          follow-up window filter.
--
-- No data is added, changed or removed by this migration.

-- MySQL has no `CREATE INDEX IF NOT EXISTS`, so each index is created only when
-- it is absent, keeping the migration safe to re-run.

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'lead'
        AND index_name = 'idx_lead_follow_up_datetime'
    ),
    'SELECT "idx_lead_follow_up_datetime already exists" AS msg',
    'CREATE INDEX `idx_lead_follow_up_datetime` ON `lead` (`follow_up_datetime`)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'calltracker'
        AND index_name = 'idx_calltracker_next_follow_up_pipeline'
    ),
    'SELECT "idx_calltracker_next_follow_up_pipeline already exists" AS msg',
    'CREATE INDEX `idx_calltracker_next_follow_up_pipeline` ON `calltracker` (`next_follow_up_date`, `pipeline_action`)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

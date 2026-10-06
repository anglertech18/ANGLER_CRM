-- ============================================================================
-- Migration: Renewal Phase 4 — Sprint 3 (New Fields + Masters)
-- Date: 2026-07-26
-- Changes:
--   1. ADD COLUMN email_count     (INT NULL)    → renewal_service_instance
--   2. ADD COLUMN provider_type    (VARCHAR(20)) → renewal_service_instance
--   3. ADD COLUMN server_name      (VARCHAR(255)) → renewal_service_instance
--   4. INSERT provider 'Zoho Email Server'
--   5. INSERT service master 'Website AMC' under AMC category
-- ============================================================================

-- ── 1. New columns on renewal_service_instance ──────────────────────────────

ALTER TABLE renewal_service_instance
  ADD COLUMN IF NOT EXISTS email_count    INT          NULL AFTER quantity,
  ADD COLUMN IF NOT EXISTS provider_type  VARCHAR(20)  NULL AFTER email_count,
  ADD COLUMN IF NOT EXISTS server_name    VARCHAR(255) NULL AFTER provider_type;

-- Index for provider_type filtering
CREATE INDEX IF NOT EXISTS idx_renewal_instance_provider_type
  ON renewal_service_instance(provider_type);

-- ── 2. Insert Zoho Email Server provider ───────────────────────────────────

INSERT IGNORE INTO renewal_provider (name, is_active, created_at, updated_at)
VALUES ('Zoho Email Server', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ── 3. Insert Website AMC service master ───────────────────────────────────

-- Get the AMC category ID
SET @amc_cat_id := (SELECT id FROM renewal_service_category WHERE code = 'AMC' LIMIT 1);

INSERT IGNORE INTO renewal_service_master
  (name, category_id, identifier_label, requires_identifier,
   default_duration_value, default_duration_unit,
   supports_quantity, supports_provider, supports_amc, supports_support_package,
   sort_order, is_active, created_at, updated_at)
SELECT 'Website AMC', @amc_cat_id, 'Website URL', 1,
       12, 'months',
       0, 1, 0, 0,
       5, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM renewal_service_master
  WHERE name = 'Website AMC' AND category_id = @amc_cat_id
);

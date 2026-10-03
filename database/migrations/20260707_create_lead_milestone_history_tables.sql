-- Migration: Payment Collection History & BANT POA History for Lead Milestones
-- Date: 2026-07-07
-- Description: CR1 — lead_milestone.actual_amount and bant_poa/bant_poa_edc were being
--              overwritten on every update, losing prior payment collections and BANT POA
--              audit trail (breaking month-wise cashflow reporting). These new append-only
--              history tables record every payment collection and every BANT POA update as
--              a separate row. A backfill below seeds one history row per existing milestone
--              so legacy data isn't lost once reporting switches to reading from history.

CREATE TABLE IF NOT EXISTS `lead_milestone_payment_history` (
  `id`                INT NOT NULL AUTO_INCREMENT,
  `lead_milestone_id` INT NOT NULL,
  `lead_id`           INT NOT NULL,
  `collected_amount`  DECIMAL(15,2) NOT NULL,
  `collection_date`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `collected_by_id`   INT NULL,
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `lmph_lead_milestone_id_collection_date_idx` (`lead_milestone_id`, `collection_date`),
  KEY `lmph_lead_id_collection_date_idx` (`lead_id`, `collection_date`),
  KEY `lmph_collected_by_id_fkey` (`collected_by_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_milestone_bant_poa_history` (
  `id`                INT NOT NULL AUTO_INCREMENT,
  `lead_milestone_id` INT NOT NULL,
  `lead_id`           INT NOT NULL,
  `bant_poa`          TEXT NULL,
  `bant_poa_edc`      DATETIME(3) NULL,
  `updated_by_id`     INT NULL,
  `updated_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `lmbph_lead_milestone_id_updated_at_idx` (`lead_milestone_id`, `updated_at`),
  KEY `lmbph_lead_id_updated_at_idx` (`lead_id`, `updated_at`),
  KEY `lmbph_updated_by_id_fkey` (`updated_by_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys (added separately so table creation above is order-independent)

ALTER TABLE `lead_milestone_payment_history`
  ADD CONSTRAINT `lmph_lead_milestone_id_fkey` FOREIGN KEY IF NOT EXISTS (`lead_milestone_id`) REFERENCES `lead_milestone` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lmph_lead_id_fkey` FOREIGN KEY IF NOT EXISTS (`lead_id`) REFERENCES `lead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lmph_collected_by_id_fkey` FOREIGN KEY IF NOT EXISTS (`collected_by_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `lead_milestone_bant_poa_history`
  ADD CONSTRAINT `lmbph_lead_milestone_id_fkey` FOREIGN KEY IF NOT EXISTS (`lead_milestone_id`) REFERENCES `lead_milestone` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lmbph_lead_id_fkey` FOREIGN KEY IF NOT EXISTS (`lead_id`) REFERENCES `lead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lmbph_updated_by_id_fkey` FOREIGN KEY IF NOT EXISTS (`updated_by_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: seed one payment-history row per existing milestone that already has a
-- nonzero actual_amount, so legacy collections aren't lost from reporting once the
-- report switches to reading from history. Uses the milestone's updated_at (or
-- created_at as a fallback) as a best-available proxy for "when this money was
-- collected" — exact original per-installment dates aren't recoverable from the old
-- schema, so legacy collections are recorded as a single lump-sum entry.
INSERT INTO `lead_milestone_payment_history`
  (`lead_milestone_id`, `lead_id`, `collected_amount`, `collection_date`, `collected_by_id`, `created_at`)
SELECT
  lm.`id`,
  lm.`lead_id`,
  lm.`actual_amount`,
  COALESCE(lm.`updated_at`, lm.`created_at`, CURRENT_TIMESTAMP(3)),
  NULL,
  CURRENT_TIMESTAMP(3)
FROM `lead_milestone` lm
WHERE lm.`actual_amount` IS NOT NULL AND lm.`actual_amount` > 0
  AND NOT EXISTS (
    SELECT 1 FROM `lead_milestone_payment_history` h WHERE h.`lead_milestone_id` = lm.`id`
  );

-- Backfill: seed one BANT POA history row per existing milestone that already has a
-- bant_poa value, so the audit trail isn't empty for legacy data.
INSERT INTO `lead_milestone_bant_poa_history`
  (`lead_milestone_id`, `lead_id`, `bant_poa`, `bant_poa_edc`, `updated_by_id`, `updated_at`)
SELECT
  lm.`id`,
  lm.`lead_id`,
  lm.`bant_poa`,
  lm.`bant_poa_edc`,
  NULL,
  COALESCE(lm.`updated_at`, lm.`created_at`, CURRENT_TIMESTAMP(3))
FROM `lead_milestone` lm
WHERE lm.`bant_poa` IS NOT NULL AND lm.`bant_poa` <> ''
  AND NOT EXISTS (
    SELECT 1 FROM `lead_milestone_bant_poa_history` h WHERE h.`lead_milestone_id` = lm.`id`
  );

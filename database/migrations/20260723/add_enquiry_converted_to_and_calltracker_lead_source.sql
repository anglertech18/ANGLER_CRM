-- Migration: Enquiry "Converted To" dropdown + Call Tracker Lead Source
-- Date: 2026-07-23
-- Description: Adds converted_to to Enquiry to record whether an enquiry was
--              converted to a Lead or directly to a Call Tracker entry, and
--              adds lead_source_id to CallTracker (sourced from Lead Source Master).

ALTER TABLE `enquiry`
  ADD COLUMN IF NOT EXISTS `converted_to` VARCHAR(20) NULL DEFAULT NULL AFTER `is_converted`;

-- Backfill existing converted enquiries as "Lead" (previous behavior always created a Lead)
UPDATE `enquiry` SET `converted_to` = 'Lead' WHERE `is_converted` = 1 AND `converted_to` IS NULL;

ALTER TABLE `calltracker`
  ADD COLUMN IF NOT EXISTS `lead_source_id` INT NULL DEFAULT NULL AFTER `industry_id`;

ALTER TABLE `calltracker`
  ADD CONSTRAINT `fk_calltracker_lead_source`
  FOREIGN KEY IF NOT EXISTS (`lead_source_id`)
  REFERENCES `leadsource` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS `idx_calltracker_lead_source_id` ON `calltracker` (`lead_source_id`);

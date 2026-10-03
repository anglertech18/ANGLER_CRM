-- Migration: Rename "Moved to Quadrant" to "Move to Pipeline" on Call Tracker
-- Date: 2026-07-04
-- Description: Adds pipeline_action to CallTracker to track the selected pipeline
--              route (Quadrant / Nurturing / Enquiry) and links Enquiry back to the
--              originating CallTracker record when "Move to Enquiry" is selected.

ALTER TABLE `calltracker`
  ADD COLUMN IF NOT EXISTS `pipeline_action` VARCHAR(20) NULL DEFAULT NULL AFTER `moved_to_quad`;

ALTER TABLE `enquiry`
  ADD COLUMN IF NOT EXISTS `call_tracker_id` INT NULL DEFAULT NULL AFTER `converted_lead_id`;

ALTER TABLE `enquiry`
  ADD CONSTRAINT `fk_enquiry_call_tracker`
  FOREIGN KEY IF NOT EXISTS (`call_tracker_id`)
  REFERENCES `calltracker` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS `idx_enquiry_call_tracker_id` ON `enquiry` (`call_tracker_id`);

-- Migration: Add Status field to followuplog
-- Date: 2026-08-06
-- Description: Adds an editable "Status" field (Pending / In Progress / Completed) to
--              each Sales Engagement & Activity Log entry, so a follow-up log's
--              progress can be tracked and updated inline from the Lead Detail /
--              Lead Form's Sales Engagement & Activity Log table.

ALTER TABLE `followuplog`
  ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) NOT NULL DEFAULT 'Pending' AFTER `notes`;

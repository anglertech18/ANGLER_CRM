-- Migration: Add Follow-up Note and Follow-up Status to calltracker
-- Date: 2026-08-08
-- Description: Adds a free-text "Follow-up Note" and a tracked "Follow-up Status"
--              (Pending / In Progress / Closed, defaults to Pending) to the Call
--              Tracker's Engagement & Outcome section, next to Next Follow-up Date.

ALTER TABLE `calltracker`
  ADD COLUMN IF NOT EXISTS `follow_up_note` TEXT NULL AFTER `next_follow_up_date`,
  ADD COLUMN IF NOT EXISTS `follow_up_status` VARCHAR(20) NOT NULL DEFAULT 'Pending' AFTER `follow_up_note`;

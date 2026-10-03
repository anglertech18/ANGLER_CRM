-- Migration: Add Email/LinkedIn Connection target + SWAT performance fields
-- Date: 2026-07-24
-- Description: md files/swat/swatUpdate.md — adds two new per-user daily targets
--              (Email Target, LinkedIn Connection Target) to userproducttarget,
--              and two new SWAT Performance activities (Email Campaign, LinkedIn
--              Connection Sent) to swatperformance. Does not modify any existing
--              column or business logic.

ALTER TABLE `userproducttarget`
  ADD COLUMN IF NOT EXISTS `email_target` INT NULL DEFAULT 0 AFTER `direct_visit_target`,
  ADD COLUMN IF NOT EXISTS `linkedin_connection_target` INT NULL DEFAULT 0 AFTER `email_target`;

ALTER TABLE `swatperformance`
  ADD COLUMN IF NOT EXISTS `email_campaign_target` INT NOT NULL DEFAULT 0 AFTER `direct_visit_remarks`,
  ADD COLUMN IF NOT EXISTS `email_campaign_achieved` INT NOT NULL DEFAULT 0 AFTER `email_campaign_target`,
  ADD COLUMN IF NOT EXISTS `email_campaign_remarks` TEXT NULL AFTER `email_campaign_achieved`,
  ADD COLUMN IF NOT EXISTS `linkedin_connection_target` INT NOT NULL DEFAULT 0 AFTER `email_campaign_remarks`,
  ADD COLUMN IF NOT EXISTS `linkedin_connection_achieved` INT NOT NULL DEFAULT 0 AFTER `linkedin_connection_target`,
  ADD COLUMN IF NOT EXISTS `linkedin_connection_remarks` TEXT NULL AFTER `linkedin_connection_achieved`;

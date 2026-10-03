-- Migration: Add Proposals Target to userproducttarget
-- Date: 2026-07-24
-- Description: Adds a "Proposals Target" field to Target Management (userproducttarget)
--              so it can be centrally set per user, matching the pattern used for
--              Calls/LinkedIn/Direct Visit/Email/LinkedIn Connection targets. The SWAT
--              Performance Form's "Proposals" target now syncs from this value instead
--              of being typed manually each day. Does not modify any existing column.

ALTER TABLE `userproducttarget`
  ADD COLUMN IF NOT EXISTS `proposals_target` INT NULL DEFAULT 0 AFTER `linkedin_connection_target`;

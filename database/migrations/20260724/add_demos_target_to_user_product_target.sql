-- Migration: Add Demos Target to userproducttarget
-- Date: 2026-07-24
-- Description: Adds a "Demo Target" field to Target Management (userproducttarget),
--              matching the pattern used for Proposals/Calls/LinkedIn/Direct Visit/
--              Email/LinkedIn Connection targets. The SWAT Performance Form's "Demos"
--              target now syncs from this value instead of being typed manually each
--              day. Does not modify any existing column.

ALTER TABLE `userproducttarget`
  ADD COLUMN IF NOT EXISTS `demos_target` INT NULL DEFAULT 0 AFTER `proposals_target`;

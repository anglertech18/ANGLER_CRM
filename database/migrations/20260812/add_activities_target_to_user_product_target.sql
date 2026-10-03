-- Migration: Add Activities Target to userproducttarget
-- Date: 2026-08-12
-- Description: Adds an "Activities Target" field to Target Management
--              (userproducttarget), matching the pattern used for
--              Demos/Proposals/Calls/LinkedIn/Direct Visit/Email/LinkedIn
--              Connection targets. The SWAT Performance Form's "Activities"
--              target now syncs directly from this configured value instead
--              of being computed as calls_target + linkedin_target.
--              Achievement value/flow for Activities is unchanged.
--              Does not modify any existing column.

ALTER TABLE `userproducttarget`
  ADD COLUMN IF NOT EXISTS `activities_target` INT NULL DEFAULT 0 AFTER `demos_target`;

-- Migration: Add Project Name / Order Name to lead
-- Date: 2026-07-28
-- Description: Adds an optional "Project Name / Order Name" text field to the Lead
--              module (Section 3: Opportunity & Lead Management), placed after the
--              Product field. Captures the customer's project or order reference.

ALTER TABLE `lead`
  ADD COLUMN IF NOT EXISTS `project_name` VARCHAR(255) NULL DEFAULT NULL AFTER `product_id`;

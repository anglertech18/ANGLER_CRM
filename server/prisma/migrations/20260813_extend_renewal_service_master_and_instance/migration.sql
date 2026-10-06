-- Migration: Extend RenewalServiceMaster and RenewalServiceInstance for dynamic field configuration
-- Date: 2026-08-13
-- Purpose: Add flags for controlling field visibility/requiredness and new fields for ANGLER/TRINETRA requirements
-- 
-- NOTE: This migration is BLOCKED by pre-existing migration history issue:
-- Migration 20260704120000_create_cashflow_and_dailyreport_tables has a foreign key constraint error
-- Error: Can't create table `cashflow_tracker` (errno: 150 "Foreign key constraint is incorrectly formed")
-- 
-- This issue must be resolved by database administrator before this migration can be applied.
-- The schema changes are ready in schema.prisma and will be applied when migration history is fixed.

-- Step 1: Add new columns to RenewalServiceMaster
ALTER TABLE `renewal_service_master`
  ADD COLUMN `requires_provider` BOOLEAN NOT NULL DEFAULT 0 AFTER `supports_provider`,
  ADD COLUMN `supports_server_name` BOOLEAN NOT NULL DEFAULT 1 AFTER `requires_provider`,
  ADD COLUMN `requires_server_name` BOOLEAN NOT NULL DEFAULT 0 AFTER `supports_server_name`,
  ADD COLUMN `supports_plan_name` BOOLEAN NOT NULL DEFAULT 1 AFTER `requires_server_name`,
  ADD COLUMN `requires_plan_name` BOOLEAN NOT NULL DEFAULT 0 AFTER `supports_plan_name`,
  ADD COLUMN `supports_login_username` BOOLEAN NOT NULL DEFAULT 0 AFTER `requires_plan_name`,
  ADD COLUMN `requires_login_username` BOOLEAN NOT NULL DEFAULT 0 AFTER `supports_login_username`,
  ADD COLUMN `requires_quantity` BOOLEAN NOT NULL DEFAULT 0 AFTER `supports_quantity`,
  ADD COLUMN `quantity_label` VARCHAR(100) NULL AFTER `requires_quantity`;

-- Step 2: Add new columns to RenewalServiceInstance
ALTER TABLE `renewal_service_instance`
  ADD COLUMN `login_username` VARCHAR(200) NULL AFTER `unit_price`,
  ADD COLUMN `service_transaction_type` VARCHAR(50) NULL AFTER `login_username`;

-- Step 3: Add missing relation to RenewalServiceCategory (parent-child hierarchy)
ALTER TABLE `renewal_service_category`
  ADD COLUMN `parent_id` INT NULL AFTER `is_active`,
  ADD INDEX `idx_parent_id` (`parent_id`);

-- Step 4: Add missing relation columns to RenewalServiceMaster
ALTER TABLE `renewal_service_master`
  ADD COLUMN `sub_category_id` INT NULL AFTER `updated_at`,
  ADD INDEX `idx_sub_category_id` (`sub_category_id`);

-- Step 5: Add foreign key for category parent-child
ALTER TABLE `renewal_service_category`
  ADD CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `renewal_service_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Add foreign key for service master sub-category
ALTER TABLE `renewal_service_master`
  ADD CONSTRAINT `fk_service_master_sub_category` FOREIGN KEY (`sub_category_id`) REFERENCES `renewal_service_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Add missing indexes for RenewalServiceMaster
ALTER TABLE `renewal_service_master`
  ADD INDEX `idx_category_id` (`category_id`),
  ADD INDEX `idx_is_active` (`is_active`);

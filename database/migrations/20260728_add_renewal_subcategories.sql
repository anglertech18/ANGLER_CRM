-- Migration: Add parent_id to renewal_service_category and sub_category_id to renewal_service_master
-- Date: 2026-07-28

ALTER TABLE `renewal_service_category`
ADD COLUMN `parent_id` INT NULL AFTER `sort_order`,
ADD CONSTRAINT `fk_renewal_service_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `renewal_service_category` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_service_master`
ADD COLUMN `sub_category_id` INT NULL AFTER `category_id`,
ADD CONSTRAINT `fk_renewal_service_master_sub_category` FOREIGN KEY (`sub_category_id`) REFERENCES `renewal_service_category` (`id`) ON DELETE SET NULL;

-- Migration: Add company_id to Product table
-- Date: 2026-06-29
-- Description: Link products to a Company via company_id FK

ALTER TABLE `product`
  ADD COLUMN IF NOT EXISTS `company_id` INT NULL DEFAULT NULL AFTER `count_type`;

ALTER TABLE `product`
  ADD CONSTRAINT `fk_product_company`
  FOREIGN KEY IF NOT EXISTS (`company_id`)
  REFERENCES `company` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS `idx_product_company_id` ON `product` (`company_id`);

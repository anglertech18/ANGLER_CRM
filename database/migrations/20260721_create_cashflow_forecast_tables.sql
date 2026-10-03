-- Migration: Create Cashflow Forecast tables
-- Date: 2026-07-21
-- Description: Cashflow Forecast module (md files/forecast/forecast.md) — lets a BDE
--              mark a Lead as "Expected Order" while still in the pipeline, forecast
--              its value/device count/vertical and plan payment milestones against it,
--              purely for management visibility. Fully independent of cashflow_tracker
--              and lead_milestone. forecast_headers/forecast_milestones are deleted the
--              moment the owning lead resolves to Order Won or Lost (see
--              leadController.ts updateLead). Table/column names match schema.prisma
--              exactly so this works under production's case-sensitive MySQL collation.

CREATE TABLE IF NOT EXISTS `forecast_headers` (
  `id`                   INT NOT NULL AUTO_INCREMENT,
  `lead_id`              INT NOT NULL,
  `company_id`           INT NULL,
  `product_id`           INT NULL,
  `user_id`              INT NULL,
  `vertical_id`          INT NULL,
  `expected_order_value` DECIMAL(15,2) NOT NULL,
  `device_count`         INT NULL,
  `remarks`              TEXT NULL,
  `status`               VARCHAR(30) NOT NULL DEFAULT 'Forecast',
  `created_at`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`           DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forecast_headers_lead_id_key` (`lead_id`),
  KEY `forecast_headers_company_id_fkey` (`company_id`),
  KEY `forecast_headers_product_id_fkey` (`product_id`),
  KEY `forecast_headers_user_id_fkey` (`user_id`),
  KEY `forecast_headers_vertical_id_fkey` (`vertical_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `forecast_milestones` (
  `id`                       INT NOT NULL AUTO_INCREMENT,
  `forecast_id`              INT NOT NULL,
  `milestone_master_id`      INT NULL,
  `expected_amount`          DECIMAL(15,2) NULL,
  `percentage`               DECIMAL(5,2) NULL,
  `expected_collection_date` DATETIME(3) NOT NULL,
  `status`                   VARCHAR(20) NOT NULL DEFAULT 'Upcoming',
  `created_at`               DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`               DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `forecast_milestones_forecast_id_fkey` (`forecast_id`),
  KEY `forecast_milestones_milestone_master_id_fkey` (`milestone_master_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys (added separately so table creation above is order-independent)

ALTER TABLE `forecast_headers`
  ADD CONSTRAINT `forecast_headers_lead_id_fkey` FOREIGN KEY IF NOT EXISTS (`lead_id`) REFERENCES `lead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `forecast_headers_company_id_fkey` FOREIGN KEY IF NOT EXISTS (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `forecast_headers_product_id_fkey` FOREIGN KEY IF NOT EXISTS (`product_id`) REFERENCES `product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `forecast_headers_user_id_fkey` FOREIGN KEY IF NOT EXISTS (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `forecast_headers_vertical_id_fkey` FOREIGN KEY IF NOT EXISTS (`vertical_id`) REFERENCES `vertical` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `forecast_milestones`
  ADD CONSTRAINT `forecast_milestones_forecast_id_fkey` FOREIGN KEY IF NOT EXISTS (`forecast_id`) REFERENCES `forecast_headers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `forecast_milestones_milestone_master_id_fkey` FOREIGN KEY IF NOT EXISTS (`milestone_master_id`) REFERENCES `paymenttype` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

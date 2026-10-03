-- Migration: Create Cashflow Tracker, Lead Milestone, Daily Report tables
-- Date: 2026-07-05
-- Description: These tables exist in schema.prisma and in the dev database (added via
--              ad-hoc SQL / db push) but were never created on production, causing
--              P2021 "table does not exist" errors for client_company / lead_milestone
--              when saving a Lead. Table names/casing below match schema.prisma exactly
--              (either the model's explicit @@map, or the default PascalCase model name
--              where no @@map is set) so this works correctly under production's
--              case-sensitive MySQL collation.

CREATE TABLE IF NOT EXISTS `client_company` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(191) NOT NULL,
  `is_active`  BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_company_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vertical` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(191) NOT NULL,
  `is_active`  BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Vertical_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `paymenttype` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(191) NOT NULL,
  `is_active`  BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PaymentType_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cashflow_tracker` (
  `id`                     INT NOT NULL AUTO_INCREMENT,
  `executive_id`           INT NOT NULL,
  `product_id`             INT NULL,
  `client_company_id`      INT NULL,
  `vertical_id`            INT NULL,
  `payment_type_id`        INT NULL,
  `expected_cashflow`      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `actual_received`        DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `monthly_stretch_target` DECIMAL(15,2) NULL,
  `edc`                    DATETIME(3) NULL,
  `revised_edc`            DATETIME(3) NULL,
  `bant_poa`               VARCHAR(191) NULL,
  `bant_poa_edc`           DATETIME(3) NULL,
  `notes`                  TEXT NULL,
  `created_at`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`             DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cashflow_tracker_executive_id_fkey` (`executive_id`),
  KEY `cashflow_tracker_product_id_fkey` (`product_id`),
  KEY `cashflow_tracker_client_company_id_fkey` (`client_company_id`),
  KEY `cashflow_tracker_vertical_id_fkey` (`vertical_id`),
  KEY `cashflow_tracker_payment_type_id_fkey` (`payment_type_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cashflow_milestone` (
  `id`                  INT NOT NULL AUTO_INCREMENT,
  `cashflow_tracker_id` INT NOT NULL,
  `name`                VARCHAR(191) NOT NULL,
  `amount`              DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `received_amount`     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status`              VARCHAR(191) NOT NULL DEFAULT 'Yet To Start',
  `created_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cashflow_milestone_cashflow_tracker_id_fkey` (`cashflow_tracker_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_milestone` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `lead_id`         INT NOT NULL,
  `payment_type_id` INT NULL,
  `percentage`      DECIMAL(5,2) NULL,
  `expected_amount` DECIMAL(15,2) NULL,
  `actual_amount`   DECIMAL(15,2) NULL,
  `edc`             DATETIME(3) NULL,
  `revised_edc`     DATETIME(3) NULL,
  `bant_poa`        VARCHAR(191) NULL,
  `bant_poa_edc`    DATETIME(3) NULL,
  `status`          VARCHAR(191) NOT NULL DEFAULT 'Yet To Start',
  `created_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lead_milestone_lead_id_fkey` (`lead_id`),
  KEY `lead_milestone_payment_type_id_fkey` (`payment_type_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dailyreport` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `report_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by`  INT NOT NULL,
  `to_user_id`  INT NOT NULL,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'submitted',
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `DailyReport_created_by_fkey` (`created_by`),
  KEY `DailyReport_to_user_id_fkey` (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dailyreportentry` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `daily_report_id` INT NOT NULL,
  `product_id`      INT NOT NULL,
  `lead_id`         INT NOT NULL,
  `quadrant`        VARCHAR(191) NULL,
  `remarks`         TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `DailyReportEntry_daily_report_id_fkey` (`daily_report_id`),
  KEY `DailyReportEntry_product_id_fkey` (`product_id`),
  KEY `DailyReportEntry_lead_id_fkey` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys (added separately so table creation above is order-independent)

ALTER TABLE `cashflow_tracker`
  ADD CONSTRAINT `cashflow_tracker_executive_id_fkey` FOREIGN KEY IF NOT EXISTS (`executive_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `cashflow_tracker_product_id_fkey` FOREIGN KEY IF NOT EXISTS (`product_id`) REFERENCES `product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cashflow_tracker_client_company_id_fkey` FOREIGN KEY IF NOT EXISTS (`client_company_id`) REFERENCES `client_company` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cashflow_tracker_vertical_id_fkey` FOREIGN KEY IF NOT EXISTS (`vertical_id`) REFERENCES `vertical` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cashflow_tracker_payment_type_id_fkey` FOREIGN KEY IF NOT EXISTS (`payment_type_id`) REFERENCES `paymenttype` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `cashflow_milestone`
  ADD CONSTRAINT `cashflow_milestone_cashflow_tracker_id_fkey` FOREIGN KEY IF NOT EXISTS (`cashflow_tracker_id`) REFERENCES `cashflow_tracker` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `lead_milestone`
  ADD CONSTRAINT `lead_milestone_lead_id_fkey` FOREIGN KEY IF NOT EXISTS (`lead_id`) REFERENCES `lead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lead_milestone_payment_type_id_fkey` FOREIGN KEY IF NOT EXISTS (`payment_type_id`) REFERENCES `paymenttype` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `dailyreport`
  ADD CONSTRAINT `DailyReport_created_by_fkey` FOREIGN KEY IF NOT EXISTS (`created_by`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `DailyReport_to_user_id_fkey` FOREIGN KEY IF NOT EXISTS (`to_user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `dailyreportentry`
  ADD CONSTRAINT `DailyReportEntry_daily_report_id_fkey` FOREIGN KEY IF NOT EXISTS (`daily_report_id`) REFERENCES `dailyreport` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `DailyReportEntry_product_id_fkey` FOREIGN KEY IF NOT EXISTS (`product_id`) REFERENCES `product` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `DailyReportEntry_lead_id_fkey` FOREIGN KEY IF NOT EXISTS (`lead_id`) REFERENCES `lead` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

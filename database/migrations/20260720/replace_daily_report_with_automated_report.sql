-- Replace manual "Daily Report" feature with the automated, cron-generated Daily Report.
-- The previous dailyreport/dailyreportentry tables backed a manual SalesPerson-submitted
-- form (pick leads, write remarks, email one recipient). Per md files/daily_report/scopeForReport.md
-- this is replaced by a daily cron job that auto-generates a per-employee, per-product report
-- (Lead Activity + SWAT Activity Summary) and emails it to the employee's Company recipient.

-- Recipient email per Company (Company Master), instead of hardcoding.
ALTER TABLE `company`
  ADD COLUMN IF NOT EXISTS `report_recipient_email` VARCHAR(255) NULL;

-- Old manual-submission tables are superseded; no data migration needed (feature replaced, not extended).
DROP TABLE IF EXISTS `dailyreportentry`;
DROP TABLE IF EXISTS `dailyreport`;

CREATE TABLE IF NOT EXISTS `dailyreport` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `report_date` DATE NOT NULL,
  `user_id` INT NOT NULL,
  `company_id` INT NOT NULL,
  `recipient_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `email_html` LONGTEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'generated',
  `error_message` TEXT NULL,
  `sent_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_dailyreport_user_date` (`user_id`, `report_date`),
  KEY `idx_dailyreport_report_date` (`report_date`),
  CONSTRAINT `fk_dailyreport_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dailyreport_company` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `dailyreportproduct` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `daily_report_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  KEY `idx_dailyreportproduct_report` (`daily_report_id`),
  CONSTRAINT `fk_dailyreportproduct_report` FOREIGN KEY (`daily_report_id`) REFERENCES `dailyreport`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dailyreportproduct_product` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `dailyreportlead` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `daily_report_product_id` INT NOT NULL,
  `lead_id` INT NULL,
  `lead_name` VARCHAR(255) NOT NULL,
  `quadrant` VARCHAR(20) NULL,
  `follow_up_notes` TEXT NOT NULL,
  KEY `idx_dailyreportlead_product` (`daily_report_product_id`),
  CONSTRAINT `fk_dailyreportlead_product` FOREIGN KEY (`daily_report_product_id`) REFERENCES `dailyreportproduct`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dailyreportlead_lead` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `dailyreportswatmetric` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `daily_report_product_id` INT NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `target` INT NOT NULL DEFAULT 0,
  `achieved` INT NOT NULL DEFAULT 0,
  KEY `idx_dailyreportswatmetric_product` (`daily_report_product_id`),
  CONSTRAINT `fk_dailyreportswatmetric_product` FOREIGN KEY (`daily_report_product_id`) REFERENCES `dailyreportproduct`(`id`) ON DELETE CASCADE
);

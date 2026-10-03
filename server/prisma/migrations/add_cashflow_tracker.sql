-- Add CashflowTracker table
CREATE TABLE IF NOT EXISTS `cashflow_tracker` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `executive_id` INT NOT NULL,
  `client_company_id` INT NULL,
  `vertical_id` INT NULL,
  `payment_type_id` INT NULL,
  `expected_cashflow` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `actual_received` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `edc` DATETIME(3) NULL,
  `revised_edc` DATETIME(3) NULL,
  `bant_poa` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `cashflow_tracker_executive_fkey`
    FOREIGN KEY (`executive_id`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cashflow_tracker_client_company_fkey`
    FOREIGN KEY (`client_company_id`) REFERENCES `client_company` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `cashflow_tracker_vertical_fkey`
    FOREIGN KEY (`vertical_id`) REFERENCES `Vertical` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `cashflow_tracker_payment_type_fkey`
    FOREIGN KEY (`payment_type_id`) REFERENCES `PaymentType` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add CashflowMilestone table
CREATE TABLE IF NOT EXISTS `cashflow_milestone` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cashflow_tracker_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `cashflow_milestone_tracker_fkey`
    FOREIGN KEY (`cashflow_tracker_id`) REFERENCES `cashflow_tracker` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

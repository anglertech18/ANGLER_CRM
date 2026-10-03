-- Add vertical_id to Lead table
ALTER TABLE `Lead`
  ADD COLUMN IF NOT EXISTS `vertical_id` INT NULL;

ALTER TABLE `Lead`
  ADD CONSTRAINT `Lead_vertical_id_fkey`
    FOREIGN KEY (`vertical_id`) REFERENCES `Vertical` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add timestamps to Vertical table if missing
ALTER TABLE `Vertical`
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Add timestamps to PaymentType table if missing
ALTER TABLE `paymenttype`
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Add missing columns to cashflow_tracker if not present
ALTER TABLE `cashflow_tracker`
  ADD COLUMN IF NOT EXISTS `bant_poa_edc` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `product_id` INT NULL,
  ADD COLUMN IF NOT EXISTS `monthly_stretch_target` DECIMAL(15,2) NULL;

-- Create LeadMilestone table
CREATE TABLE IF NOT EXISTS `lead_milestone` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lead_id` INT NOT NULL,
  `payment_type_id` INT NULL,
  `percentage` DECIMAL(5,2) NULL,
  `expected_amount` DECIMAL(15,2) NULL,
  `actual_amount` DECIMAL(15,2) NULL,
  `edc` DATETIME(3) NULL,
  `revised_edc` DATETIME(3) NULL,
  `bant_poa` VARCHAR(50) NULL,
  `bant_poa_edc` DATETIME(3) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Yet To Start',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `lead_milestone_lead_fkey`
    FOREIGN KEY (`lead_id`) REFERENCES `Lead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lead_milestone_payment_type_fkey`
    FOREIGN KEY (`payment_type_id`) REFERENCES `paymenttype` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

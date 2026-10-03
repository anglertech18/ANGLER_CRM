-- Add ClientCompany Master table
CREATE TABLE IF NOT EXISTS `client_company` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ClientCompany_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add missing columns if table already existed without them
ALTER TABLE `client_company`
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Add client_company_id column to Lead table
ALTER TABLE `Lead`
  ADD COLUMN IF NOT EXISTS `client_company_id` INT NULL,
  ADD CONSTRAINT `Lead_client_company_id_fkey`
    FOREIGN KEY (`client_company_id`) REFERENCES `client_company` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add Vertical Master table
CREATE TABLE IF NOT EXISTS `vertical` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Vertical_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add PaymentType Master table
CREATE TABLE IF NOT EXISTS `paymenttype` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PaymentType_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

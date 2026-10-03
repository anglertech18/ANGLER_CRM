-- Migration: Add individual columns to BulkUploadStaging (task17)
-- Replaces JSON storage in mapped_data with dedicated columns

-- Make existing JSON columns optional (backward compatibility during migration)
ALTER TABLE `BulkUploadStaging`
    MODIFY COLUMN `original_row_data` LONGTEXT NULL,
    MODIFY COLUMN `mapped_data` LONGTEXT NULL;

-- Add individual data columns
ALTER TABLE `BulkUploadStaging`
    ADD COLUMN `date`                    DATETIME(3) NULL,
    ADD COLUMN `industry_id`             INT NULL,
    ADD COLUMN `source_of_db_id`         INT NULL,
    ADD COLUMN `company_name`            VARCHAR(191) NULL,
    ADD COLUMN `location`                VARCHAR(191) NULL,
    ADD COLUMN `contact_person_name`     VARCHAR(191) NULL,
    ADD COLUMN `designation`             VARCHAR(191) NULL,
    ADD COLUMN `email_address`           VARCHAR(191) NULL,
    ADD COLUMN `personal_email`          VARCHAR(191) NULL,
    ADD COLUMN `mobile_no`              VARCHAR(191) NULL,
    ADD COLUMN `alternate_mobile_number` VARCHAR(191) NULL,
    ADD COLUMN `business_potential`      VARCHAR(191) NULL,
    ADD COLUMN `email_status_id`         INT NULL,
    ADD COLUMN `linkedin_sent`           TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN `call_status_id`          INT NULL,
    ADD COLUMN `next_follow_up_date`     DATETIME(3) NULL,
    ADD COLUMN `moved_to_quad`           VARCHAR(191) NULL,
    ADD COLUMN `remarks`                 LONGTEXT NULL;

-- Add foreign key constraints
ALTER TABLE `BulkUploadStaging`
    ADD CONSTRAINT `BulkUploadStaging_industry_id_fkey`     FOREIGN KEY (`industry_id`)     REFERENCES `Industry`(`id`)    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `BulkUploadStaging_source_of_db_id_fkey` FOREIGN KEY (`source_of_db_id`) REFERENCES `SourceOfDB`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `BulkUploadStaging_email_status_id_fkey` FOREIGN KEY (`email_status_id`) REFERENCES `EmailStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `BulkUploadStaging_call_status_id_fkey`  FOREIGN KEY (`call_status_id`)  REFERENCES `CallStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for frequently searched fields
CREATE INDEX `BulkUploadStaging_product_id_idx`          ON `BulkUploadStaging`(`product_id`);
CREATE INDEX `BulkUploadStaging_user_id_idx`             ON `BulkUploadStaging`(`user_id`);
CREATE INDEX `BulkUploadStaging_mobile_no_idx`           ON `BulkUploadStaging`(`mobile_no`);
CREATE INDEX `BulkUploadStaging_email_address_idx`       ON `BulkUploadStaging`(`email_address`);
CREATE INDEX `BulkUploadStaging_moved_to_calltracker_idx` ON `BulkUploadStaging`(`moved_to_calltracker`);

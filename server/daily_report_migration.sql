-- Daily Report Tables Migration

CREATE TABLE IF NOT EXISTS `DailyReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NOT NULL,
    `to_user_id` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'submitted',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `DailyReportEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `daily_report_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `lead_id` INTEGER NOT NULL,
    `quadrant` VARCHAR(191) NULL,
    `remarks` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DailyReport`
    ADD CONSTRAINT `DailyReport_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `DailyReport_to_user_id_fkey` FOREIGN KEY (`to_user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DailyReportEntry`
    ADD CONSTRAINT `DailyReportEntry_daily_report_id_fkey` FOREIGN KEY (`daily_report_id`) REFERENCES `DailyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `DailyReportEntry_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `DailyReportEntry_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

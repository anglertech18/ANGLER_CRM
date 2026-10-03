-- CreateTable
CREATE TABLE IF NOT EXISTS `Client_Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_company_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Vertical` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vertical_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `paymenttype` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Cashflow_Tracker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `executive_id` INTEGER NOT NULL,
    `client_company_id` INTEGER NULL,
    `vertical_id` INTEGER NULL,
    `payment_type_id` INTEGER NULL,
    `expected_cashflow` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `actual_received` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `edc` DATETIME(3) NULL,
    `revised_edc` DATETIME(3) NULL,
    `bant_poa` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `product_id` INTEGER NULL,
    `monthly_stretch_target` DECIMAL(15, 2) NULL,
    `bant_poa_edc` DATETIME(3) NULL,

    INDEX `cashflow_tracker_executive_id_fkey`(`executive_id`),
    INDEX `cashflow_tracker_client_company_id_fkey`(`client_company_id`),
    INDEX `cashflow_tracker_vertical_id_fkey`(`vertical_id`),
    INDEX `cashflow_tracker_payment_type_id_fkey`(`payment_type_id`),
    INDEX `cashflow_tracker_product_fkey`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Cashflow_Milestone` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cashflow_tracker_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `received_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Yet To Start',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cashflow_milestone_cashflow_tracker_id_fkey`(`cashflow_tracker_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `dailyreport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NOT NULL,
    `to_user_id` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'submitted',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `DailyReport_created_by_fkey`(`created_by`),
    INDEX `DailyReport_to_user_id_fkey`(`to_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `dailyreportentry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `daily_report_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `lead_id` INTEGER NOT NULL,
    `quadrant` VARCHAR(191) NULL,
    `remarks` TEXT NOT NULL,

    INDEX `DailyReportEntry_daily_report_id_fkey`(`daily_report_id`),
    INDEX `DailyReportEntry_product_id_fkey`(`product_id`),
    INDEX `DailyReportEntry_lead_id_fkey`(`lead_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `lead_milestone` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `payment_type_id` INTEGER NULL,
    `percentage` DECIMAL(5, 2) NULL,
    `expected_amount` DECIMAL(15, 2) NULL,
    `actual_amount` DECIMAL(15, 2) NULL,
    `edc` DATETIME(3) NULL,
    `revised_edc` DATETIME(3) NULL,
    `bant_poa` VARCHAR(191) NULL,
    `bant_poa_edc` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Yet To Start',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lead_milestone_lead_id_fkey`(`lead_id`),
    INDEX `lead_milestone_payment_type_id_fkey`(`payment_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cashflow_Tracker` ADD CONSTRAINT `cashflow_tracker_executive_id_fkey` FOREIGN KEY (`executive_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cashflow_Tracker` ADD CONSTRAINT `cashflow_tracker_client_company_id_fkey` FOREIGN KEY (`client_company_id`) REFERENCES `Client_Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cashflow_Tracker` ADD CONSTRAINT `cashflow_tracker_vertical_id_fkey` FOREIGN KEY (`vertical_id`) REFERENCES `Vertical`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cashflow_Tracker` ADD CONSTRAINT `cashflow_tracker_payment_type_id_fkey` FOREIGN KEY (`payment_type_id`) REFERENCES `PaymentType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cashflow_Tracker` ADD CONSTRAINT `cashflow_tracker_product_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cashflow_Milestone` ADD CONSTRAINT `cashflow_milestone_cashflow_tracker_id_fkey` FOREIGN KEY (`cashflow_tracker_id`) REFERENCES `Cashflow_Tracker`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReport` ADD CONSTRAINT `DailyReport_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReport` ADD CONSTRAINT `DailyReport_to_user_id_fkey` FOREIGN KEY (`to_user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportEntry` ADD CONSTRAINT `DailyReportEntry_daily_report_id_fkey` FOREIGN KEY (`daily_report_id`) REFERENCES `DailyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportEntry` ADD CONSTRAINT `DailyReportEntry_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportEntry` ADD CONSTRAINT `DailyReportEntry_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead_Milestone` ADD CONSTRAINT `lead_milestone_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead_Milestone` ADD CONSTRAINT `lead_milestone_payment_type_id_fkey` FOREIGN KEY (`payment_type_id`) REFERENCES `PaymentType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

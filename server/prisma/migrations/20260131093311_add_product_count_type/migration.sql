/*
  Warnings:

  - You are about to alter the column `salutation` on the `lead` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.

*/
-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_sales_sbu_id_fkey`;

-- DropIndex
DROP INDEX `Lead_sales_sbu_id_fkey` ON `lead`;

-- AlterTable
ALTER TABLE `lead` ADD COLUMN `competitor_details` TEXT NULL,
    ADD COLUMN `opportunities_values` TEXT NULL,
    ADD COLUMN `order_won_attachment` VARCHAR(191) NULL,
    MODIFY `sales_sbu_id` INTEGER NULL,
    MODIFY `salutation` ENUM('Mr', 'Mrs', 'Ms', 'Dr') NULL,
    MODIFY `first_name` VARCHAR(191) NULL,
    MODIFY `pain_points_files` TEXT NULL;

-- AlterTable
ALTER TABLE `leadcontact` MODIFY `name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `leaddocument` ADD COLUMN `follow_up_log_id` INTEGER NULL,
    MODIFY `name` VARCHAR(191) NULL,
    MODIFY `url` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `leadscore` MODIFY `breakdown` TEXT NULL;

-- AlterTable
ALTER TABLE `pricingnegotiationlog` MODIFY `details` TEXT NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `count_type` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `quadranthistory` MODIFY `new_quadrant` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `FollowUpLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `activity_id` INTEGER NULL,
    `date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sales_sbu_id_fkey` FOREIGN KEY (`sales_sbu_id`) REFERENCES `SBU`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadDocument` ADD CONSTRAINT `LeadDocument_follow_up_log_id_fkey` FOREIGN KEY (`follow_up_log_id`) REFERENCES `FollowUpLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

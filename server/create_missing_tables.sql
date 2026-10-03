-- CreateTable PlanOfAction
CREATE TABLE IF NOT EXISTS `PlanOfAction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `date_of_meeting` DATE NOT NULL,
    `poa_description` TEXT NOT NULL,
    `responsibility` VARCHAR(191) NOT NULL,
    `edc` DATE NULL,
    `revised_edc` DATE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `adc` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Partner
CREATE TABLE IF NOT EXISTS `Partner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `partner_company` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NULL,
    `enquiry_interest_date` DATETIME(3) NULL,
    `quadrant_allotted_date` DATETIME(3) NULL,
    `current_lead_score` INTEGER NULL DEFAULT 0,
    `quadrant` VARCHAR(191) NULL,
    `partner_type` VARCHAR(191) NULL,
    `current_end_client_opportunity` VARCHAR(191) NULL,
    `source_id` INTEGER NULL,
    `rfi_received_date` DATETIME(3) NULL,
    `business_plan_submitted_date` DATETIME(3) NULL,
    `business_plan_target_agreed_date` DATETIME(3) NULL,
    `training_provided_date` DATETIME(3) NULL,
    `monthly_engagement_started_date` DATETIME(3) NULL,
    `partner_action_poa` TEXT NULL,
    `edc` DATETIME(3) NULL,
    `active_leads_moved_to_quadrant` INTEGER NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `signed_date` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKeys
ALTER TABLE `PlanOfAction` ADD CONSTRAINT `PlanOfAction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

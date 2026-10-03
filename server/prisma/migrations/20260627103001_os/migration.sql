/*
  Warnings:

  - You are about to drop the column `service_id` on the `lead` table. All the data in the column will be lost.
  - You are about to alter the column `role` on the `user` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(0))`.
  - You are about to drop the `quadranthistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[call_tracker_id]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_service_id_fkey`;

-- DropForeignKey
ALTER TABLE `persona` DROP FOREIGN KEY `Persona_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `quadranthistory` DROP FOREIGN KEY `QuadrantHistory_lead_id_fkey`;

-- DropIndex
DROP INDEX `Lead_service_id_fkey` ON `lead`;

-- DropIndex
DROP INDEX `Persona_product_id_fkey` ON `persona`;

-- AlterTable
ALTER TABLE `activitylog` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'Sent';

-- AlterTable
ALTER TABLE `followuplog` ADD COLUMN `next_activity_id` INTEGER NULL,
    ADD COLUMN `sales_stage_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `lead` DROP COLUMN `service_id`,
    ADD COLUMN `authority_champion_influencer_identified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `avatar_id` INTEGER NULL,
    ADD COLUMN `bant_focus_area` VARCHAR(191) NULL,
    ADD COLUMN `call_tracker_id` INTEGER NULL,
    ADD COLUMN `client_company_id` INTEGER NULL,
    ADD COLUMN `company_name` VARCHAR(191) NULL,
    ADD COLUMN `cp_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `demo_done_authority` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `direct_visit_authority` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `eit_service_id` INTEGER NULL,
    ADD COLUMN `enquiry_date` DATETIME(3) NULL,
    ADD COLUMN `im_service_id` INTEGER NULL,
    ADD COLUMN `last_positive_movement_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `mgmt_call_completed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `others_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `others_score_label` VARCHAR(191) NULL,
    ADD COLUMN `pilot_given` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `post_demo_feedback_file` VARCHAR(191) NULL,
    ADD COLUMN `post_demo_feedback_received` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `post_demo_feedback_sent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `probing_discussion_authority` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `quadrant_changed_at` DATETIME(3) NULL,
    ADD COLUMN `quadrant_start_date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `sales_device` INTEGER NULL,
    ADD COLUMN `utilized_mgmt_urgency` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `utilized_presales_timeline` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `vertical_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `leadcontact` ADD COLUMN `avatar_id` INTEGER NULL,
    ADD COLUMN `persona_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `persona` ADD COLUMN `eit_service_id` INTEGER NULL,
    ADD COLUMN `im_service_id` INTEGER NULL,
    ADD COLUMN `product_or_service` VARCHAR(191) NULL,
    MODIFY `product_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `device_q1_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `device_q2_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `device_q3_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `device_q4_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `lead_multiplier_count` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `lead_q1_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `lead_q2_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `lead_q3_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `lead_q4_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `q1_to_nurturing_days` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `q2_to_q1_days` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `q3_to_q2_days` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `q4_to_q3_days` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `activities_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `calls_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `demo_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `department` VARCHAR(191) NOT NULL DEFAULT 'IM',
    ADD COLUMN `department_id` INTEGER NULL,
    ADD COLUMN `device_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `direct_visit_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `joining_date` DATETIME(3) NULL,
    ADD COLUMN `leads_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `linkedin_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `proposal_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `q1_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `revenue_target` INTEGER NULL DEFAULT 0,
    ADD COLUMN `status` ENUM('INVITED', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'INVITED',
    MODIFY `role` ENUM('CEO', 'SalesManager', 'SalesPerson') NOT NULL DEFAULT 'SalesPerson';

-- DropTable
DROP TABLE `quadranthistory`;

-- DropTable
DROP TABLE `service`;

-- CreateTable
CREATE TABLE `Department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Department_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EitService` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `count_type` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `lead_q1_multiplier` DOUBLE NOT NULL DEFAULT 1.0,

    UNIQUE INDEX `EitService_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImService` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `count_type` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `lead_q1_multiplier` DOUBLE NOT NULL DEFAULT 1.0,

    UNIQUE INDEX `ImService_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserProductTarget` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `sales_target` INTEGER NULL DEFAULT 0,
    `revenue_target` INTEGER NULL DEFAULT 0,
    `device_target` INTEGER NULL DEFAULT 0,
    `partner_target` INTEGER NULL DEFAULT 0,
    `leads_target` INTEGER NULL DEFAULT 0,
    `calls_target` INTEGER NULL DEFAULT 0,
    `linkedin_target` INTEGER NULL DEFAULT 0,
    `direct_visit_target` INTEGER NULL DEFAULT 0,
    `days` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserProductTarget_user_id_product_id_key`(`user_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Avatar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Avatar_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadQuadrantHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `old_quadrant` VARCHAR(191) NULL,
    `new_quadrant` VARCHAR(191) NULL,
    `movement_type` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    `trigger_days` INTEGER NULL,
    `moved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadQuadrantHistory_user_id_moved_at_idx`(`user_id`, `moved_at`),
    INDEX `LeadQuadrantHistory_old_quadrant_new_quadrant_idx`(`old_quadrant`, `new_quadrant`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CallActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `call_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `action_type` ENUM('CREATE', 'UPDATE') NOT NULL,
    `action_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CallActivityLog_user_id_action_date_idx`(`user_id`, `action_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwatKeyClosure` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `swat_performance_id` INTEGER NOT NULL,
    `closure_text` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_company_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vertical` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vertical_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cashflow_tracker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `executive_id` INTEGER NOT NULL,
    `client_company_id` INTEGER NULL,
    `vertical_id` INTEGER NULL,
    `payment_type_id` INTEGER NULL,
    `expected_cashflow` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `actual_received` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `edc` DATETIME(3) NULL,
    `revised_edc` DATETIME(3) NULL,
    `bant_poa` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cashflow_milestone` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cashflow_tracker_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `received_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Yet To Start',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_milestone` (
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

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SourceOfDB` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `SourceOfDB_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CallStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `CallStatus_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CallTracker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `product_id` INTEGER NULL,
    `product_or_service` VARCHAR(191) NULL,
    `eit_service_id` INTEGER NULL,
    `im_service_id` INTEGER NULL,
    `service_department` VARCHAR(191) NULL,
    `industry_id` INTEGER NULL,
    `source_of_db_id` INTEGER NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `contact_person_name` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `email_address` VARCHAR(191) NULL,
    `personal_email` VARCHAR(191) NULL,
    `mobile_no` VARCHAR(191) NULL,
    `business_potential` VARCHAR(191) NULL,
    `email_status_id` INTEGER NULL,
    `linkedin_sent` BOOLEAN NOT NULL DEFAULT false,
    `call_status_id` INTEGER NULL,
    `remarks` TEXT NULL,
    `next_follow_up_date` DATETIME(3) NULL,
    `moved_to_quad` VARCHAR(191) NULL,
    `quadrant_moved_date` DATETIME(3) NULL,
    `user_id` INTEGER NOT NULL,
    `is_converted` BOOLEAN NOT NULL DEFAULT false,
    `converted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `EmailStatus_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwatPerformance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bde_name` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `calls_target` INTEGER NOT NULL DEFAULT 0,
    `calls_achieved` INTEGER NOT NULL DEFAULT 0,
    `calls_remarks` TEXT NULL,
    `activities_target` INTEGER NOT NULL DEFAULT 0,
    `activities_achieved` INTEGER NOT NULL DEFAULT 0,
    `activities_remarks` TEXT NULL,
    `q1_lead_gen_target` INTEGER NOT NULL DEFAULT 0,
    `q1_lead_gen_achieved` INTEGER NOT NULL DEFAULT 0,
    `q1_lead_gen_remarks` TEXT NULL,
    `q1_to_q2` INTEGER NOT NULL DEFAULT 0,
    `q2_to_q3` INTEGER NOT NULL DEFAULT 0,
    `q3_to_q4` INTEGER NOT NULL DEFAULT 0,
    `q4_to_order` INTEGER NOT NULL DEFAULT 0,
    `q4_to_q3` INTEGER NOT NULL DEFAULT 0,
    `q3_to_q2` INTEGER NOT NULL DEFAULT 0,
    `q2_to_q1` INTEGER NOT NULL DEFAULT 0,
    `any_to_nurturing` INTEGER NOT NULL DEFAULT 0,
    `linkedin_target` INTEGER NOT NULL DEFAULT 0,
    `linkedin_achieved` INTEGER NOT NULL DEFAULT 0,
    `linkedin_remarks` TEXT NULL,
    `demos_target` INTEGER NOT NULL DEFAULT 0,
    `demos_achieved` INTEGER NOT NULL DEFAULT 0,
    `demos_remarks` TEXT NULL,
    `proposals_target` INTEGER NOT NULL DEFAULT 0,
    `proposals_achieved` INTEGER NOT NULL DEFAULT 0,
    `proposals_remarks` TEXT NULL,
    `direct_visit_target` INTEGER NOT NULL DEFAULT 0,
    `direct_visit_achieved` INTEGER NOT NULL DEFAULT 0,
    `direct_visit_remarks` TEXT NULL,
    `sales_order_won_target` INTEGER NOT NULL DEFAULT 0,
    `sales_order_won_achieved` INTEGER NOT NULL DEFAULT 0,
    `sales_order_won_remarks` TEXT NULL,
    `revenue_collected_target` INTEGER NOT NULL DEFAULT 0,
    `revenue_collected_achieved` INTEGER NOT NULL DEFAULT 0,
    `revenue_collected_remarks` TEXT NULL,
    `user_id` INTEGER NOT NULL,
    `product_id` INTEGER NULL,
    `service_department` VARCHAR(191) NULL,
    `performance_percentage` DOUBLE NOT NULL DEFAULT 0,
    `is_auto_saved` BOOLEAN NOT NULL DEFAULT false,
    `is_manually_saved` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SwatPerformance_user_id_date_product_id_service_department_key`(`user_id`, `date`, `product_id`, `service_department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BulkUploadStaging` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `product_id` INTEGER NULL,
    `claimed_by_id` INTEGER NULL,
    `moved_to_calltracker` BOOLEAN NOT NULL DEFAULT false,
    `moved_at` DATETIME(3) NULL,
    `file_name` VARCHAR(191) NULL,
    `original_row_data` TEXT NULL,
    `mapped_data` TEXT NULL,
    `has_validation_error` BOOLEAN NOT NULL DEFAULT false,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date` DATETIME(3) NULL,
    `industry_id` INTEGER NULL,
    `source_of_db_id` INTEGER NULL,
    `company_name` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `contact_person_name` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `email_address` VARCHAR(191) NULL,
    `personal_email` VARCHAR(191) NULL,
    `mobile_no` VARCHAR(191) NULL,
    `alternate_mobile_number` VARCHAR(191) NULL,
    `business_potential` VARCHAR(191) NULL,
    `email_status_id` INTEGER NULL,
    `linkedin_sent` BOOLEAN NOT NULL DEFAULT false,
    `call_status_id` INTEGER NULL,
    `next_follow_up_date` DATETIME(3) NULL,
    `moved_to_quad` VARCHAR(191) NULL,
    `remarks` TEXT NULL,

    INDEX `BulkUploadStaging_product_id_idx`(`product_id`),
    INDEX `BulkUploadStaging_user_id_idx`(`user_id`),
    INDEX `BulkUploadStaging_mobile_no_idx`(`mobile_no`),
    INDEX `BulkUploadStaging_email_address_idx`(`email_address`),
    INDEX `BulkUploadStaging_moved_to_calltracker_idx`(`moved_to_calltracker`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Enquiry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lead_source_id` INTEGER NULL,
    `country_id` INTEGER NULL,
    `state_id` INTEGER NULL,
    `city_id` INTEGER NULL,
    `company_name` VARCHAR(191) NULL,
    `contact_name` VARCHAR(191) NULL,
    `mobile_number` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `requirement` TEXT NULL,
    `lead_qualification` VARCHAR(191) NULL,
    `created_by_id` INTEGER NULL,
    `validated_by_id` INTEGER NULL,
    `allocated_to_id` INTEGER NULL,
    `product_id` INTEGER NULL,
    `service_department` VARCHAR(191) NULL,
    `linkedin_status` VARCHAR(191) NULL,
    `sales_stage_id` INTEGER NULL,
    `remarks` TEXT NULL,
    `frequency` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `mktg_effectiveness` VARCHAR(191) NULL,
    `is_converted` BOOLEAN NOT NULL DEFAULT false,
    `converted_at` DATETIME(3) NULL,
    `enquiry_allocated_to` INTEGER NULL,
    `converted_lead_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sid` VARCHAR(191) NOT NULL,
    `data` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sid_key`(`sid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `user_id` INTEGER NOT NULL,
    `product_id` INTEGER NULL,
    `service_department` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyReportDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weekly_report_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `metric` VARCHAR(191) NOT NULL,
    `lead_id` INTEGER NULL,
    `value` TEXT NULL,

    INDEX `WeeklyReportDetail_weekly_report_id_type_metric_idx`(`weekly_report_id`, `type`, `metric`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanOfAction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `product_id` INTEGER NULL,
    `service_department` VARCHAR(191) NULL,
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

-- CreateTable
CREATE TABLE `Partner` (
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
    `product_id` INTEGER NULL,
    `is_rfi_received` BOOLEAN NOT NULL DEFAULT false,
    `is_business_plan_submitted` BOOLEAN NOT NULL DEFAULT false,
    `is_business_plan_target_agreed` BOOLEAN NOT NULL DEFAULT false,
    `business_plan_target_value` INTEGER NULL DEFAULT 0,
    `is_training_provided` BOOLEAN NOT NULL DEFAULT false,
    `is_monthly_engagement_started` BOOLEAN NOT NULL DEFAULT false,
    `partner_action_poa` TEXT NULL,
    `edc` DATETIME(3) NULL,
    `active_leads_moved_to_quadrant` INTEGER NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `signed_date` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BantCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BantCategory_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BantQuestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `question` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadBantAnswer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `answer` TEXT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LeadBantAnswer_lead_id_question_id_key`(`lead_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NOT NULL,
    `to_user_id` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'submitted',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyReportEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `daily_report_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `lead_id` INTEGER NOT NULL,
    `quadrant` VARCHAR(191) NULL,
    `remarks` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ManagerCompanies` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ManagerCompanies_AB_unique`(`A`, `B`),
    INDEX `_ManagerCompanies_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ActivityLog_user_id_created_at_idx` ON `ActivityLog`(`user_id`, `created_at`);

-- CreateIndex
CREATE UNIQUE INDEX `Lead_call_tracker_id_key` ON `Lead`(`call_tracker_id`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `EitService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `ImService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProductTarget` ADD CONSTRAINT `UserProductTarget_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProductTarget` ADD CONSTRAINT `UserProductTarget_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_client_company_id_fkey` FOREIGN KEY (`client_company_id`) REFERENCES `client_company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_vertical_id_fkey` FOREIGN KEY (`vertical_id`) REFERENCES `Vertical`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `EitService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `ImService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `Avatar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_call_tracker_id_fkey` FOREIGN KEY (`call_tracker_id`) REFERENCES `CallTracker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `Avatar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `Persona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `SalesStage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQuadrantHistory` ADD CONSTRAINT `LeadQuadrantHistory_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallActivityLog` ADD CONSTRAINT `CallActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwatKeyClosure` ADD CONSTRAINT `SwatKeyClosure_swat_performance_id_fkey` FOREIGN KEY (`swat_performance_id`) REFERENCES `SwatPerformance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cashflow_tracker` ADD CONSTRAINT `cashflow_tracker_executive_id_fkey` FOREIGN KEY (`executive_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cashflow_tracker` ADD CONSTRAINT `cashflow_tracker_client_company_id_fkey` FOREIGN KEY (`client_company_id`) REFERENCES `client_company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cashflow_tracker` ADD CONSTRAINT `cashflow_tracker_vertical_id_fkey` FOREIGN KEY (`vertical_id`) REFERENCES `Vertical`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cashflow_tracker` ADD CONSTRAINT `cashflow_tracker_payment_type_id_fkey` FOREIGN KEY (`payment_type_id`) REFERENCES `PaymentType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cashflow_milestone` ADD CONSTRAINT `cashflow_milestone_cashflow_tracker_id_fkey` FOREIGN KEY (`cashflow_tracker_id`) REFERENCES `cashflow_tracker`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_milestone` ADD CONSTRAINT `lead_milestone_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_milestone` ADD CONSTRAINT `lead_milestone_payment_type_id_fkey` FOREIGN KEY (`payment_type_id`) REFERENCES `PaymentType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `EitService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `ImService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `Industry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_source_of_db_id_fkey` FOREIGN KEY (`source_of_db_id`) REFERENCES `SourceOfDB`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_email_status_id_fkey` FOREIGN KEY (`email_status_id`) REFERENCES `EmailStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_call_status_id_fkey` FOREIGN KEY (`call_status_id`) REFERENCES `CallStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwatPerformance` ADD CONSTRAINT `SwatPerformance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwatPerformance` ADD CONSTRAINT `SwatPerformance_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkUploadStaging` ADD CONSTRAINT `BulkUploadStaging_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkUploadStaging` ADD CONSTRAINT `BulkUploadStaging_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkUploadStaging` ADD CONSTRAINT `BulkUploadStaging_claimed_by_id_fkey` FOREIGN KEY (`claimed_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkUploadStaging` ADD CONSTRAINT `BulkUploadStaging_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `Industry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkUploadStaging` ADD CONSTRAINT `BulkUploadStaging_source_of_db_id_fkey` FOREIGN KEY (`source_of_db_id`) REFERENCES `SourceOfDB`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkUploadStaging` ADD CONSTRAINT `BulkUploadStaging_email_status_id_fkey` FOREIGN KEY (`email_status_id`) REFERENCES `EmailStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkUploadStaging` ADD CONSTRAINT `BulkUploadStaging_call_status_id_fkey` FOREIGN KEY (`call_status_id`) REFERENCES `CallStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `State`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_validated_by_id_fkey` FOREIGN KEY (`validated_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_allocated_to_id_fkey` FOREIGN KEY (`allocated_to_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `SalesStage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_enquiry_allocated_to_fkey` FOREIGN KEY (`enquiry_allocated_to`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_converted_lead_id_fkey` FOREIGN KEY (`converted_lead_id`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReport` ADD CONSTRAINT `WeeklyReport_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReportDetail` ADD CONSTRAINT `WeeklyReportDetail_weekly_report_id_fkey` FOREIGN KEY (`weekly_report_id`) REFERENCES `WeeklyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReportDetail` ADD CONSTRAINT `WeeklyReportDetail_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanOfAction` ADD CONSTRAINT `PlanOfAction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanOfAction` ADD CONSTRAINT `PlanOfAction_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BantQuestion` ADD CONSTRAINT `BantQuestion_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `BantCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadBantAnswer` ADD CONSTRAINT `LeadBantAnswer_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadBantAnswer` ADD CONSTRAINT `LeadBantAnswer_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `BantCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadBantAnswer` ADD CONSTRAINT `LeadBantAnswer_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `BantQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadBantAnswer` ADD CONSTRAINT `LeadBantAnswer_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE `_ManagerCompanies` ADD CONSTRAINT `_ManagerCompanies_A_fkey` FOREIGN KEY (`A`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ManagerCompanies` ADD CONSTRAINT `_ManagerCompanies_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

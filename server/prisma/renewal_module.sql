-- DropForeignKey
ALTER TABLE `activitylog` DROP FOREIGN KEY `ActivityLog_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `bantquestion` DROP FOREIGN KEY `BantQuestion_category_id_fkey`;

-- DropForeignKey
ALTER TABLE `bulkuploadstaging` DROP FOREIGN KEY `BulkUploadStaging_call_status_id_fkey`;

-- DropForeignKey
ALTER TABLE `bulkuploadstaging` DROP FOREIGN KEY `BulkUploadStaging_claimed_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `bulkuploadstaging` DROP FOREIGN KEY `BulkUploadStaging_email_status_id_fkey`;

-- DropForeignKey
ALTER TABLE `bulkuploadstaging` DROP FOREIGN KEY `BulkUploadStaging_industry_id_fkey`;

-- DropForeignKey
ALTER TABLE `bulkuploadstaging` DROP FOREIGN KEY `BulkUploadStaging_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `bulkuploadstaging` DROP FOREIGN KEY `BulkUploadStaging_source_of_db_id_fkey`;

-- DropForeignKey
ALTER TABLE `bulkuploadstaging` DROP FOREIGN KEY `BulkUploadStaging_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `callactivitylog` DROP FOREIGN KEY `CallActivityLog_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `calllog` DROP FOREIGN KEY `CallLog_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `calllog` DROP FOREIGN KEY `CallLog_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `calltracker` DROP FOREIGN KEY `CallTracker_call_status_id_fkey`;

-- DropForeignKey
ALTER TABLE `calltracker` DROP FOREIGN KEY `CallTracker_eit_service_id_fkey`;

-- DropForeignKey
ALTER TABLE `calltracker` DROP FOREIGN KEY `CallTracker_email_status_id_fkey`;

-- DropForeignKey
ALTER TABLE `calltracker` DROP FOREIGN KEY `CallTracker_im_service_id_fkey`;

-- DropForeignKey
ALTER TABLE `calltracker` DROP FOREIGN KEY `CallTracker_industry_id_fkey`;

-- DropForeignKey
ALTER TABLE `calltracker` DROP FOREIGN KEY `CallTracker_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `calltracker` DROP FOREIGN KEY `CallTracker_source_of_db_id_fkey`;

-- DropForeignKey
ALTER TABLE `calltracker` DROP FOREIGN KEY `CallTracker_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `cashflow_tracker` DROP FOREIGN KEY `cashflow_tracker_product_fkey`;

-- DropForeignKey
ALTER TABLE `city` DROP FOREIGN KEY `City_state_id_fkey`;

-- DropForeignKey
ALTER TABLE `dailyreport` DROP FOREIGN KEY `DailyReport_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `dailyreport` DROP FOREIGN KEY `DailyReport_to_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `dailyreportentry` DROP FOREIGN KEY `DailyReportEntry_daily_report_id_fkey`;

-- DropForeignKey
ALTER TABLE `dailyreportentry` DROP FOREIGN KEY `DailyReportEntry_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `dailyreportentry` DROP FOREIGN KEY `DailyReportEntry_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_allocated_to_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_city_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_converted_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_enquiry_allocated_to_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_lead_source_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_sales_stage_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_state_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `Enquiry_validated_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `enquiry` DROP FOREIGN KEY `fk_enquiry_call_tracker`;

-- DropForeignKey
ALTER TABLE `followuplog` DROP FOREIGN KEY `FollowUpLog_activity_id_fkey`;

-- DropForeignKey
ALTER TABLE `followuplog` DROP FOREIGN KEY `FollowUpLog_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `followuplog` DROP FOREIGN KEY `FollowUpLog_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `followuplog` DROP FOREIGN KEY `FollowUpLog_next_activity_id_fkey`;

-- DropForeignKey
ALTER TABLE `followuplog` DROP FOREIGN KEY `FollowUpLog_sales_stage_id_fkey`;

-- DropForeignKey
ALTER TABLE `kraentry` DROP FOREIGN KEY `KraEntry_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_avatar_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_call_tracker_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_city_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_client_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_eit_service_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_follow_up_activity_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_im_service_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_industry_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_job_title_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_lead_owner_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_lead_source_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_next_activity_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_persona_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_sales_sbu_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_sales_stage_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_state_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_vertical_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_where_find_them_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_milestone_bant_poa_history` DROP FOREIGN KEY `lmbph_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_milestone_bant_poa_history` DROP FOREIGN KEY `lmbph_lead_milestone_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_milestone_bant_poa_history` DROP FOREIGN KEY `lmbph_updated_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_milestone_payment_history` DROP FOREIGN KEY `lmph_collected_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_milestone_payment_history` DROP FOREIGN KEY `lmph_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_milestone_payment_history` DROP FOREIGN KEY `lmph_lead_milestone_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadbantanswer` DROP FOREIGN KEY `LeadBantAnswer_category_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadbantanswer` DROP FOREIGN KEY `LeadBantAnswer_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `leadbantanswer` DROP FOREIGN KEY `LeadBantAnswer_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadbantanswer` DROP FOREIGN KEY `LeadBantAnswer_question_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadcontact` DROP FOREIGN KEY `LeadContact_avatar_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadcontact` DROP FOREIGN KEY `LeadContact_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadcontact` DROP FOREIGN KEY `LeadContact_persona_id_fkey`;

-- DropForeignKey
ALTER TABLE `leaddocument` DROP FOREIGN KEY `LeadDocument_follow_up_log_id_fkey`;

-- DropForeignKey
ALTER TABLE `leaddocument` DROP FOREIGN KEY `LeadDocument_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadquadranthistory` DROP FOREIGN KEY `LeadQuadrantHistory_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadscore` DROP FOREIGN KEY `LeadScore_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `partner` DROP FOREIGN KEY `Partner_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `partner` DROP FOREIGN KEY `Partner_source_id_fkey`;

-- DropForeignKey
ALTER TABLE `partner` DROP FOREIGN KEY `Partner_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `persona` DROP FOREIGN KEY `Persona_eit_service_id_fkey`;

-- DropForeignKey
ALTER TABLE `persona` DROP FOREIGN KEY `Persona_im_service_id_fkey`;

-- DropForeignKey
ALTER TABLE `persona` DROP FOREIGN KEY `Persona_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `planofaction` DROP FOREIGN KEY `PlanOfAction_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `planofaction` DROP FOREIGN KEY `PlanOfAction_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `pomodorosession` DROP FOREIGN KEY `PomodoroSession_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `pricingnegotiationlog` DROP FOREIGN KEY `PricingNegotiationLog_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `pricingnegotiationlog` DROP FOREIGN KEY `PricingNegotiationLog_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `privilege` DROP FOREIGN KEY `Privilege_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `fk_product_company`;

-- DropForeignKey
ALTER TABLE `sbu` DROP FOREIGN KEY `SBU_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `state` DROP FOREIGN KEY `State_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `swatkeyclosure` DROP FOREIGN KEY `SwatKeyClosure_swat_performance_id_fkey`;

-- DropForeignKey
ALTER TABLE `swatperformance` DROP FOREIGN KEY `SwatPerformance_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `swatperformance` DROP FOREIGN KEY `SwatPerformance_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_department_id_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_reporting_manager_id_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_sbu_id_fkey`;

-- DropForeignKey
ALTER TABLE `userproducttarget` DROP FOREIGN KEY `UserProductTarget_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `userproducttarget` DROP FOREIGN KEY `UserProductTarget_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `weeklyreport` DROP FOREIGN KEY `WeeklyReport_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `weeklyreportdetail` DROP FOREIGN KEY `WeeklyReportDetail_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `weeklyreportdetail` DROP FOREIGN KEY `WeeklyReportDetail_weekly_report_id_fkey`;

-- DropIndex
DROP INDEX `lmbph_updated_by_id_fkey` ON `lead_milestone_bant_poa_history`;

-- DropIndex
DROP INDEX `lmph_collected_by_id_fkey` ON `lead_milestone_payment_history`;

-- AlterTable
ALTER TABLE `activitylog` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Sent';

-- AlterTable
ALTER TABLE `bantcategory` MODIFY `status` VARCHAR(20) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `calltracker` MODIFY `pipeline_action` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `cashflow_milestone` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Yet To Start';

-- AlterTable
ALTER TABLE `dailyreport` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'submitted';

-- AlterTable
ALTER TABLE `lead_milestone` MODIFY `poa_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    MODIFY `collection_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Yet To Start';

-- AlterTable
ALTER TABLE `leadquadranthistory` MODIFY `movement_type` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE `partner` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE `planofaction` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('CEO', 'SalesManager', 'SalesPerson') NOT NULL DEFAULT 'SalesPerson',
    MODIFY `status` ENUM('INVITED', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'INVITED',
    MODIFY `department` VARCHAR(191) NOT NULL DEFAULT 'IM';

-- CreateTable
CREATE TABLE `renewal_service_category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL DEFAULT '#6366f1',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `renewal_service_category_name_key`(`name`),
    UNIQUE INDEX `renewal_service_category_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_service_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category_id` INTEGER NOT NULL,
    `identifier_label` VARCHAR(191) NULL DEFAULT 'Identifier',
    `requires_identifier` BOOLEAN NOT NULL DEFAULT true,
    `default_duration_value` INTEGER NULL DEFAULT 12,
    `default_duration_unit` VARCHAR(191) NULL DEFAULT 'months',
    `supports_quantity` BOOLEAN NOT NULL DEFAULT false,
    `supports_provider` BOOLEAN NOT NULL DEFAULT true,
    `supports_amc` BOOLEAN NOT NULL DEFAULT false,
    `supports_support_package` BOOLEAN NOT NULL DEFAULT false,
    `default_reminder_policy_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_provider` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `renewal_provider_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_contact` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_company_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `designation` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_renewal_contact` BOOLEAN NOT NULL DEFAULT true,
    `whatsapp_consent` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `renewal_contact_client_company_id_idx`(`client_company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NULL,
    `client_company_id` INTEGER NOT NULL,
    `account_manager_id` INTEGER NULL,
    `renewal_executive_id` INTEGER NULL,
    `order_number` VARCHAR(191) NULL,
    `order_date` DATETIME(3) NULL,
    `po_reference` VARCHAR(191) NULL,
    `invoice_number` VARCHAR(191) NULL,
    `invoice_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `source_lead_id` INTEGER NULL,
    `created_by_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `renewal_account_client_company_id_idx`(`client_company_id`),
    INDEX `renewal_account_account_manager_id_idx`(`account_manager_id`),
    INDEX `renewal_account_status_idx`(`status`),
    INDEX `renewal_account_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_account_contact` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `renewal_account_id` INTEGER NOT NULL,
    `contact_id` INTEGER NOT NULL,

    UNIQUE INDEX `renewal_account_contact_renewal_account_id_contact_id_key`(`renewal_account_id`, `contact_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_service_instance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `renewal_account_id` INTEGER NOT NULL,
    `service_master_id` INTEGER NOT NULL,
    `identifier` VARCHAR(191) NULL,
    `provider_id` INTEGER NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `activation_date` DATETIME(3) NULL,
    `expiry_date` DATETIME(3) NULL,
    `actual_expiry_date` DATETIME(3) NULL,
    `duration_value` INTEGER NULL DEFAULT 12,
    `duration_unit` VARCHAR(191) NULL DEFAULT 'months',
    `amount_due` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amc_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `support_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `assigned_user_id` INTEGER NULL,
    `customer_contact_id` INTEGER NULL,
    `reminder_policy_id` INTEGER NULL,
    `override_policy` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `remarks` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `renewal_service_instance_renewal_account_id_idx`(`renewal_account_id`),
    INDEX `renewal_service_instance_expiry_date_idx`(`expiry_date`),
    INDEX `renewal_service_instance_status_idx`(`status`),
    INDEX `renewal_service_instance_assigned_user_id_idx`(`assigned_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_cycle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `service_instance_id` INTEGER NOT NULL,
    `cycle_number` INTEGER NOT NULL DEFAULT 1,
    `activation_date` DATETIME(3) NULL,
    `expiry_date` DATETIME(3) NULL,
    `amount_due` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amount_collected` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `outstanding` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `reminder_policy_snapshot` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `renewed_at` DATETIME(3) NULL,
    `renewed_by_id` INTEGER NULL,
    `not_renewing_reason` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `renewal_cycle_service_instance_id_status_idx`(`service_instance_id`, `status`),
    INDEX `renewal_cycle_expiry_date_idx`(`expiry_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_reminder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cycle_id` INTEGER NOT NULL,
    `step_number` INTEGER NOT NULL,
    `offset_days` INTEGER NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `recipient_type` VARCHAR(191) NOT NULL,
    `assigned_user_id` INTEGER NULL,
    `template_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `completed_at` DATETIME(3) NULL,
    `completed_by_id` INTEGER NULL,
    `skipped_at` DATETIME(3) NULL,
    `skip_reason` VARCHAR(500) NULL,
    `policy_version` INTEGER NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `escalation_after_days` INTEGER NULL,
    `escalate_to_id` INTEGER NULL,
    `escalated` BOOLEAN NOT NULL DEFAULT false,
    `escalated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `renewal_reminder_due_date_status_idx`(`due_date`, `status`),
    INDEX `renewal_reminder_assigned_user_id_status_idx`(`assigned_user_id`, `status`),
    INDEX `renewal_reminder_cycle_id_idx`(`cycle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_followup_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `service_instance_id` INTEGER NOT NULL,
    `reminder_id` INTEGER NULL,
    `outcome_code` VARCHAR(191) NULL,
    `contacted` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `customer_response` TEXT NULL,
    `next_follow_up_date` DATETIME(3) NULL,
    `logged_by_id` INTEGER NOT NULL,
    `logged_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `renewal_followup_log_service_instance_id_idx`(`service_instance_id`),
    INDEX `renewal_followup_log_logged_at_idx`(`logged_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_reminder_policy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `company_id` INTEGER NULL,
    `service_category_id` INTEGER NULL,
    `service_master_id` INTEGER NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `use_business_days` BOOLEAN NOT NULL DEFAULT false,
    `skip_weekends` BOOLEAN NOT NULL DEFAULT false,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kolkata',
    `version` INTEGER NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_reminder_step` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `policy_id` INTEGER NOT NULL,
    `step_number` INTEGER NOT NULL,
    `offset_days` INTEGER NOT NULL,
    `relative_to` VARCHAR(191) NOT NULL DEFAULT 'EXPIRY_DATE',
    `action_type` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `recipient_type` VARCHAR(191) NOT NULL,
    `template_id` INTEGER NULL,
    `escalate_after_days` INTEGER NULL,
    `escalate_to` VARCHAR(100) NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `renewal_reminder_step_policy_id_step_number_key`(`policy_id`, `step_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_notification_template` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category_code` VARCHAR(20) NULL,
    `channel` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `body_html` TEXT NOT NULL,
    `body_text` TEXT NULL,
    `variables` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cycle_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `collected_by_id` INTEGER NULL,
    `payment_mode` VARCHAR(50) NULL,
    `reference` VARCHAR(200) NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `renewal_payment_cycle_id_idx`(`cycle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `renewal_account_id` INTEGER NOT NULL,
    `document_type` VARCHAR(50) NULL,
    `name` VARCHAR(191) NULL,
    `url` VARCHAR(191) NOT NULL,
    `uploaded_by_id` INTEGER NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `renewal_document_renewal_account_id_idx`(`renewal_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `reminder_id` INTEGER NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `body` TEXT NOT NULL,
    `link` VARCHAR(500) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `application_notification_user_id_is_read_idx`(`user_id`, `is_read`),
    INDEX `application_notification_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_outbox` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channel` VARCHAR(20) NOT NULL,
    `recipient` VARCHAR(300) NOT NULL,
    `template_id` INTEGER NULL,
    `subject` VARCHAR(500) NULL,
    `rendered_body` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'QUEUED',
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `next_retry_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `provider_ref` VARCHAR(200) NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notification_outbox_status_next_retry_at_idx`(`status`, `next_retry_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `renewal_audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `renewal_account_id` INTEGER NOT NULL,
    `entity_type` VARCHAR(30) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `old_value` JSON NULL,
    `new_value` JSON NULL,
    `performed_by_id` INTEGER NOT NULL,
    `performed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(45) NULL,

    INDEX `renewal_audit_log_renewal_account_id_performed_at_idx`(`renewal_account_id`, `performed_at`),
    INDEX `renewal_audit_log_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_sbu_id_fkey` FOREIGN KEY (`sbu_id`) REFERENCES `sbu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_reporting_manager_id_fkey` FOREIGN KEY (`reporting_manager_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `privilege` ADD CONSTRAINT `privilege_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sbu` ADD CONSTRAINT `sbu_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `state` ADD CONSTRAINT `state_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `city` ADD CONSTRAINT `city_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `state`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persona` ADD CONSTRAINT `persona_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persona` ADD CONSTRAINT `persona_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `eitservice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persona` ADD CONSTRAINT `persona_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `imservice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userproducttarget` ADD CONSTRAINT `userproducttarget_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userproducttarget` ADD CONSTRAINT `userproducttarget_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_lead_owner_id_fkey` FOREIGN KEY (`lead_owner_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_client_company_id_fkey` FOREIGN KEY (`client_company_id`) REFERENCES `client_company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_vertical_id_fkey` FOREIGN KEY (`vertical_id`) REFERENCES `vertical`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_sales_sbu_id_fkey` FOREIGN KEY (`sales_sbu_id`) REFERENCES `sbu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `jobtitle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `leadsource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `industry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `eitservice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `imservice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `persona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `avatar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_where_find_them_id_fkey` FOREIGN KEY (`where_find_them_id`) REFERENCES `leadsource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_follow_up_activity_id_fkey` FOREIGN KEY (`follow_up_activity_id`) REFERENCES `activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `salesstage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_call_tracker_id_fkey` FOREIGN KEY (`call_tracker_id`) REFERENCES `calltracker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadcontact` ADD CONSTRAINT `leadcontact_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadcontact` ADD CONSTRAINT `leadcontact_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `avatar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadcontact` ADD CONSTRAINT `leadcontact_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `persona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leaddocument` ADD CONSTRAINT `leaddocument_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leaddocument` ADD CONSTRAINT `leaddocument_follow_up_log_id_fkey` FOREIGN KEY (`follow_up_log_id`) REFERENCES `followuplog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `followuplog` ADD CONSTRAINT `followuplog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `followuplog` ADD CONSTRAINT `followuplog_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `followuplog` ADD CONSTRAINT `followuplog_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `followuplog` ADD CONSTRAINT `followuplog_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `salesstage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `followuplog` ADD CONSTRAINT `followuplog_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadquadranthistory` ADD CONSTRAINT `leadquadranthistory_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadscore` ADD CONSTRAINT `leadscore_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calllog` ADD CONSTRAINT `calllog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calllog` ADD CONSTRAINT `calllog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activitylog` ADD CONSTRAINT `activitylog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `callactivitylog` ADD CONSTRAINT `callactivitylog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `swatkeyclosure` ADD CONSTRAINT `swatkeyclosure_swat_performance_id_fkey` FOREIGN KEY (`swat_performance_id`) REFERENCES `swatperformance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kraentry` ADD CONSTRAINT `kraentry_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pomodorosession` ADD CONSTRAINT `pomodorosession_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pricingnegotiationlog` ADD CONSTRAINT `pricingnegotiationlog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pricingnegotiationlog` ADD CONSTRAINT `pricingnegotiationlog_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cashflow_tracker` ADD CONSTRAINT `cashflow_tracker_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_milestone_payment_history` ADD CONSTRAINT `lead_milestone_payment_history_lead_milestone_id_fkey` FOREIGN KEY (`lead_milestone_id`) REFERENCES `lead_milestone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_milestone_payment_history` ADD CONSTRAINT `lead_milestone_payment_history_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_milestone_payment_history` ADD CONSTRAINT `lead_milestone_payment_history_collected_by_id_fkey` FOREIGN KEY (`collected_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_milestone_bant_poa_history` ADD CONSTRAINT `lead_milestone_bant_poa_history_lead_milestone_id_fkey` FOREIGN KEY (`lead_milestone_id`) REFERENCES `lead_milestone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_milestone_bant_poa_history` ADD CONSTRAINT `lead_milestone_bant_poa_history_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_milestone_bant_poa_history` ADD CONSTRAINT `lead_milestone_bant_poa_history_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calltracker` ADD CONSTRAINT `calltracker_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calltracker` ADD CONSTRAINT `calltracker_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `eitservice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calltracker` ADD CONSTRAINT `calltracker_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `imservice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calltracker` ADD CONSTRAINT `calltracker_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `industry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calltracker` ADD CONSTRAINT `calltracker_source_of_db_id_fkey` FOREIGN KEY (`source_of_db_id`) REFERENCES `sourceofdb`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calltracker` ADD CONSTRAINT `calltracker_email_status_id_fkey` FOREIGN KEY (`email_status_id`) REFERENCES `emailstatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calltracker` ADD CONSTRAINT `calltracker_call_status_id_fkey` FOREIGN KEY (`call_status_id`) REFERENCES `callstatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calltracker` ADD CONSTRAINT `calltracker_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `swatperformance` ADD CONSTRAINT `swatperformance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `swatperformance` ADD CONSTRAINT `swatperformance_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulkuploadstaging` ADD CONSTRAINT `bulkuploadstaging_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulkuploadstaging` ADD CONSTRAINT `bulkuploadstaging_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulkuploadstaging` ADD CONSTRAINT `bulkuploadstaging_claimed_by_id_fkey` FOREIGN KEY (`claimed_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulkuploadstaging` ADD CONSTRAINT `bulkuploadstaging_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `industry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulkuploadstaging` ADD CONSTRAINT `bulkuploadstaging_source_of_db_id_fkey` FOREIGN KEY (`source_of_db_id`) REFERENCES `sourceofdb`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulkuploadstaging` ADD CONSTRAINT `bulkuploadstaging_email_status_id_fkey` FOREIGN KEY (`email_status_id`) REFERENCES `emailstatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulkuploadstaging` ADD CONSTRAINT `bulkuploadstaging_call_status_id_fkey` FOREIGN KEY (`call_status_id`) REFERENCES `callstatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `leadsource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_validated_by_id_fkey` FOREIGN KEY (`validated_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_allocated_to_id_fkey` FOREIGN KEY (`allocated_to_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `salesstage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_enquiry_allocated_to_fkey` FOREIGN KEY (`enquiry_allocated_to`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_converted_lead_id_fkey` FOREIGN KEY (`converted_lead_id`) REFERENCES `lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry` ADD CONSTRAINT `enquiry_call_tracker_id_fkey` FOREIGN KEY (`call_tracker_id`) REFERENCES `calltracker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weeklyreport` ADD CONSTRAINT `weeklyreport_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weeklyreportdetail` ADD CONSTRAINT `weeklyreportdetail_weekly_report_id_fkey` FOREIGN KEY (`weekly_report_id`) REFERENCES `weeklyreport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weeklyreportdetail` ADD CONSTRAINT `weeklyreportdetail_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planofaction` ADD CONSTRAINT `planofaction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planofaction` ADD CONSTRAINT `planofaction_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner` ADD CONSTRAINT `partner_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner` ADD CONSTRAINT `partner_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `leadsource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner` ADD CONSTRAINT `partner_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bantquestion` ADD CONSTRAINT `bantquestion_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `bantcategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadbantanswer` ADD CONSTRAINT `leadbantanswer_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadbantanswer` ADD CONSTRAINT `leadbantanswer_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `bantcategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadbantanswer` ADD CONSTRAINT `leadbantanswer_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `bantquestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadbantanswer` ADD CONSTRAINT `leadbantanswer_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dailyreport` ADD CONSTRAINT `dailyreport_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dailyreport` ADD CONSTRAINT `dailyreport_to_user_id_fkey` FOREIGN KEY (`to_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dailyreportentry` ADD CONSTRAINT `dailyreportentry_daily_report_id_fkey` FOREIGN KEY (`daily_report_id`) REFERENCES `dailyreport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dailyreportentry` ADD CONSTRAINT `dailyreportentry_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dailyreportentry` ADD CONSTRAINT `dailyreportentry_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_service_master` ADD CONSTRAINT `renewal_service_master_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `renewal_service_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_service_master` ADD CONSTRAINT `renewal_service_master_default_reminder_policy_id_fkey` FOREIGN KEY (`default_reminder_policy_id`) REFERENCES `renewal_reminder_policy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_contact` ADD CONSTRAINT `renewal_contact_client_company_id_fkey` FOREIGN KEY (`client_company_id`) REFERENCES `client_company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_account` ADD CONSTRAINT `renewal_account_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_account` ADD CONSTRAINT `renewal_account_client_company_id_fkey` FOREIGN KEY (`client_company_id`) REFERENCES `client_company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_account` ADD CONSTRAINT `renewal_account_account_manager_id_fkey` FOREIGN KEY (`account_manager_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_account` ADD CONSTRAINT `renewal_account_renewal_executive_id_fkey` FOREIGN KEY (`renewal_executive_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_account` ADD CONSTRAINT `renewal_account_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_account_contact` ADD CONSTRAINT `renewal_account_contact_renewal_account_id_fkey` FOREIGN KEY (`renewal_account_id`) REFERENCES `renewal_account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_account_contact` ADD CONSTRAINT `renewal_account_contact_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `renewal_contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_service_instance` ADD CONSTRAINT `renewal_service_instance_renewal_account_id_fkey` FOREIGN KEY (`renewal_account_id`) REFERENCES `renewal_account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_service_instance` ADD CONSTRAINT `renewal_service_instance_service_master_id_fkey` FOREIGN KEY (`service_master_id`) REFERENCES `renewal_service_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_service_instance` ADD CONSTRAINT `renewal_service_instance_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `renewal_provider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_service_instance` ADD CONSTRAINT `renewal_service_instance_assigned_user_id_fkey` FOREIGN KEY (`assigned_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_service_instance` ADD CONSTRAINT `renewal_service_instance_customer_contact_id_fkey` FOREIGN KEY (`customer_contact_id`) REFERENCES `renewal_contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_service_instance` ADD CONSTRAINT `renewal_service_instance_reminder_policy_id_fkey` FOREIGN KEY (`reminder_policy_id`) REFERENCES `renewal_reminder_policy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_cycle` ADD CONSTRAINT `renewal_cycle_service_instance_id_fkey` FOREIGN KEY (`service_instance_id`) REFERENCES `renewal_service_instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_cycle` ADD CONSTRAINT `renewal_cycle_renewed_by_id_fkey` FOREIGN KEY (`renewed_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder` ADD CONSTRAINT `renewal_reminder_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `renewal_cycle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder` ADD CONSTRAINT `renewal_reminder_assigned_user_id_fkey` FOREIGN KEY (`assigned_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder` ADD CONSTRAINT `renewal_reminder_completed_by_id_fkey` FOREIGN KEY (`completed_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder` ADD CONSTRAINT `renewal_reminder_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `renewal_notification_template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_followup_log` ADD CONSTRAINT `renewal_followup_log_service_instance_id_fkey` FOREIGN KEY (`service_instance_id`) REFERENCES `renewal_service_instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_followup_log` ADD CONSTRAINT `renewal_followup_log_reminder_id_fkey` FOREIGN KEY (`reminder_id`) REFERENCES `renewal_reminder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_followup_log` ADD CONSTRAINT `renewal_followup_log_logged_by_id_fkey` FOREIGN KEY (`logged_by_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder_policy` ADD CONSTRAINT `renewal_reminder_policy_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder_policy` ADD CONSTRAINT `renewal_reminder_policy_service_category_id_fkey` FOREIGN KEY (`service_category_id`) REFERENCES `renewal_service_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder_policy` ADD CONSTRAINT `renewal_reminder_policy_service_master_id_fkey` FOREIGN KEY (`service_master_id`) REFERENCES `renewal_service_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder_step` ADD CONSTRAINT `renewal_reminder_step_policy_id_fkey` FOREIGN KEY (`policy_id`) REFERENCES `renewal_reminder_policy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_reminder_step` ADD CONSTRAINT `renewal_reminder_step_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `renewal_notification_template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_payment` ADD CONSTRAINT `renewal_payment_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `renewal_cycle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_payment` ADD CONSTRAINT `renewal_payment_collected_by_id_fkey` FOREIGN KEY (`collected_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_document` ADD CONSTRAINT `renewal_document_renewal_account_id_fkey` FOREIGN KEY (`renewal_account_id`) REFERENCES `renewal_account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_document` ADD CONSTRAINT `renewal_document_uploaded_by_id_fkey` FOREIGN KEY (`uploaded_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_notification` ADD CONSTRAINT `application_notification_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_notification` ADD CONSTRAINT `application_notification_reminder_id_fkey` FOREIGN KEY (`reminder_id`) REFERENCES `renewal_reminder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_audit_log` ADD CONSTRAINT `renewal_audit_log_renewal_account_id_fkey` FOREIGN KEY (`renewal_account_id`) REFERENCES `renewal_account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `renewal_audit_log` ADD CONSTRAINT `renewal_audit_log_performed_by_id_fkey` FOREIGN KEY (`performed_by_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE UNIQUE INDEX `activity_name_key` ON `activity`(`name`);
DROP INDEX `Activity_name_key` ON `activity`;

-- RedefineIndex
CREATE INDEX `activitylog_user_id_created_at_idx` ON `activitylog`(`user_id`, `created_at`);
DROP INDEX `ActivityLog_user_id_created_at_idx` ON `activitylog`;

-- RedefineIndex
CREATE UNIQUE INDEX `avatar_name_key` ON `avatar`(`name`);
DROP INDEX `Avatar_name_key` ON `avatar`;

-- RedefineIndex
CREATE UNIQUE INDEX `bantcategory_code_key` ON `bantcategory`(`code`);
DROP INDEX `BantCategory_code_key` ON `bantcategory`;

-- RedefineIndex
CREATE INDEX `bulkuploadstaging_email_address_idx` ON `bulkuploadstaging`(`email_address`);
DROP INDEX `BulkUploadStaging_email_address_idx` ON `bulkuploadstaging`;

-- RedefineIndex
CREATE INDEX `bulkuploadstaging_mobile_no_idx` ON `bulkuploadstaging`(`mobile_no`);
DROP INDEX `BulkUploadStaging_mobile_no_idx` ON `bulkuploadstaging`;

-- RedefineIndex
CREATE INDEX `bulkuploadstaging_moved_to_calltracker_idx` ON `bulkuploadstaging`(`moved_to_calltracker`);
DROP INDEX `BulkUploadStaging_moved_to_calltracker_idx` ON `bulkuploadstaging`;

-- RedefineIndex
CREATE INDEX `bulkuploadstaging_product_id_idx` ON `bulkuploadstaging`(`product_id`);
DROP INDEX `BulkUploadStaging_product_id_idx` ON `bulkuploadstaging`;

-- RedefineIndex
CREATE INDEX `bulkuploadstaging_user_id_idx` ON `bulkuploadstaging`(`user_id`);
DROP INDEX `BulkUploadStaging_user_id_idx` ON `bulkuploadstaging`;

-- RedefineIndex
CREATE INDEX `callactivitylog_user_id_action_date_idx` ON `callactivitylog`(`user_id`, `action_date`);
DROP INDEX `CallActivityLog_user_id_action_date_idx` ON `callactivitylog`;

-- RedefineIndex
CREATE UNIQUE INDEX `callstatus_name_key` ON `callstatus`(`name`);
DROP INDEX `CallStatus_name_key` ON `callstatus`;

-- RedefineIndex
CREATE UNIQUE INDEX `collateral_name_key` ON `collateral`(`name`);
DROP INDEX `Collateral_name_key` ON `collateral`;

-- RedefineIndex
CREATE UNIQUE INDEX `company_name_key` ON `company`(`name`);
DROP INDEX `Company_name_key` ON `company`;

-- RedefineIndex
CREATE UNIQUE INDEX `country_name_key` ON `country`(`name`);
DROP INDEX `Country_name_key` ON `country`;

-- RedefineIndex
CREATE UNIQUE INDEX `department_name_key` ON `department`(`name`);
DROP INDEX `Department_name_key` ON `department`;

-- RedefineIndex
CREATE UNIQUE INDEX `eitservice_name_key` ON `eitservice`(`name`);
DROP INDEX `EitService_name_key` ON `eitservice`;

-- RedefineIndex
CREATE UNIQUE INDEX `emailstatus_name_key` ON `emailstatus`(`name`);
DROP INDEX `EmailStatus_name_key` ON `emailstatus`;

-- RedefineIndex
CREATE UNIQUE INDEX `enquiry_call_tracker_id_key` ON `enquiry`(`call_tracker_id`);
DROP INDEX `idx_enquiry_call_tracker_id` ON `enquiry`;

-- RedefineIndex
CREATE UNIQUE INDEX `imservice_name_key` ON `imservice`(`name`);
DROP INDEX `ImService_name_key` ON `imservice`;

-- RedefineIndex
CREATE UNIQUE INDEX `industry_name_key` ON `industry`(`name`);
DROP INDEX `Industry_name_key` ON `industry`;

-- RedefineIndex
CREATE UNIQUE INDEX `jobtitle_name_key` ON `jobtitle`(`name`);
DROP INDEX `JobTitle_name_key` ON `jobtitle`;

-- RedefineIndex
CREATE UNIQUE INDEX `lead_call_tracker_id_key` ON `lead`(`call_tracker_id`);
DROP INDEX `Lead_call_tracker_id_key` ON `lead`;

-- RedefineIndex
CREATE INDEX `lead_milestone_bant_poa_history_lead_id_updated_at_idx` ON `lead_milestone_bant_poa_history`(`lead_id`, `updated_at`);
DROP INDEX `lmbph_lead_id_updated_at_idx` ON `lead_milestone_bant_poa_history`;

-- RedefineIndex
CREATE INDEX `lead_milestone_bant_poa_history_lead_milestone_id_updated_at_idx` ON `lead_milestone_bant_poa_history`(`lead_milestone_id`, `updated_at`);
DROP INDEX `lmbph_lead_milestone_id_updated_at_idx` ON `lead_milestone_bant_poa_history`;

-- RedefineIndex
CREATE INDEX `lead_milestone_payment_history_lead_id_collection_date_idx` ON `lead_milestone_payment_history`(`lead_id`, `collection_date`);
DROP INDEX `lmph_lead_id_collection_date_idx` ON `lead_milestone_payment_history`;

-- RedefineIndex
CREATE INDEX `lead_milestone_payment_history_lead_milestone_id_collection__idx` ON `lead_milestone_payment_history`(`lead_milestone_id`, `collection_date`);
DROP INDEX `lmph_lead_milestone_id_collection_date_idx` ON `lead_milestone_payment_history`;

-- RedefineIndex
CREATE UNIQUE INDEX `leadbantanswer_lead_id_question_id_key` ON `leadbantanswer`(`lead_id`, `question_id`);
DROP INDEX `LeadBantAnswer_lead_id_question_id_key` ON `leadbantanswer`;

-- RedefineIndex
CREATE INDEX `leadquadranthistory_old_quadrant_new_quadrant_idx` ON `leadquadranthistory`(`old_quadrant`, `new_quadrant`);
DROP INDEX `LeadQuadrantHistory_old_quadrant_new_quadrant_idx` ON `leadquadranthistory`;

-- RedefineIndex
CREATE INDEX `leadquadranthistory_user_id_moved_at_idx` ON `leadquadranthistory`(`user_id`, `moved_at`);
DROP INDEX `LeadQuadrantHistory_user_id_moved_at_idx` ON `leadquadranthistory`;

-- RedefineIndex
CREATE UNIQUE INDEX `leadsource_name_key` ON `leadsource`(`name`);
DROP INDEX `LeadSource_name_key` ON `leadsource`;

-- RedefineIndex
CREATE UNIQUE INDEX `paymenttype_name_key` ON `paymenttype`(`name`);
DROP INDEX `PaymentType_name_key` ON `paymenttype`;

-- RedefineIndex
CREATE UNIQUE INDEX `privilege_user_id_module_name_key` ON `privilege`(`user_id`, `module_name`);
DROP INDEX `Privilege_user_id_module_name_key` ON `privilege`;

-- RedefineIndex
CREATE UNIQUE INDEX `product_name_key` ON `product`(`name`);
DROP INDEX `Product_name_key` ON `product`;

-- RedefineIndex
CREATE UNIQUE INDEX `salesstage_name_key` ON `salesstage`(`name`);
DROP INDEX `SalesStage_name_key` ON `salesstage`;

-- RedefineIndex
CREATE UNIQUE INDEX `session_sid_key` ON `session`(`sid`);
DROP INDEX `Session_sid_key` ON `session`;

-- RedefineIndex
CREATE UNIQUE INDEX `sourceofdb_name_key` ON `sourceofdb`(`name`);
DROP INDEX `SourceOfDB_name_key` ON `sourceofdb`;

-- RedefineIndex
CREATE UNIQUE INDEX `swatperformance_user_id_date_product_id_service_department_key` ON `swatperformance`(`user_id`, `date`, `product_id`, `service_department`);
DROP INDEX `SwatPerformance_user_id_date_product_id_service_department_key` ON `swatperformance`;

-- RedefineIndex
CREATE UNIQUE INDEX `user_email_key` ON `user`(`email`);
DROP INDEX `User_email_key` ON `user`;

-- RedefineIndex
CREATE UNIQUE INDEX `userproducttarget_user_id_product_id_key` ON `userproducttarget`(`user_id`, `product_id`);
DROP INDEX `UserProductTarget_user_id_product_id_key` ON `userproducttarget`;

-- RedefineIndex
CREATE UNIQUE INDEX `vertical_name_key` ON `vertical`(`name`);
DROP INDEX `Vertical_name_key` ON `vertical`;

-- RedefineIndex
CREATE INDEX `weeklyreportdetail_weekly_report_id_type_metric_idx` ON `weeklyreportdetail`(`weekly_report_id`, `type`, `metric`);
DROP INDEX `WeeklyReportDetail_weekly_report_id_type_metric_idx` ON `weeklyreportdetail`;


-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NULL,
    `role` ENUM('CEO', 'SalesManager', 'SalesPerson') NOT NULL DEFAULT 'SalesPerson',
    `status` ENUM('INVITED', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'INVITED',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `joining_date` DATETIME(3) NULL,
    `revenue_target` INTEGER NULL DEFAULT 0,
    `device_target` INTEGER NULL DEFAULT 0,
    `leads_target` INTEGER NULL DEFAULT 0,
    `calls_target` INTEGER NULL DEFAULT 0,
    `activities_target` INTEGER NULL DEFAULT 0,
    `q1_target` INTEGER NULL DEFAULT 0,
    `linkedin_target` INTEGER NULL DEFAULT 0,
    `demo_target` INTEGER NULL DEFAULT 0,
    `proposal_target` INTEGER NULL DEFAULT 0,
    `direct_visit_target` INTEGER NULL DEFAULT 0,
    `company_id` INTEGER NULL,
    `sbu_id` INTEGER NULL,
    `reporting_manager_id` INTEGER NULL,
    `reset_token` VARCHAR(191) NULL,
    `reset_token_expiry` DATETIME(3) NULL,
    `department_id` INTEGER NULL,
    `department` VARCHAR(191) NOT NULL DEFAULT 'IM',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Privilege` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `module_name` VARCHAR(191) NOT NULL,
    `can_add` BOOLEAN NOT NULL DEFAULT false,
    `can_edit` BOOLEAN NOT NULL DEFAULT false,
    `can_delete` BOOLEAN NOT NULL DEFAULT false,
    `can_view` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Privilege_user_id_module_name_key`(`user_id`, `module_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Department_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Company_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SBU` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `company_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobTitle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `JobTitle_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadSource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `LeadSource_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Industry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Industry_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Country` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Country_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `State` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `country_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `City` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `state_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `count_type` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `lead_multiplier_count` DOUBLE NOT NULL DEFAULT 1.0,
    `q4_to_q3_days` INTEGER NOT NULL DEFAULT 0,
    `q3_to_q2_days` INTEGER NOT NULL DEFAULT 0,
    `q2_to_q1_days` INTEGER NOT NULL DEFAULT 0,
    `q1_to_nurturing_days` INTEGER NOT NULL DEFAULT 0,
    `device_q4_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `device_q3_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `device_q2_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `device_q1_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `lead_q4_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `lead_q3_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `lead_q2_multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `lead_q1_multiplier` DOUBLE NOT NULL DEFAULT 1.0,

    UNIQUE INDEX `Product_name_key`(`name`),
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
CREATE TABLE `Persona` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `product_or_service` VARCHAR(191) NULL,
    `product_id` INTEGER NULL,
    `eit_service_id` INTEGER NULL,
    `im_service_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Collateral` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Collateral_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesStage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `SalesStage_name_key`(`name`),
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
CREATE TABLE `UserServiceTarget` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `service_department` VARCHAR(191) NOT NULL,
    `sales_target` INTEGER NULL DEFAULT 0,
    `revenue_target` INTEGER NULL DEFAULT 0,
    `device_target` INTEGER NULL DEFAULT 0,
    `leads_target` INTEGER NULL DEFAULT 0,
    `calls_target` INTEGER NULL DEFAULT 0,
    `linkedin_target` INTEGER NULL DEFAULT 0,
    `direct_visit_target` INTEGER NULL DEFAULT 0,
    `days` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserServiceTarget_user_id_service_department_key`(`user_id`, `service_department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Activity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Activity_name_key`(`name`),
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
CREATE TABLE `Lead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_by_id` INTEGER NOT NULL,
    `sales_sbu_id` INTEGER NULL,
    `lead_owner_id` INTEGER NULL,
    `salutation` ENUM('Mr', 'Mrs', 'Ms', 'Dr') NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `company_name` VARCHAR(191) NULL,
    `company_id` INTEGER NULL,
    `job_title_id` INTEGER NULL,
    `avatar_id` INTEGER NULL,
    `lead_source_id` INTEGER NULL,
    `industry_id` INTEGER NULL,
    `address` TEXT NULL,
    `country_id` INTEGER NULL,
    `state_id` INTEGER NULL,
    `city_id` INTEGER NULL,
    `pin_code` VARCHAR(191) NULL,
    `other_info` TEXT NULL,
    `annual_turnover` DECIMAL(65, 30) NULL,
    `mobile_number` VARCHAR(191) NULL,
    `whatsapp_number` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `product_or_service` VARCHAR(191) NULL,
    `product_id` INTEGER NULL,
    `eit_service_id` INTEGER NULL,
    `im_service_id` INTEGER NULL,
    `persona_id` INTEGER NULL,
    `where_find_them_id` INTEGER NULL,
    `telecalling_qualified` BOOLEAN NOT NULL DEFAULT false,
    `device_count` VARCHAR(191) NULL,
    `employee_count` VARCHAR(191) NULL,
    `vendor_count` VARCHAR(191) NULL,
    `branch_unit` VARCHAR(191) NULL,
    `license_count` VARCHAR(191) NULL,
    `custom_count_type` VARCHAR(191) NULL,
    `requirement_desc` TEXT NULL,
    `pain_points` TEXT NULL,
    `pain_points_files` TEXT NULL,
    `demo_completed` BOOLEAN NOT NULL DEFAULT false,
    `pilot_provided` BOOLEAN NOT NULL DEFAULT false,
    `demo_done_authority` BOOLEAN NOT NULL DEFAULT false,
    `post_demo_feedback_sent` BOOLEAN NOT NULL DEFAULT false,
    `post_demo_feedback_received` BOOLEAN NOT NULL DEFAULT false,
    `post_demo_feedback_file` VARCHAR(191) NULL,
    `probing_discussion_authority` BOOLEAN NOT NULL DEFAULT false,
    `direct_visit_authority` BOOLEAN NOT NULL DEFAULT false,
    `pilot_given` BOOLEAN NOT NULL DEFAULT false,
    `mgmt_call_completed` BOOLEAN NOT NULL DEFAULT false,
    `utilized_mgmt_urgency` BOOLEAN NOT NULL DEFAULT false,
    `utilized_presales_timeline` BOOLEAN NOT NULL DEFAULT false,
    `authority_champion_influencer_identified` BOOLEAN NOT NULL DEFAULT false,
    `competitor_details` TEXT NULL,
    `opportunities_values` TEXT NULL,
    `order_won_attachment` VARCHAR(191) NULL,
    `order_value` DECIMAL(65, 30) NULL,
    `sales_device` INTEGER NULL,
    `lead_score` INTEGER NOT NULL DEFAULT 0,
    `cp_score` INTEGER NOT NULL DEFAULT 0,
    `reduce_cost_score` INTEGER NOT NULL DEFAULT 0,
    `efficiency_score` INTEGER NOT NULL DEFAULT 0,
    `automation_score` INTEGER NOT NULL DEFAULT 0,
    `others_score` INTEGER NOT NULL DEFAULT 0,
    `others_score_label` VARCHAR(191) NULL,
    `compliance_score` INTEGER NOT NULL DEFAULT 0,
    `established_need_score` INTEGER NOT NULL DEFAULT 0,
    `urgency_score` INTEGER NOT NULL DEFAULT 0,
    `budget_allocated_score` INTEGER NOT NULL DEFAULT 0,
    `decision_maker_score` INTEGER NOT NULL DEFAULT 0,
    `competition_score` INTEGER NOT NULL DEFAULT 0,
    `champion_score` INTEGER NOT NULL DEFAULT 0,
    `influencer_score` INTEGER NOT NULL DEFAULT 0,
    `lead_source_quality` INTEGER NOT NULL DEFAULT 0,
    `decision_contact_score` INTEGER NOT NULL DEFAULT 0,
    `budget_yes_no` BOOLEAN NOT NULL DEFAULT false,
    `budget_allocated` VARCHAR(191) NULL,
    `approval_stage` VARCHAR(191) NULL,
    `authority_yes_no` BOOLEAN NOT NULL DEFAULT false,
    `decision_maker` VARCHAR(191) NULL,
    `need_yes_no` BOOLEAN NOT NULL DEFAULT false,
    `pain_points_desc` TEXT NULL,
    `timeline_yes_no` BOOLEAN NOT NULL DEFAULT false,
    `expected_closure_date` DATETIME(3) NULL,
    `quadrant` VARCHAR(191) NULL,
    `quadrant_updated_at` DATETIME(3) NULL,
    `quadrant_start_date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_positive_movement_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `follow_up_activity_id` INTEGER NULL,
    `follow_up_datetime` DATETIME(3) NULL,
    `sales_stage_id` INTEGER NULL,
    `next_activity_id` INTEGER NULL,
    `next_activity_datetime` DATETIME(3) NULL,
    `is_farming` BOOLEAN NOT NULL DEFAULT false,
    `farming_moved_at` DATETIME(3) NULL,
    `call_tracker_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lead_call_tracker_id_key`(`call_tracker_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadContact` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `contact_mobile` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `avatar_id` INTEGER NULL,
    `persona_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `follow_up_log_id` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FollowUpLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `activity_id` INTEGER NULL,
    `sales_stage_id` INTEGER NULL,
    `next_activity_id` INTEGER NULL,
    `date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` INTEGER NOT NULL,

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
    `moved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadQuadrantHistory_user_id_moved_at_idx`(`user_id`, `moved_at`),
    INDEX `LeadQuadrantHistory_old_quadrant_new_quadrant_idx`(`old_quadrant`, `new_quadrant`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadScore` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `breakdown` TEXT NULL,
    `updated_by` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CallLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `duration_sec` INTEGER NULL,
    `outcome` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `recording_url` VARCHAR(191) NULL,
    `bant_snapshot` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Sent',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_user_id_created_at_idx`(`user_id`, `created_at`),
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
CREATE TABLE `KraEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `calls_target` INTEGER NOT NULL,
    `calls_actual` INTEGER NOT NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PomodoroSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `duration_sec` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingNegotiationLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `details` TEXT NULL,
    `created_by` INTEGER NOT NULL,

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
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SwatPerformance_user_id_date_product_id_service_department_key`(`user_id`, `date`, `product_id`, `service_department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BulkUploadStaging` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `file_name` VARCHAR(191) NULL,
    `original_row_data` TEXT NOT NULL,
    `mapped_data` TEXT NOT NULL,
    `has_validation_error` BOOLEAN NOT NULL DEFAULT false,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

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
    `validated_by_id` INTEGER NULL,
    `allocated_to_id` INTEGER NULL,
    `product_id` INTEGER NULL,
    `linkedin_status` VARCHAR(191) NULL,
    `sales_stage_id` INTEGER NULL,
    `remarks` TEXT NULL,
    `frequency` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `mktg_effectiveness` VARCHAR(191) NULL,
    `is_converted` BOOLEAN NOT NULL DEFAULT false,
    `converted_at` DATETIME(3) NULL,
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
    `prev_q4_to_order` TEXT NULL,
    `prev_q3_to_q4` TEXT NULL,
    `prev_q2_to_q3` TEXT NULL,
    `prev_notes` TEXT NULL,
    `curr_q4_to_order` TEXT NULL,
    `curr_q3_to_q4` TEXT NULL,
    `curr_q2_to_q3` TEXT NULL,
    `curr_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WeeklyReport_user_id_date_key`(`user_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanOfAction` (
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

-- CreateTable
CREATE TABLE `_ManagerCompanies` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ManagerCompanies_AB_unique`(`A`, `B`),
    INDEX `_ManagerCompanies_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CollateralToLead` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CollateralToLead_AB_unique`(`A`, `B`),
    INDEX `_CollateralToLead_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_sbu_id_fkey` FOREIGN KEY (`sbu_id`) REFERENCES `SBU`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_reporting_manager_id_fkey` FOREIGN KEY (`reporting_manager_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Privilege` ADD CONSTRAINT `Privilege_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SBU` ADD CONSTRAINT `SBU_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `State` ADD CONSTRAINT `State_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `State`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `UserServiceTarget` ADD CONSTRAINT `UserServiceTarget_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_lead_owner_id_fkey` FOREIGN KEY (`lead_owner_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sales_sbu_id_fkey` FOREIGN KEY (`sales_sbu_id`) REFERENCES `SBU`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `JobTitle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `Industry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `State`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `EitService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `ImService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `Persona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `Avatar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_where_find_them_id_fkey` FOREIGN KEY (`where_find_them_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_follow_up_activity_id_fkey` FOREIGN KEY (`follow_up_activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `SalesStage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_call_tracker_id_fkey` FOREIGN KEY (`call_tracker_id`) REFERENCES `CallTracker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `Avatar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `Persona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadDocument` ADD CONSTRAINT `LeadDocument_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadDocument` ADD CONSTRAINT `LeadDocument_follow_up_log_id_fkey` FOREIGN KEY (`follow_up_log_id`) REFERENCES `FollowUpLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `SalesStage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQuadrantHistory` ADD CONSTRAINT `LeadQuadrantHistory_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadScore` ADD CONSTRAINT `LeadScore_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallActivityLog` ADD CONSTRAINT `CallActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwatKeyClosure` ADD CONSTRAINT `SwatKeyClosure_swat_performance_id_fkey` FOREIGN KEY (`swat_performance_id`) REFERENCES `SwatPerformance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KraEntry` ADD CONSTRAINT `KraEntry_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PomodoroSession` ADD CONSTRAINT `PomodoroSession_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingNegotiationLog` ADD CONSTRAINT `PricingNegotiationLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingNegotiationLog` ADD CONSTRAINT `PricingNegotiationLog_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `State`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_validated_by_id_fkey` FOREIGN KEY (`validated_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_allocated_to_id_fkey` FOREIGN KEY (`allocated_to_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `SalesStage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReport` ADD CONSTRAINT `WeeklyReport_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanOfAction` ADD CONSTRAINT `PlanOfAction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ManagerCompanies` ADD CONSTRAINT `_ManagerCompanies_A_fkey` FOREIGN KEY (`A`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ManagerCompanies` ADD CONSTRAINT `_ManagerCompanies_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CollateralToLead` ADD CONSTRAINT `_CollateralToLead_A_fkey` FOREIGN KEY (`A`) REFERENCES `Collateral`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CollateralToLead` ADD CONSTRAINT `_CollateralToLead_B_fkey` FOREIGN KEY (`B`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


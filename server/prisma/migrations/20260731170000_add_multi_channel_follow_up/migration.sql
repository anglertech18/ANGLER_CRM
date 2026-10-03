-- Add multi-channel follow-up architecture tables (renewal module only)
-- Minimal version: tables only, no foreign keys

-- Drop tables if they exist (to clean up partial attempts)
DROP TABLE IF EXISTS `renewal_communication_event`;
DROP TABLE IF EXISTS `renewal_follow_up_channel_action`;
DROP TABLE IF EXISTS `renewal_follow_up_task`;

-- CreateTable: RenewalFollowUpTask
CREATE TABLE `renewal_follow_up_task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `renewal_account_id` INTEGER NOT NULL,
    `service_instance_id` INTEGER NOT NULL,
    `cycle_id` INTEGER NOT NULL,
    `policy_version` INTEGER NULL,
    `follow_up_group_key` VARCHAR(50) NOT NULL,
    `scheduled_for` DATETIME(3) NOT NULL,
    `overall_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `assigned_user_id` INTEGER NULL,
    `completed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancel_reason` VARCHAR(500) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `source_type` VARCHAR(191) NOT NULL DEFAULT 'POLICY_STEP',
    `source_reference_id` INTEGER NULL,
    `migration_confidence` VARCHAR(20) NULL,
    `source` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `renewal_follow_up_task_scheduled_for_overall_status_idx`(`scheduled_for`, `overall_status`),
    INDEX `renewal_follow_up_task_assigned_user_id_overall_status_idx`(`assigned_user_id`, `overall_status`),
    INDEX `renewal_follow_up_task_cycle_id_idx`(`cycle_id`),
    INDEX `renewal_follow_up_task_policy_version_idx`(`policy_version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: RenewalFollowUpChannelAction
CREATE TABLE `renewal_follow_up_channel_action` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `follow_up_task_id` INTEGER NOT NULL,
    `renewal_account_id` INTEGER NOT NULL,
    `service_instance_id` INTEGER NOT NULL,
    `cycle_id` INTEGER NOT NULL,
    `reminder_id` INTEGER NULL,
    `channel` VARCHAR(20) NOT NULL,
    `action_type` VARCHAR(30) NOT NULL,
    `execution_mode` VARCHAR(30) NOT NULL DEFAULT 'AUTOMATIC',
    `communication_purpose` VARCHAR(30) NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `scheduled_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `recipient_contact_id` INTEGER NULL,
    `recipient_address` VARCHAR(300) NULL,
    `template_id` INTEGER NULL,
    `idempotency_key` VARCHAR(100) NOT NULL,
    `provider_message_id` VARCHAR(200) NULL,
    `outcome_code` VARCHAR(50) NULL,
    `customer_response` TEXT NULL,
    `notes` TEXT NULL,
    `created_by_id` INTEGER NULL,
    `completed_by_id` INTEGER NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `digest_outbox_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `renewal_follow_up_channel_action_follow_up_task_id_channel_idx`(`follow_up_task_id`, `channel`),
    INDEX `renewal_follow_up_channel_action_status_scheduled_at_idx`(`status`, `scheduled_at`),
    INDEX `renewal_follow_up_channel_action_idempotency_key_idx`(`idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: RenewalCommunicationEvent
CREATE TABLE `renewal_communication_event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `renewal_account_id` INTEGER NOT NULL,
    `service_instance_id` INTEGER NOT NULL,
    `cycle_id` INTEGER NOT NULL,
    `follow_up_task_id` INTEGER NULL,
    `channel_action_id` INTEGER NULL,
    `reminder_id` INTEGER NULL,
    `outbox_id` INTEGER NULL,
    `account_snapshot_id` INTEGER NULL,
    `service_snapshot_id` INTEGER NULL,
    `cycle_snapshot_id` INTEGER NULL,
    `task_snapshot_id` INTEGER NULL,
    `channel_action_snapshot_id` INTEGER NULL,
    `channel` VARCHAR(20) NOT NULL,
    `event_type` VARCHAR(30) NOT NULL,
    `execution_mode` VARCHAR(30) NULL,
    `communication_purpose` VARCHAR(30) NULL,
    `direction` VARCHAR(191) NOT NULL DEFAULT 'OUTBOUND',
    `status` VARCHAR(191) NOT NULL,
    `actor_type` VARCHAR(191) NOT NULL,
    `actor_user_id` INTEGER NULL,
    `recipient` VARCHAR(300) NULL,
    `subject_snapshot` VARCHAR(500) NULL,
    `body_snapshot` TEXT NULL,
    `attachment_metadata` TEXT NULL,
    `template_id` INTEGER NULL,
    `template_version` VARCHAR(50) NULL,
    `content_snapshot_ref` VARCHAR(500) NULL,
    `provider_message_id` VARCHAR(200) NULL,
    `error_code` VARCHAR(100) NULL,
    `error_message` TEXT NULL,
    `metadata` TEXT NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `renewal_communication_event_renewal_account_id_occurred_at_idx`(`renewal_account_id`, `occurred_at`),
    INDEX `renewal_communication_event_service_instance_id_occurred_at_idx`(`service_instance_id`, `occurred_at`),
    INDEX `renewal_communication_event_cycle_id_occurred_at_idx`(`cycle_id`, `occurred_at`),
    INDEX `renewal_communication_event_follow_up_task_id_occurred_at_idx`(`follow_up_task_id`, `occurred_at`),
    INDEX `renewal_communication_event_channel_action_id_occurred_at_idx`(`channel_action_id`, `occurred_at`),
    INDEX `renewal_communication_event_channel_occurred_at_idx`(`channel`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


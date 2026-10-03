-- Targeted migration: Create only the missing renewal_communication_event table
-- This script does NOT touch existing tables (renewal_follow_up_task, renewal_follow_up_channel_action)
-- Safe to run on current database state

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

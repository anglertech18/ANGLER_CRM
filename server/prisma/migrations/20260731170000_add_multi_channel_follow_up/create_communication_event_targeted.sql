-- ============================================================================
-- TARGETED MIGRATION: Create renewal_communication_event table only
-- ============================================================================
-- Purpose: Create the missing renewal_communication_event table
-- Safety: This script does NOT touch existing tables
-- Idempotent: Safe to run multiple times (checks if table exists first)
-- 
-- This script is based on schema.prisma RenewalCommunicationEvent model definition
-- It creates the table with all foreign keys and indexes as defined in schema.prisma
-- ============================================================================

-- Check if table already exists to make this idempotent
SET @table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
  AND table_name = 'renewal_communication_event'
);

-- Only create if table doesn't exist
SET @create_table_sql = IF(@table_exists = 0, 
'CREATE TABLE `renewal_communication_event` (
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
    `direction` VARCHAR(191) NOT NULL DEFAULT ''OUTBOUND'',
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
    
    -- Foreign Key Constraints
    CONSTRAINT `renewal_communication_event_renewal_account_id_fkey` 
        FOREIGN KEY (`renewal_account_id`) 
        REFERENCES `renewal_account`(`id`) 
        ON DELETE RESTRICT,
    
    CONSTRAINT `renewal_communication_event_service_instance_id_fkey` 
        FOREIGN KEY (`service_instance_id`) 
        REFERENCES `renewal_service_instance`(`id`) 
        ON DELETE RESTRICT,
    
    CONSTRAINT `renewal_communication_event_cycle_id_fkey` 
        FOREIGN KEY (`cycle_id`) 
        REFERENCES `renewal_cycle`(`id`) 
        ON DELETE RESTRICT,
    
    CONSTRAINT `renewal_communication_event_follow_up_task_id_fkey` 
        FOREIGN KEY (`follow_up_task_id`) 
        REFERENCES `renewal_follow_up_task`(`id`) 
        ON DELETE SET NULL,
    
    CONSTRAINT `renewal_communication_event_channel_action_id_fkey` 
        FOREIGN KEY (`channel_action_id`) 
        REFERENCES `renewal_follow_up_channel_action`(`id`) 
        ON DELETE SET NULL,
    
    CONSTRAINT `renewal_communication_event_reminder_id_fkey` 
        FOREIGN KEY (`reminder_id`) 
        REFERENCES `renewal_reminder`(`id`) 
        ON DELETE SET NULL,
    
    CONSTRAINT `renewal_communication_event_outbox_id_fkey` 
        FOREIGN KEY (`outbox_id`) 
        REFERENCES `notification_outbox`(`id`) 
        ON DELETE SET NULL,
    
    CONSTRAINT `renewal_communication_event_actor_user_id_fkey` 
        FOREIGN KEY (`actor_user_id`) 
        REFERENCES `user`(`id`) 
        ON DELETE SET NULL,
    
    -- Indexes
    INDEX `renewal_communication_event_renewal_account_id_occurred_at_idx`(`renewal_account_id`, `occurred_at`),
    INDEX `renewal_communication_event_service_instance_id_occurred_at_idx`(`service_instance_id`, `occurred_at`),
    INDEX `renewal_communication_event_cycle_id_occurred_at_idx`(`cycle_id`, `occurred_at`),
    INDEX `renewal_communication_event_follow_up_task_id_occurred_at_idx`(`follow_up_task_id`, `occurred_at`),
    INDEX `renewal_communication_event_channel_action_id_occurred_at_idx`(`channel_action_id`, `occurred_at`),
    INDEX `renewal_communication_event_channel_occurred_at_idx`(`channel`, `occurred_at`),
    
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
'SELECT ''Table renewal_communication_event already exists, skipping creation'' AS message'
);

PREPARE stmt FROM @create_table_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table was created
SELECT 
    'Table creation verification' AS check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables 
              WHERE table_schema = DATABASE() 
              AND table_name = 'renewal_communication_event') > 0 
        THEN 'PASS: Table exists'
        ELSE 'FAIL: Table does not exist'
    END AS result;

-- Verify foreign key constraints
SELECT 
    'Foreign key constraints verification' AS check_type,
    COUNT(*) AS fk_count,
    CASE 
        WHEN COUNT(*) >= 8 
        THEN 'PASS: All FKs present'
        ELSE CONCAT('FAIL: Only ', COUNT(*), ' FKs present (expected 8)')
    END AS result
FROM information_schema.KEY_COLUMN_USAGE kcu
WHERE kcu.table_schema = DATABASE()
AND kcu.table_name = 'renewal_communication_event'
AND kcu.REFERENCED_TABLE_NAME IS NOT NULL;

-- Verify indexes
SELECT 
    'Index verification' AS check_type,
    COUNT(*) AS index_count,
    CASE 
        WHEN COUNT(*) >= 7 
        THEN 'PASS: All indexes present'
        ELSE CONCAT('FAIL: Only ', COUNT(*), ' indexes present (expected 7)')
    END AS result
FROM information_schema.STATISTICS
WHERE table_schema = DATABASE()
AND table_name = 'renewal_communication_event'
AND INDEX_NAME != 'PRIMARY';

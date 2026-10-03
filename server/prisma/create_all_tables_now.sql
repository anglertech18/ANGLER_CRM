-- =============================================================================
-- STANDALONE MIGRATION SCRIPT - CREATES ALL MISSING RENEWAL & PRICING TABLES
-- Safe to run multiple times on any MySQL database
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `renewal_instance_alert_step` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `service_instance_id` INT NOT NULL,
  `step_number` INT NOT NULL DEFAULT 1,
  `days_before` INT NOT NULL,
  `channel` VARCHAR(30) NOT NULL,
  `email_template_id` INT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_service_price` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `service_master_id` INT NOT NULL,
  `base_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `billing_unit` VARCHAR(20) NOT NULL DEFAULT 'year',
  `currency` VARCHAR(5) NOT NULL DEFAULT 'INR',
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `is_current` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT NULL,
  `created_by_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_customer_price` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_company_id` INT NOT NULL,
  `service_master_id` INT NOT NULL,
  `override_price` DECIMAL(12,2) NOT NULL,
  `billing_unit` VARCHAR(20) NOT NULL DEFAULT 'year',
  `currency` VARCHAR(5) NOT NULL DEFAULT 'INR',
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT NULL,
  `approved_by_id` INT NULL,
  `created_by_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_policy_version` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `policy_id` INT NOT NULL,
  `version` INT NOT NULL,
  `name_snapshot` VARCHAR(191) NOT NULL,
  `steps_snapshot` TEXT NOT NULL,
  `change_summary` VARCHAR(500) NULL,
  `changed_by_id` INT NULL,
  `change_reason` VARCHAR(500) NULL,
  `affected_services_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_template_version` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `version` INT NOT NULL,
  `subject_snapshot` VARCHAR(500) NULL,
  `body_html_snapshot` LONGTEXT NOT NULL,
  `body_text_snapshot` LONGTEXT NULL,
  `change_summary` VARCHAR(500) NULL,
  `changed_by_id` INT NULL,
  `change_reason` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `smtp_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `host` VARCHAR(200) NOT NULL,
  `port` INT NOT NULL DEFAULT 587,
  `secure` TINYINT NOT NULL DEFAULT 0,
  `username` VARCHAR(300) NOT NULL,
  `password_enc` VARCHAR(500) NOT NULL,
  `from_email` VARCHAR(300) NOT NULL,
  `from_name` VARCHAR(200) NOT NULL DEFAULT 'Angler iTech Solutions',
  `reply_to` VARCHAR(300) NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `tested_at` DATETIME NULL,
  `test_result` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE renewal_service_category ADD COLUMN IF NOT EXISTS parent_id INT NULL;
ALTER TABLE renewal_service_master ADD COLUMN IF NOT EXISTS sub_category_id INT NULL;

ALTER TABLE renewal_contact ADD COLUMN IF NOT EXISTS address TEXT NULL;
ALTER TABLE renewal_contact ADD COLUMN IF NOT EXISTS city_pincode VARCHAR(100) NULL;
ALTER TABLE renewal_contact ADD COLUMN IF NOT EXISTS state VARCHAR(100) NULL;
ALTER TABLE renewal_contact ADD COLUMN IF NOT EXISTS gstin VARCHAR(50) NULL;
ALTER TABLE renewal_contact ADD COLUMN IF NOT EXISTS email_consent TINYINT(1) DEFAULT 1;
ALTER TABLE renewal_contact ADD COLUMN IF NOT EXISTS phone_consent TINYINT(1) DEFAULT 1;
ALTER TABLE renewal_contact ADD COLUMN IF NOT EXISTS use_default_template TINYINT(1) DEFAULT 0;

ALTER TABLE renewal_service_instance ADD COLUMN IF NOT EXISTS email_count INT NULL;
ALTER TABLE renewal_service_instance ADD COLUMN IF NOT EXISTS provider_type VARCHAR(50) NULL;
ALTER TABLE renewal_service_instance ADD COLUMN IF NOT EXISTS server_name VARCHAR(200) NULL;
ALTER TABLE renewal_service_instance ADD COLUMN IF NOT EXISTS plan_name VARCHAR(200) NULL;

ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS completed_by_id INT NULL;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS skipped_at DATETIME NULL;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS skip_reason TEXT NULL;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS policy_version INT NULL;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS is_mandatory TINYINT(1) DEFAULT 0;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS escalation_after_days INT NULL;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS escalate_to_id INT NULL;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS escalated TINYINT(1) DEFAULT 0;
ALTER TABLE renewal_reminder ADD COLUMN IF NOT EXISTS escalated_at DATETIME NULL;

ALTER TABLE renewal_template_version ADD COLUMN IF NOT EXISTS name_snapshot VARCHAR(200) NULL;
ALTER TABLE renewal_template_version ADD COLUMN IF NOT EXISTS body_snapshot LONGTEXT NULL;

ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS digest_channel_action_ids TEXT NULL;
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) NULL;
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS delivery_timestamp DATETIME NULL;
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS read_timestamp DATETIME NULL;
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS bounce_type VARCHAR(50) NULL;

ALTER TABLE renewal_cycle ADD COLUMN IF NOT EXISTS reminder_policy_snapshot LONGTEXT NULL;
ALTER TABLE renewal_cycle ADD COLUMN IF NOT EXISTS not_renewing_reason LONGTEXT NULL;

ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS compiled_html LONGTEXT NULL;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Missing tables created successfully' AS status;

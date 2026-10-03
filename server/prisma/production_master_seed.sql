-- =============================================================================
-- ANGLER CRM - PRODUCTION & UAT MASTER DATA & SCHEMA MIGRATION SQL SCRIPT
-- Idempotent & Safe for Execution via PuTTY / MySQL CLI
-- Target Database: testdb / angler_uat_crm / kannan_angler_crm
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────
-- 1. CREATE ALL RENEWAL TABLES (IF NOT EXISTS)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `renewal_service_category` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(191) NOT NULL,
  `code`       VARCHAR(20)  NOT NULL,
  `color`      VARCHAR(20)  NULL DEFAULT '#6366f1',
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `renewal_service_category_name_key` (`name`),
  UNIQUE KEY `renewal_service_category_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_notification_template` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191) NOT NULL,
  `category_code` VARCHAR(20)  NULL,
  `channel`       VARCHAR(20)  NOT NULL,
  `subject`       VARCHAR(500) NULL,
  `body_html`     LONGTEXT     NOT NULL,
  `body_text`     LONGTEXT     NULL,
  `variables`     LONGTEXT     NULL,
  `version`       INT          NOT NULL DEFAULT 1,
  `editor_json`   LONGTEXT     NULL,
  `compiled_html` LONGTEXT     NULL,
  `brand_profile_id` INT       NULL,
  `is_published`  TINYINT(1)   NOT NULL DEFAULT 0,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_reminder_policy` (
  `id`                  INT          NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(191) NOT NULL,
  `company_id`          INT          NULL,
  `service_category_id` INT          NULL,
  `service_master_id`   INT          NULL,
  `is_default`          TINYINT(1)   NOT NULL DEFAULT 0,
  `use_business_days`   TINYINT(1)   NOT NULL DEFAULT 0,
  `skip_weekends`       TINYINT(1)   NOT NULL DEFAULT 0,
  `timezone`            VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  `version`             INT          NOT NULL DEFAULT 1,
  `is_active`           TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_service_master` (
  `id`                         INT          NOT NULL AUTO_INCREMENT,
  `name`                       VARCHAR(191) NOT NULL,
  `category_id`                INT          NOT NULL,
  `identifier_label`           VARCHAR(100) NULL DEFAULT 'Identifier',
  `requires_identifier`        TINYINT(1)   NOT NULL DEFAULT 1,
  `default_duration_value`     INT          NULL DEFAULT 12,
  `default_duration_unit`      VARCHAR(20)  NULL DEFAULT 'months',
  `supports_quantity`          TINYINT(1)   NOT NULL DEFAULT 0,
  `supports_provider`          TINYINT(1)   NOT NULL DEFAULT 1,
  `supports_amc`               TINYINT(1)   NOT NULL DEFAULT 0,
  `supports_support_package`   TINYINT(1)   NOT NULL DEFAULT 0,
  `default_reminder_policy_id` INT          NULL,
  `is_active`                  TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`                 INT          NOT NULL DEFAULT 0,
  `created_at`                 DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`                 DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_reminder_step` (
  `id`                  INT          NOT NULL AUTO_INCREMENT,
  `policy_id`           INT          NOT NULL,
  `step_number`         INT          NOT NULL,
  `offset_days`         INT          NOT NULL,
  `relative_to`         VARCHAR(30)  NOT NULL DEFAULT 'EXPIRY_DATE',
  `action_type`         VARCHAR(50)  NOT NULL,
  `channel`             VARCHAR(20)  NOT NULL,
  `recipient_type`      VARCHAR(30)  NOT NULL,
  `template_id`         INT          NULL,
  `escalate_after_days` INT          NULL,
  `escalate_to`         VARCHAR(100) NULL,
  `is_mandatory`        TINYINT(1)   NOT NULL DEFAULT 0,
  `is_enabled`          TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_service_plan_master` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `category_code` VARCHAR(50) NULL DEFAULT 'SERVER',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_provider` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(191) NOT NULL,
  `category_code` VARCHAR(50) NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `renewal_provider_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_provider_sub_item` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `provider_id` INT          NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `type`        VARCHAR(50)  NOT NULL DEFAULT 'SERVER',
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `renewal_provider_sub_item_provider_id_idx` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_contact` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `client_company_id`  INT          NOT NULL,
  `name`               VARCHAR(191) NOT NULL,
  `designation`        VARCHAR(191) NULL,
  `department`         VARCHAR(100) NULL,
  `email`              VARCHAR(191) NULL,
  `mobile`             VARCHAR(30)  NULL,
  `whatsapp`           VARCHAR(30)  NULL,
  `role`               VARCHAR(30)  NULL,
  `is_primary`         TINYINT(1)   NOT NULL DEFAULT 0,
  `is_renewal_contact` TINYINT(1)   NOT NULL DEFAULT 1,
  `whatsapp_consent`   TINYINT(1)   NOT NULL DEFAULT 0,
  `is_active`          TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_account` (
  `id`                   INT          NOT NULL AUTO_INCREMENT,
  `company_id`           INT          NULL,
  `client_company_id`    INT          NOT NULL,
  `account_manager_id`   INT          NULL,
  `renewal_executive_id` INT          NULL,
  `order_number`         VARCHAR(100) NULL,
  `order_date`           DATETIME(3)  NULL,
  `po_reference`         VARCHAR(100) NULL,
  `invoice_number`       VARCHAR(100) NULL,
  `invoice_date`         DATETIME(3)  NULL,
  `notes`                LONGTEXT     NULL,
  `status`               VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
  `source_lead_id`       INT          NULL,
  `created_by_id`        INT          NOT NULL,
  `is_active`            TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_account_contact` (
  `id`                 INT NOT NULL AUTO_INCREMENT,
  `renewal_account_id` INT NOT NULL,
  `contact_id`         INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_service_instance` (
  `id`                  INT            NOT NULL AUTO_INCREMENT,
  `renewal_account_id`  INT            NOT NULL,
  `service_master_id`   INT            NOT NULL,
  `identifier`          VARCHAR(300)   NULL,
  `provider_id`         INT            NULL,
  `quantity`            INT            NOT NULL DEFAULT 1,
  `activation_date`     DATETIME(3)    NULL,
  `expiry_date`         DATETIME(3)    NULL,
  `actual_expiry_date`  DATETIME(3)    NULL,
  `duration_value`      INT            NULL DEFAULT 12,
  `duration_unit`       VARCHAR(20)    NULL DEFAULT 'months',
  `amount_due`          DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `amc_amount`          DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `support_amount`      DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `assigned_user_id`    INT            NULL,
  `customer_contact_id` INT            NULL,
  `reminder_policy_id`  INT            NULL,
  `override_policy`     TINYINT(1)     NOT NULL DEFAULT 0,
  `status`              VARCHAR(30)    NOT NULL DEFAULT 'ACTIVE',
  `remarks`             LONGTEXT       NULL,
  `is_active`           TINYINT(1)     NOT NULL DEFAULT 1,
  `created_at`          DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_cycle` (
  `id`                       INT           NOT NULL AUTO_INCREMENT,
  `service_instance_id`      INT           NOT NULL,
  `cycle_number`             INT           NOT NULL DEFAULT 1,
  `activation_date`          DATETIME(3)   NULL,
  `expiry_date`              DATETIME(3)   NULL,
  `amount_due`               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_collected`         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `outstanding`              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `reminder_policy_snapshot` LONGTEXT      NULL,
  `status`                   VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
  `renewed_at`               DATETIME(3)   NULL,
  `renewed_by_id`            INT           NULL,
  `not_renewing_reason`      LONGTEXT      NULL,
  `is_active`                TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`               DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`               DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_reminder` (
  `id`                    INT          NOT NULL AUTO_INCREMENT,
  `cycle_id`              INT          NOT NULL,
  `step_number`           INT          NOT NULL,
  `offset_days`           INT          NOT NULL,
  `due_date`              DATETIME(3)  NOT NULL,
  `action_type`           VARCHAR(50)  NOT NULL,
  `channel`               VARCHAR(20)  NOT NULL,
  `recipient_type`        VARCHAR(30)  NOT NULL,
  `assigned_user_id`      INT          NULL,
  `template_id`           INT          NULL,
  `status`                VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  `created_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_followup_log` (
  `id`                  INT          NOT NULL AUTO_INCREMENT,
  `service_instance_id` INT          NOT NULL,
  `reminder_id`         INT          NULL,
  `outcome_code`        VARCHAR(30)  NULL,
  `contacted`           TINYINT(1)   NOT NULL DEFAULT 0,
  `notes`               LONGTEXT     NULL,
  `customer_response`   LONGTEXT     NULL,
  `next_follow_up_date` DATETIME(3)  NULL,
  `logged_by_id`        INT          NOT NULL,
  `logged_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_payment` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `cycle_id`        INT           NOT NULL,
  `amount`          DECIMAL(12,2) NOT NULL,
  `payment_date`    DATETIME(3)   NOT NULL,
  `collected_by_id` INT           NULL,
  `payment_mode`    VARCHAR(50)   NULL,
  `reference`       VARCHAR(200)  NULL,
  `remarks`         LONGTEXT      NULL,
  `created_at`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_document` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `renewal_account_id` INT          NOT NULL,
  `document_type`      VARCHAR(50)  NULL,
  `name`               VARCHAR(300) NULL,
  `url`                VARCHAR(500) NOT NULL,
  `uploaded_by_id`     INT          NULL,
  `uploaded_at`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_audit_log` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `renewal_account_id` INT          NOT NULL,
  `entity_type`        VARCHAR(30)  NOT NULL,
  `entity_id`          INT          NOT NULL,
  `action`             VARCHAR(50)  NOT NULL,
  `old_value`          LONGTEXT     NULL,
  `new_value`          LONGTEXT     NULL,
  `performed_by_id`    INT          NOT NULL,
  `performed_at`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ip_address`         VARCHAR(45)  NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_brand_profile` (
  `id`              INT          NOT NULL AUTO_INCREMENT,
  `company_id`      INT          NULL,
  `profile_name`    VARCHAR(191) NOT NULL DEFAULT 'Default',
  `company_name`    VARCHAR(200) NULL,
  `logo_url`        VARCHAR(500) NULL,
  `alt_logo_url`    VARCHAR(500) NULL,
  `primary_color`   VARCHAR(7)   NULL DEFAULT '#074388',
  `secondary_color` VARCHAR(7)   NULL DEFAULT '#0ea5e9',
  `sender_name`     VARCHAR(191) NULL DEFAULT 'Angler iTech Solutions',
  `sender_email`    VARCHAR(300) NULL,
  `reply_to_email`  VARCHAR(300) NULL,
  `phone`           VARCHAR(50)  NULL,
  `website_url`     VARCHAR(300) NULL,
  `email_footer`    LONGTEXT     NULL,
  `bank_name`       VARCHAR(200) NULL,
  `bank_account_no` VARCHAR(100) NULL,
  `bank_branch`     VARCHAR(200) NULL,
  `bank_ifsc`       VARCHAR(50)  NULL,
  `bank_account_name` VARCHAR(200) NULL,
  `is_default`      TINYINT(1)   NOT NULL DEFAULT 0,
  `is_active`       TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `application_notification` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `user_id`     INT          NOT NULL,
  `reminder_id` INT          NULL,
  `type`        VARCHAR(50)  NOT NULL,
  `title`       VARCHAR(300) NOT NULL,
  `body`        LONGTEXT     NOT NULL,
  `link`        VARCHAR(500) NULL,
  `is_read`     TINYINT(1)   NOT NULL DEFAULT 0,
  `read_at`     DATETIME(3)  NULL,
  `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `whatsapp_web_session` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_name` VARCHAR(100) NOT NULL,
  `brand_key` VARCHAR(50) NOT NULL UNIQUE,
  `phone_number` VARCHAR(30) NULL,
  `company_id` INT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DISCONNECTED',
  `qr_code_base64` LONGTEXT NULL,
  `connected_at` DATETIME NULL,
  `last_active_at` DATETIME NULL,
  `error_message` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cron_job_lock` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_name` VARCHAR(100) NOT NULL UNIQUE,
  `lock_owner` VARCHAR(200) NOT NULL,
  `locked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `locked_until` DATETIME NOT NULL,
  `last_heartbeat_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_outbox` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `channel` VARCHAR(20) NOT NULL,
  `recipient` VARCHAR(300) NOT NULL,
  `cc_recipients` VARCHAR(500) NULL,
  `recipient_name` VARCHAR(200) NULL,
  `template_id` INT NULL,
  `subject` VARCHAR(500) NULL,
  `rendered_body` LONGTEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
  `attempt_count` INT NOT NULL DEFAULT 0,
  `next_retry_at` DATETIME NULL,
  `sent_at` DATETIME NULL,
  `provider_ref` VARCHAR(200) NULL,
  `error_message` TEXT NULL,
  `requires_approval` TINYINT(1) NOT NULL DEFAULT 0,
  `approved_by_id` INT NULL,
  `approved_at` DATETIME NULL,
  `mapping_context` LONGTEXT NULL,
  `attachment_path` VARCHAR(500) NULL,
  `session_phone` VARCHAR(30) NULL,
  `channel_action_id` INT NULL,
  `follow_up_task_id` INT NULL,
  `execution_mode` VARCHAR(50) NULL,
  `communication_purpose` VARCHAR(50) NULL,
  `idempotency_key` VARCHAR(200) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_follow_up_task` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `renewal_account_id` INT NOT NULL,
  `service_instance_id` INT NOT NULL,
  `cycle_id` INT NOT NULL,
  `policy_version` INT NULL,
  `follow_up_group_key` VARCHAR(50) NOT NULL,
  `scheduled_for` DATETIME NOT NULL,
  `overall_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  `assigned_user_id` INT NULL,
  `completed_at` DATETIME NULL,
  `cancelled_at` DATETIME NULL,
  `cancel_reason` VARCHAR(500) NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `source_type` VARCHAR(50) NOT NULL DEFAULT 'POLICY_STEP',
  `source_reference_id` INT NULL,
  `migration_confidence` VARCHAR(20) NULL,
  `source` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_follow_up_channel_action` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `follow_up_task_id` INT NOT NULL,
  `renewal_account_id` INT NOT NULL,
  `service_instance_id` INT NOT NULL,
  `cycle_id` INT NOT NULL,
  `reminder_id` INT NULL,
  `channel` VARCHAR(20) NOT NULL,
  `action_type` VARCHAR(30) NOT NULL,
  `execution_mode` VARCHAR(30) NOT NULL DEFAULT 'AUTOMATIC',
  `communication_purpose` VARCHAR(30) NULL,
  `is_required` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  `scheduled_at` DATETIME NULL,
  `started_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `recipient_contact_id` INT NULL,
  `recipient_address` VARCHAR(300) NULL,
  `template_id` INT NULL,
  `idempotency_key` VARCHAR(100) NOT NULL UNIQUE,
  `provider_message_id` VARCHAR(200) NULL,
  `outcome_code` VARCHAR(50) NULL,
  `customer_response` TEXT NULL,
  `notes` TEXT NULL,
  `created_by_id` INT NULL,
  `completed_by_id` INT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `digest_outbox_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `renewal_communication_event` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `renewal_account_id` INT NOT NULL,
  `service_instance_id` INT NOT NULL,
  `cycle_id` INT NOT NULL,
  `follow_up_task_id` INT NULL,
  `channel_action_id` INT NULL,
  `reminder_id` INT NULL,
  `outbox_id` INT NULL,
  `account_snapshot_id` INT NULL,
  `service_snapshot_id` INT NULL,
  `cycle_snapshot_id` INT NULL,
  `task_snapshot_id` INT NULL,
  `channel_action_snapshot_id` INT NULL,
  `channel` VARCHAR(20) NOT NULL,
  `event_type` VARCHAR(30) NOT NULL,
  `execution_mode` VARCHAR(30) NULL,
  `communication_purpose` VARCHAR(30) NULL,
  `direction` VARCHAR(20) NOT NULL DEFAULT 'OUTBOUND',
  `status` VARCHAR(50) NOT NULL,
  `actor_type` VARCHAR(50) NOT NULL,
  `actor_user_id` INT NULL,
  `recipient` VARCHAR(300) NULL,
  `subject_snapshot` VARCHAR(500) NULL,
  `body_snapshot` LONGTEXT NULL,
  `attachment_metadata` LONGTEXT NULL,
  `template_id` INT NULL,
  `template_version` VARCHAR(50) NULL,
  `content_snapshot_ref` VARCHAR(500) NULL,
  `provider_message_id` VARCHAR(200) NULL,
  `error_code` VARCHAR(100) NULL,
  `error_message` TEXT NULL,
  `metadata` LONGTEXT NULL,
  `occurred_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

-- ─────────────────────────────────────────────
-- 2. DDL UPDATES (SAFE ALTER STATEMENTS)
-- ─────────────────────────────────────────────

ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS category_code VARCHAR(20) NULL;
ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS variables LONGTEXT NULL;
ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS editor_json LONGTEXT NULL;
ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS compiled_html LONGTEXT NULL;
ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS brand_profile_id INT NULL;
ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS is_published TINYINT(1) DEFAULT 0;

ALTER TABLE client_company ADD COLUMN IF NOT EXISTS address TEXT NULL;
ALTER TABLE client_company ADD COLUMN IF NOT EXISTS city_pincode VARCHAR(100) NULL;
ALTER TABLE client_company ADD COLUMN IF NOT EXISTS state VARCHAR(100) NULL;
ALTER TABLE client_company ADD COLUMN IF NOT EXISTS gstin VARCHAR(50) NULL;
ALTER TABLE client_company ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL;
ALTER TABLE client_company ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL;

ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200) NULL;
ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(100) NULL;
ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(200) NULL;
ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50) NULL;
ALTER TABLE renewal_brand_profile ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200) NULL;

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

ALTER TABLE renewal_provider_sub_item ADD UNIQUE KEY IF NOT EXISTS renewal_provider_sub_item_provider_name_key (provider_id, name);

ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS digest_channel_action_ids TEXT NULL;
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) NULL;
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS delivery_timestamp DATETIME NULL;
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS read_timestamp DATETIME NULL;
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS bounce_type VARCHAR(50) NULL;

ALTER TABLE renewal_cycle ADD COLUMN IF NOT EXISTS reminder_policy_snapshot LONGTEXT NULL;
ALTER TABLE renewal_cycle ADD COLUMN IF NOT EXISTS not_renewing_reason LONGTEXT NULL;

-- ─────────────────────────────────────────────
-- 3. SEED CATEGORIES
-- ─────────────────────────────────────────────

INSERT INTO renewal_service_category (code, name, color, sort_order, is_active, created_at, updated_at) VALUES
('DOMAIN', 'Domain Services', '#6366f1', 1, 1, NOW(), NOW()),
('SERVER', 'Hosting & Server', '#3b82f6', 2, 1, NOW(), NOW()),
('EMAIL', 'Email Services', '#10b981', 3, 1, NOW(), NOW()),
('SSL', 'SSL Certificates', '#f59e0b', 4, 1, NOW(), NOW()),
('AMC', 'Annual Maintenance (AMC)', '#ec4899', 5, 1, NOW(), NOW()),
('SUPPORT', 'Technical Support & Security', '#8b5cf6', 6, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  color = VALUES(color),
  sort_order = VALUES(sort_order),
  is_active = 1,
  updated_at = NOW();

-- ─────────────────────────────────────────────
-- 4. SEED SERVICE MASTERS
-- ─────────────────────────────────────────────

INSERT INTO renewal_service_master (name, category_id, identifier_label, requires_identifier, default_duration_value, default_duration_unit, supports_quantity, supports_provider, supports_amc, supports_support_package, is_active, sort_order, created_at, updated_at) 
SELECT 'Domain Renewal', id, 'Domain Name', 1, 12, 'months', 0, 1, 0, 0, 1, 1, NOW(), NOW() FROM renewal_service_category WHERE code = 'DOMAIN'
ON DUPLICATE KEY UPDATE identifier_label='Domain Name', supports_quantity=0, supports_amc=0;

INSERT INTO renewal_service_master (name, category_id, identifier_label, requires_identifier, default_duration_value, default_duration_unit, supports_quantity, supports_provider, supports_amc, supports_support_package, is_active, sort_order, created_at, updated_at) 
SELECT 'Server Renewal', id, 'Domain Name', 1, 12, 'months', 0, 1, 0, 0, 1, 2, NOW(), NOW() FROM renewal_service_category WHERE code = 'SERVER'
ON DUPLICATE KEY UPDATE identifier_label='Domain Name', supports_quantity=0, supports_amc=0;

INSERT INTO renewal_service_master (name, category_id, identifier_label, requires_identifier, default_duration_value, default_duration_unit, supports_quantity, supports_provider, supports_amc, supports_support_package, is_active, sort_order, created_at, updated_at) 
SELECT 'G Suite Email Server Renewal', id, 'Domain Name', 1, 12, 'months', 1, 1, 0, 0, 1, 3, NOW(), NOW() FROM renewal_service_category WHERE code = 'EMAIL'
ON DUPLICATE KEY UPDATE identifier_label='Domain Name', supports_quantity=1, supports_amc=0;

INSERT INTO renewal_service_master (name, category_id, identifier_label, requires_identifier, default_duration_value, default_duration_unit, supports_quantity, supports_provider, supports_amc, supports_support_package, is_active, sort_order, created_at, updated_at) 
SELECT 'Office 365 Email Server Renewal', id, 'Domain Name', 1, 12, 'months', 1, 1, 0, 0, 1, 4, NOW(), NOW() FROM renewal_service_category WHERE code = 'EMAIL'
ON DUPLICATE KEY UPDATE identifier_label='Domain Name', supports_quantity=1, supports_amc=0;

INSERT INTO renewal_service_master (name, category_id, identifier_label, requires_identifier, default_duration_value, default_duration_unit, supports_quantity, supports_provider, supports_amc, supports_support_package, is_active, sort_order, created_at, updated_at) 
SELECT 'SSL Renewal', id, 'Domain Name', 1, 12, 'months', 1, 1, 0, 0, 1, 5, NOW(), NOW() FROM renewal_service_category WHERE code = 'SSL'
ON DUPLICATE KEY UPDATE identifier_label='Domain Name', supports_quantity=1, supports_amc=0;

INSERT INTO renewal_service_master (name, category_id, identifier_label, requires_identifier, default_duration_value, default_duration_unit, supports_quantity, supports_provider, supports_amc, supports_support_package, is_active, sort_order, created_at, updated_at) 
SELECT 'CMS Website AMC Renewal', id, 'Website URL', 1, 12, 'months', 0, 1, 1, 0, 1, 6, NOW(), NOW() FROM renewal_service_category WHERE code = 'AMC'
ON DUPLICATE KEY UPDATE identifier_label='Website URL', supports_quantity=0, supports_amc=1;

INSERT INTO renewal_service_master (name, category_id, identifier_label, requires_identifier, default_duration_value, default_duration_unit, supports_quantity, supports_provider, supports_amc, supports_support_package, is_active, sort_order, created_at, updated_at) 
SELECT 'Website Optimization and Security Services', id, 'Website URL', 1, 12, 'months', 0, 1, 0, 1, 1, 7, NOW(), NOW() FROM renewal_service_category WHERE code = 'SUPPORT'
ON DUPLICATE KEY UPDATE identifier_label='Website URL', supports_quantity=0, supports_amc=0;

-- ─────────────────────────────────────────────
-- 5. SEED SERVER PLANS
-- ─────────────────────────────────────────────

INSERT INTO renewal_service_plan_master (name, category_code, is_active, created_at) VALUES
('Budget Starter Server', 'SERVER', 1, NOW()),
('Basic Server', 'SERVER', 1, NOW()),
('Basic Managed Wordpress Server', 'SERVER', 1, NOW()),
('Value Starter Server', 'SERVER', 1, NOW()),
('Value Special Server', 'SERVER', 1, NOW()),
('Business Server', 'SERVER', 1, NOW()),
('Cloud Startup Server', 'SERVER', 1, NOW()),
('Corporate Server', 'SERVER', 1, NOW()),
('Dedicated Server', 'SERVER', 1, NOW()),
('VPS Server', 'SERVER', 1, NOW()),
('VPS Windows Server', 'SERVER', 1, NOW()),
('Economy Server', 'SERVER', 1, NOW())
ON DUPLICATE KEY UPDATE is_active = 1;

-- ─────────────────────────────────────────────
-- 6. SEED PROVIDERS & SUB-ITEMS
-- ─────────────────────────────────────────────

INSERT INTO renewal_provider (name, category_code, is_active, created_at, updated_at) VALUES
('Shiviom', 'EMAIL', 1, NOW(), NOW()),
('Lease Packet', 'EMAIL', 1, NOW(), NOW()),
('Zoho', 'EMAIL', 1, NOW(), NOW()),
('Godaddy', 'DOMAIN', 1, NOW(), NOW()),
('Only Domains', 'DOMAIN', 1, NOW(), NOW()),
('Network Solutions', 'DOMAIN', 1, NOW(), NOW()),
('Domgys', 'DOMAIN', 1, NOW(), NOW()),
('Google', 'DOMAIN', 1, NOW(), NOW()),
('Bigrock', 'DOMAIN', 1, NOW(), NOW()),
('Pair Domains', 'DOMAIN', 1, NOW(), NOW()),
('Pair', 'SERVER', 1, NOW(), NOW()),
('Hostinger', 'SERVER', 1, NOW(), NOW()),
('Verio', 'SERVER', 1, NOW(), NOW()),
('Godaddy (Server)', 'SERVER', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE category_code = VALUES(category_code), is_active = 1, updated_at = NOW();

INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'G Suite', 'EMAIL_SERVICE', 1, NOW() FROM renewal_provider WHERE name = 'Shiviom';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Office 365', 'EMAIL_SERVICE', 1, NOW() FROM renewal_provider WHERE name = 'Shiviom';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'G Suite', 'EMAIL_SERVICE', 1, NOW() FROM renewal_provider WHERE name = 'Lease Packet';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Office 365', 'EMAIL_SERVICE', 1, NOW() FROM renewal_provider WHERE name = 'Lease Packet';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Zoho', 'EMAIL_SERVICE', 1, NOW() FROM renewal_provider WHERE name = 'Zoho';

INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Angjandom9', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'duinkop', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'AndDomTrf9', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'it@lgbforge.com', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'chakradivers', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'skyfast', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'kalpakachemicals', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'cumar9', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'AngDom11', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'AngDom12', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy';

INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Angler', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Only Domains';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'lmwsclcn', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Network Solutions';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'ANGLERITECH', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Network Solutions';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'domain@angleritech.com', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Domgys';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'anglerdomain@gmail.com', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Google';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'domain@angleritech.com', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Bigrock';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'accounts@angleritech.com', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Bigrock';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'aet_ashwin@yahoo.com', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Bigrock';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'cumar9', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Pair Domains';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'jantang9', 'DOMAIN_USER', 1, NOW() FROM renewal_provider WHERE name = 'Pair Domains';

INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Angler02', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Angler99', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Anglerdr', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'rasivqs3', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'ANGVPS11', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'ANGVPS12', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'ANGVPS13', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'ANGVPS14', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'ANGVPS15', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Pravang', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Injectoplast', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Revathi', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'djmpc2', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'turbods1', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'angdedvmand97', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'angwpp1', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'vktpr9', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Pair';

INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Single Web Hosting', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Hostinger';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Business Web Hosting', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Hostinger';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Cloud Startup', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Hostinger';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'KVM 1', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Hostinger';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'KVM 2', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Hostinger';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'KVM 4', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Hostinger';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'KVM 8', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Hostinger';

INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Verio', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Verio';

INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Ultimate Managed Wordpress', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy (Server)';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Basic Managed Wordpress', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy (Server)';
INSERT IGNORE INTO renewal_provider_sub_item (provider_id, name, type, is_active, created_at) SELECT id, 'Web Hosting Deluxe', 'SERVER', 1, NOW() FROM renewal_provider WHERE name = 'Godaddy (Server)';

-- ─────────────────────────────────────────────
-- 7. SEED RENEWAL EMAIL TEMPLATES
-- ─────────────────────────────────────────────

INSERT INTO renewal_notification_template (name, category_code, channel, subject, body_html, is_active, created_at, updated_at) VALUES
('Trinetra Renewal Reminder - FMS License', 'SUPPORT', 'EMAIL', 'Renewal Reminder: Your FMS Software License is about to expire', '<div style="max-width:750px;margin:0 auto;font-family:Arial;border:1px solid #ccc;padding:15px;background:#fff;"><table width="100%"><tr><td><img src="{{logo_url}}" style="max-height:45px;display:block;" onError="this.style.display=\'none\'"/><div style="font-weight:bold;font-size:18px;color:#002060;">trinetra</div><div style="font-size:10px;color:#555;">Fleet Management, Mobility & IoT Solutions</div></td><td align="right" style="font-size:12px;color:#002060;"><a href="mailto:renewals@trinetrawireless.com">renewals@trinetrawireless.com</a><br/><strong>+91-422-2321307</strong></td></tr></table><div style="background:#0f2942;color:#fff;padding:12px;"><h2 style="margin:0;font-size:18px;">Renewal Reminder</h2><h3 style="margin:4px 0 0 0;font-size:16px;">Your FMS Software License is about to expire.</h3></div><p>Dear Mr. <strong>{{contact_person}}</strong>,</p><p><strong>M/s. {{company_name}}</strong></p><p>FMS software license details are listed below and the due for renewal within next <strong>{{days_left}} Days</strong>.</p><table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:11px;text-align:center;"><tr bgcolor="#f2f2f2"><th>Service</th><th>Device Id</th><th>No. of Device</th><th>Unit Cost (Rs.)</th><th>Subtotal (Rs.)</th><th>GST @18%</th><th>Total (Rs.)</th><th>Expiry Date</th><th>Term</th><th>Days To Expiry</th></tr><tr><td align="left">{{service_name}}</td><td>{{device_id}}</td><td>{{quantity}}</td><td>{{unit_cost}}</td><td>{{subtotal}}</td><td>{{gst}}</td><td>{{total}}</td><td style="color:red;font-weight:bold;">{{expiry_date}}</td><td>Yearly</td><td style="color:red;font-weight:bold;">{{days_left}} Day(s)</td></tr></table><p>Please find the attached Order Form for Trinetra FMS Software License Renewal and kindly request you to send the order form duly signed along with the payment</p><p><strong>Bank details for online payment transfer:</strong></p><table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-size:11px;"><tr bgcolor="#d9d9d9"><th colspan="2">TRINETRA BANK DETAILS</th></tr><tr><td width="30%">Company Name</td><td>TRINETRA Wireless Pvt Ltd</td></tr><tr><td>Name of Bank</td><td>State Bank of India</td></tr><tr><td>Bank Branch Name</td><td>Red Fields Branch</td></tr><tr><td>Branch Address</td><td>1114C, Trichy Road, Coimbatore - 641 045. India.</td></tr><tr><td>IFSC CODE</td><td>SBIN0006577</td></tr><tr><td>Account Number</td><td>30995705595</td></tr></table><p><strong>Offline payment:</strong> You can make the payment via Cheque or Demand draft in the name of TRINETRA Wireless Pvt Ltd. Kindly do the needful.</p><p><strong>What if I don\'t renew the services?</strong><br/>1 Your Trinetra FMS account will be deactivated automatically and you may not be able to view the application.<br/>2 If the software license has not been renewed before the due date, your license will be deactivated and for reactivation additional charges has to be paid.</p></div>', 1, NOW(), NOW()),

('Trinetra Renewal Deactivation Notice', 'SUPPORT', 'EMAIL', 'Deactivation Notice: Your services are about to deactivate..', '<div style="max-width:750px;margin:0 auto;font-family:Arial;border:1px solid #ccc;padding:15px;background:#fff;"><table width="100%"><tr><td><img src="{{logo_url}}" style="max-height:45px;display:block;" onError="this.style.display=\'none\'"/><div style="font-weight:bold;font-size:18px;color:#002060;">trinetra</div><div style="font-size:10px;color:#555;">Fleet Management, Mobility & IoT Solutions</div></td><td align="right" style="font-size:12px;color:#002060;"><a href="mailto:renewals@trinetrawireless.com">renewals@trinetrawireless.com</a><br/><strong>+91-422-2321307</strong></td></tr></table><div style="background:#0f2942;color:#fff;padding:12px;"><h2 style="margin:0;font-size:18px;">Deactivation Notice</h2><h3 style="margin:4px 0 0 0;font-size:16px;">Your services are about to deactivate..</h3></div><p>Dear Mr. <strong>{{contact_person}}</strong>,</p><p>The services listed below will be deactivated soon. Kindly renew them to avoid deactivation</p><table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:11px;text-align:center;"><tr bgcolor="#f2f2f2"><th>Service</th><th>Device Id</th><th>No. of Device</th><th>Unit Cost (Rs.)</th><th>Subtotal (Rs.)</th><th>GST @18%</th><th>Total (Rs.)</th><th>Expiry Date</th><th>Term</th><th>Days To Expiry</th></tr><tr><td align="left">{{service_name}}</td><td>{{device_id}}</td><td>{{quantity}}</td><td>{{unit_cost}}</td><td>{{subtotal}}</td><td>{{gst}}</td><td>{{total}}</td><td style="color:red;font-weight:bold;">{{expiry_date}}</td><td>Yearly</td><td style="color:red;font-weight:bold;">{{days_left}} Day(s)</td></tr></table><p><strong>Bank details for online payment transfer:</strong></p><table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-size:11px;"><tr bgcolor="#d9d9d9"><th colspan="2">TRINETRA BANK DETAILS</th></tr><tr><td width="30%">Company Name</td><td>TRINETRA Wireless Pvt Ltd</td></tr><tr><td>Name of Bank</td><td>State Bank of India</td></tr><tr><td>Bank Branch Name</td><td>Red Fields Branch</td></tr><tr><td>Branch Address</td><td>1114C, Trichy Road, Coimbatore - 641 045. India.</td></tr><tr><td>IFSC CODE</td><td>SBIN0006577</td></tr><tr><td>Account Number</td><td>30995705595</td></tr></table><p><strong>Offline payment:</strong> You can make the payment via Cheque or Demand draft in the name of TRINETRA Wireless Pvt Ltd. Kindly do the needful.</p><p><strong>What if I don\'t renew the services?</strong><br/>1 Your Trinetra account will be deactivated automatically and you may not be able to view the application.<br/>2 If the software license has not been renewed before the due date, your license will be deactivated and for reactivation additional charges has to be paid.</p></div>', 1, NOW(), NOW()),

('Trinetra Renewal Suspension Notice', 'SUPPORT', 'EMAIL', 'URGENT: Suspension Notice — Your Trinetra GPS software license has been suspended', '<div style="max-width:750px;margin:0 auto;font-family:Arial;border:1px solid #ccc;padding:15px;background:#fff;"><table width="100%"><tr><td><img src="{{logo_url}}" style="max-height:45px;display:block;" onError="this.style.display=\'none\'"/><div style="font-weight:bold;font-size:18px;color:#002060;">trinetra</div><div style="font-size:10px;color:#555;">Fleet Management, Mobility & IoT Solutions</div></td><td align="right" style="font-size:12px;color:#002060;"><a href="mailto:renewals@trinetrawireless.com">renewals@trinetrawireless.com</a><br/><strong>+91-422-2321307</strong></td></tr></table><div style="background:#0f2942;color:#fff;padding:12px;"><h2 style="margin:0;font-size:18px;">Suspension Notice</h2><h3 style="margin:4px 0 0 0;font-size:15px;">Your Trinetra GPS vehicle tracking software license has been suspended.</h3></div><p>Dear Mr. <strong>{{contact_person}}</strong>,</p><p>This is to inform you that your service has now been suspended.</p><p>The details of the suspended service are as given below:</p><div style="margin:15px 0;font-size:12px;line-height:1.6;"><strong>Product/Service :</strong> {{service_name}}<br/><strong>Due Date :</strong> {{expiry_date}}<br/><strong>Suspension Reason :</strong> Due to Non Payment</div><p><strong>How do I reactivate my service?</strong><br/>In order to get this service reactivated, kindly drop a mail to <a href="mailto:renewals@trinetrawireless.com">renewals@trinetrawireless.com</a> as soon as possible and confirm payment expected date for renewal.</p><p style="color:#b91c1c;"><strong>IMPORTANT :</strong> Please note that in case your services are not reactivated, then we will have to remove your data from our system and we will not be responsible for any data loss thereafter.</p><table width="100%" style="margin-top:20px;"><tr><td width="48%" style="border:1px solid #333;padding:10px;text-align:center;font-weight:bold;">Call: 91-0422-2321307</td><td width="4%"></td><td width="48%" style="border:1px solid #333;padding:10px;text-align:center;font-weight:bold;">e-mail: renewals@trinetrawireless.com</td></tr></table></div>', 1, NOW(), NOW()),

('Trinetra Renewal Reminder - iWay License', 'SUPPORT', 'EMAIL', 'Renewal Reminder: Your Trinetra iWay services are about to expire', '<div style="max-width:750px;margin:0 auto;font-family:Arial;border:1px solid #ccc;padding:15px;background:#fff;"><table width="100%"><tr><td><img src="{{logo_url}}" style="max-height:45px;display:block;" onError="this.style.display=\'none\'"/><div style="font-weight:bold;font-size:18px;color:#002060;">trinetra</div><div style="font-size:10px;color:#555;">Fleet Management, Mobility & IoT Solutions</div></td><td align="right" style="font-size:12px;color:#002060;"><a href="mailto:renewals@trinetrawireless.com">renewals@trinetrawireless.com</a><br/><strong>+91-422-2321307</strong></td></tr></table><div style="background:#0f2942;color:#fff;padding:12px;"><h2 style="margin:0;font-size:18px;">Renewal Reminder</h2><h3 style="margin:4px 0 0 0;font-size:16px;">Your services are about to expire.</h3></div><p>Dear Mr. <strong>{{contact_person}}</strong>,</p><p>The services listed below are due for renewal within next <strong>45 Days</strong>.</p><table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:11px;text-align:center;"><tr bgcolor="#f2f2f2"><th>Service</th><th>Device Id</th><th>No. of Device</th><th>Unit Cost (Rs.)</th><th>Subtotal (Rs.)</th><th>GST @18%</th><th>Total (Rs.)</th><th>Expiry Date</th><th>Term</th><th>Days To Expiry</th></tr><tr><td align="left">Trinetra iWay Software License Usage Charges for Vehicle Tracking Device</td><td>{{device_id}}</td><td>{{quantity}}</td><td>{{unit_cost}}</td><td>{{subtotal}}</td><td>{{gst}}</td><td>{{total}}</td><td style="color:red;font-weight:bold;">{{expiry_date}}</td><td>Yearly</td><td style="color:red;font-weight:bold;">{{days_left}} Day(s)</td></tr></table><p>Please find the attached Order Form for Trinetra iWay Software License Renewal and kindly request you to send the order form duly signed along with the payment</p><p><strong>Bank details for online payment transfer:</strong></p><table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-size:11px;"><tr bgcolor="#d9d9d9"><th colspan="2">TRINETRA BANK DETAILS</th></tr><tr><td width="30%">Company Name</td><td>TRINETRA Wireless Pvt Ltd</td></tr><tr><td>Name of Bank</td><td>State Bank of India</td></tr><tr><td>Bank Branch Name</td><td>Red Fields Branch</td></tr><tr><td>Branch Address</td><td>1114C, Trichy Road, Coimbatore - 641 045. India.</td></tr><tr><td>IFSC CODE</td><td>SBIN0006577</td></tr><tr><td>Account Number</td><td>30995705595</td></tr></table><p><strong>Offline payment:</strong> You can make the payment via Cheque or Demand draft in the name of TRINETRA Wireless Pvt Ltd</p><p><strong>Kindly do the needful.</strong></p><p><strong>What if I don\'t renew the services?</strong><br/>1 Your Trinetra iWay account will be deactivated automatically and you may not be able to view the application.<br/>2 If the software license has not been renewed before the due date, your license will be deactivated and for reactivation additional charges has to be paid.</p></div>', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  subject = VALUES(subject),
  body_html = VALUES(body_html),
  is_active = 1,
  updated_at = NOW();

SET FOREIGN_KEY_CHECKS = 1;

-- Completed Master Migration & Schema Initialization for ANGLER & Trinetra CRM

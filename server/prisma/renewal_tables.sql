-- renewal_tables.sql
-- All table names and column names are lowercase_snake_case
-- Compatible with MariaDB (no JSON type used - uses LONGTEXT instead)
-- Run: mysql -u root kannan_angler_crm < renewal_tables.sql

SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────
-- 1. renewal_service_category
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

-- ─────────────────────────────────────────────
-- 2. renewal_notification_template  (needed before reminder_policy)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `renewal_notification_template` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191) NOT NULL,
  `category_code` VARCHAR(20)  NULL,
  `channel`       VARCHAR(20)  NOT NULL,
  `subject`       VARCHAR(500) NULL,
  `body_html`     LONGTEXT     NOT NULL,
  `body_text`     LONGTEXT     NULL,
  `variables`     LONGTEXT     NULL,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 3. renewal_reminder_policy
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_reminder_policy_company_id_idx` (`company_id`),
  KEY `renewal_reminder_policy_service_category_id_idx` (`service_category_id`),
  KEY `renewal_reminder_policy_service_master_id_idx` (`service_master_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 4. renewal_service_master
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_service_master_category_id_idx` (`category_id`),
  KEY `renewal_service_master_default_reminder_policy_id_idx` (`default_reminder_policy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 5. renewal_reminder_step
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `renewal_reminder_step_policy_id_step_number_key` (`policy_id`, `step_number`),
  KEY `renewal_reminder_step_template_id_idx` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 6. renewal_provider
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `renewal_provider` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(191) NOT NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `renewal_provider_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 7. renewal_contact
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_contact_client_company_id_idx` (`client_company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 8. renewal_account
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_account_client_company_id_idx` (`client_company_id`),
  KEY `renewal_account_account_manager_id_idx` (`account_manager_id`),
  KEY `renewal_account_status_idx` (`status`),
  KEY `renewal_account_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 9. renewal_account_contact  (junction)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `renewal_account_contact` (
  `id`                 INT NOT NULL AUTO_INCREMENT,
  `renewal_account_id` INT NOT NULL,
  `contact_id`         INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `renewal_account_contact_account_contact_key` (`renewal_account_id`, `contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 10. renewal_service_instance
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_service_instance_renewal_account_id_idx` (`renewal_account_id`),
  KEY `renewal_service_instance_expiry_date_idx` (`expiry_date`),
  KEY `renewal_service_instance_status_idx` (`status`),
  KEY `renewal_service_instance_assigned_user_id_idx` (`assigned_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 11. renewal_cycle
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_cycle_service_instance_id_status_idx` (`service_instance_id`, `status`),
  KEY `renewal_cycle_expiry_date_idx` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 12. renewal_reminder
-- ─────────────────────────────────────────────
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
  `completed_at`          DATETIME(3)  NULL,
  `completed_by_id`       INT          NULL,
  `skipped_at`            DATETIME(3)  NULL,
  `skip_reason`           VARCHAR(500) NULL,
  `policy_version`        INT          NULL,
  `is_mandatory`          TINYINT(1)   NOT NULL DEFAULT 0,
  `escalation_after_days` INT          NULL,
  `escalate_to_id`        INT          NULL,
  `escalated`             TINYINT(1)   NOT NULL DEFAULT 0,
  `escalated_at`          DATETIME(3)  NULL,
  `created_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `renewal_reminder_due_date_status_idx` (`due_date`, `status`),
  KEY `renewal_reminder_assigned_user_id_status_idx` (`assigned_user_id`, `status`),
  KEY `renewal_reminder_cycle_id_idx` (`cycle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 13. renewal_followup_log
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_followup_log_service_instance_id_idx` (`service_instance_id`),
  KEY `renewal_followup_log_logged_at_idx` (`logged_at`),
  KEY `renewal_followup_log_reminder_id_idx` (`reminder_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 14. renewal_payment
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_payment_cycle_id_idx` (`cycle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 15. renewal_document
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `renewal_document` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `renewal_account_id` INT          NOT NULL,
  `document_type`      VARCHAR(50)  NULL,
  `name`               VARCHAR(300) NULL,
  `url`                VARCHAR(500) NOT NULL,
  `uploaded_by_id`     INT          NULL,
  `uploaded_at`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `renewal_document_renewal_account_id_idx` (`renewal_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 16. application_notification
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `application_notification_user_id_is_read_idx` (`user_id`, `is_read`),
  KEY `application_notification_user_id_created_at_idx` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 17. notification_outbox
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notification_outbox` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `channel`       VARCHAR(20)  NOT NULL,
  `recipient`     VARCHAR(300) NOT NULL,
  `template_id`   INT          NULL,
  `subject`       VARCHAR(500) NULL,
  `rendered_body` LONGTEXT     NOT NULL,
  `status`        VARCHAR(20)  NOT NULL DEFAULT 'QUEUED',
  `attempt_count` INT          NOT NULL DEFAULT 0,
  `next_retry_at` DATETIME(3)  NULL,
  `sent_at`       DATETIME(3)  NULL,
  `provider_ref`  VARCHAR(200) NULL,
  `error_message` LONGTEXT     NULL,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notification_outbox_status_next_retry_at_idx` (`status`, `next_retry_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 18. renewal_audit_log
-- ─────────────────────────────────────────────
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
  PRIMARY KEY (`id`),
  KEY `renewal_audit_log_renewal_account_id_performed_at_idx` (`renewal_account_id`, `performed_at`),
  KEY `renewal_audit_log_entity_type_entity_id_idx` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- FOREIGN KEYS
-- ─────────────────────────────────────────────
ALTER TABLE `renewal_service_master`
  ADD CONSTRAINT `fk_rsm_category` FOREIGN KEY (`category_id`) REFERENCES `renewal_service_category` (`id`),
  ADD CONSTRAINT `fk_rsm_policy` FOREIGN KEY (`default_reminder_policy_id`) REFERENCES `renewal_reminder_policy` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_reminder_policy`
  ADD CONSTRAINT `fk_rrp_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rrp_category` FOREIGN KEY (`service_category_id`) REFERENCES `renewal_service_category` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rrp_service` FOREIGN KEY (`service_master_id`) REFERENCES `renewal_service_master` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_reminder_step`
  ADD CONSTRAINT `fk_rrs_policy` FOREIGN KEY (`policy_id`) REFERENCES `renewal_reminder_policy` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rrs_template` FOREIGN KEY (`template_id`) REFERENCES `renewal_notification_template` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_contact`
  ADD CONSTRAINT `fk_rc_client_company` FOREIGN KEY (`client_company_id`) REFERENCES `client_company` (`id`);

ALTER TABLE `renewal_account`
  ADD CONSTRAINT `fk_ra_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ra_client_company` FOREIGN KEY (`client_company_id`) REFERENCES `client_company` (`id`),
  ADD CONSTRAINT `fk_ra_account_manager` FOREIGN KEY (`account_manager_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ra_renewal_executive` FOREIGN KEY (`renewal_executive_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ra_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`);

ALTER TABLE `renewal_account_contact`
  ADD CONSTRAINT `fk_rac_account` FOREIGN KEY (`renewal_account_id`) REFERENCES `renewal_account` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rac_contact` FOREIGN KEY (`contact_id`) REFERENCES `renewal_contact` (`id`);

ALTER TABLE `renewal_service_instance`
  ADD CONSTRAINT `fk_rsi_account` FOREIGN KEY (`renewal_account_id`) REFERENCES `renewal_account` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rsi_service_master` FOREIGN KEY (`service_master_id`) REFERENCES `renewal_service_master` (`id`),
  ADD CONSTRAINT `fk_rsi_provider` FOREIGN KEY (`provider_id`) REFERENCES `renewal_provider` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rsi_assigned_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rsi_contact` FOREIGN KEY (`customer_contact_id`) REFERENCES `renewal_contact` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rsi_policy` FOREIGN KEY (`reminder_policy_id`) REFERENCES `renewal_reminder_policy` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_cycle`
  ADD CONSTRAINT `fk_rc_service_instance` FOREIGN KEY (`service_instance_id`) REFERENCES `renewal_service_instance` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rc_renewed_by` FOREIGN KEY (`renewed_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_reminder`
  ADD CONSTRAINT `fk_rr_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `renewal_cycle` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rr_assigned_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rr_completed_by` FOREIGN KEY (`completed_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rr_template` FOREIGN KEY (`template_id`) REFERENCES `renewal_notification_template` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_followup_log`
  ADD CONSTRAINT `fk_rfl_service_instance` FOREIGN KEY (`service_instance_id`) REFERENCES `renewal_service_instance` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfl_reminder` FOREIGN KEY (`reminder_id`) REFERENCES `renewal_reminder` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rfl_logged_by` FOREIGN KEY (`logged_by_id`) REFERENCES `user` (`id`);

ALTER TABLE `renewal_payment`
  ADD CONSTRAINT `fk_rp_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `renewal_cycle` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rp_collected_by` FOREIGN KEY (`collected_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_document`
  ADD CONSTRAINT `fk_rd_account` FOREIGN KEY (`renewal_account_id`) REFERENCES `renewal_account` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rd_uploaded_by` FOREIGN KEY (`uploaded_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;

ALTER TABLE `application_notification`
  ADD CONSTRAINT `fk_an_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_an_reminder` FOREIGN KEY (`reminder_id`) REFERENCES `renewal_reminder` (`id`) ON DELETE SET NULL;

ALTER TABLE `renewal_audit_log`
  ADD CONSTRAINT `fk_ral_account` FOREIGN KEY (`renewal_account_id`) REFERENCES `renewal_account` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ral_performed_by` FOREIGN KEY (`performed_by_id`) REFERENCES `user` (`id`);

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'All renewal tables created successfully.' AS result;

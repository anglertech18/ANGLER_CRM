-- ============================================================
-- ANGLER CRM — Dynamic Service Mapping & Alert Engine
-- Migration: 20260717_dynamic_service_mapping_alert_engine.sql
-- Phase 2 of Renewals Module — Purely Additive
-- ============================================================

-- 1. Versioned default pricing per service master
CREATE TABLE IF NOT EXISTS renewal_service_price (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  service_master_id INT NOT NULL,
  base_price        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  billing_unit      VARCHAR(20) NOT NULL DEFAULT 'year',
  currency          VARCHAR(5) NOT NULL DEFAULT 'INR',
  effective_from    DATE NOT NULL,
  effective_to      DATE NULL,
  is_current        TINYINT(1) NOT NULL DEFAULT 1,
  notes             TEXT NULL,
  created_by_id     INT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rsp_service (service_master_id),
  INDEX idx_rsp_current (service_master_id, is_current),
  CONSTRAINT fk_rsp_service FOREIGN KEY (service_master_id)
    REFERENCES renewal_service_master(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Per-customer price override with effective dates
CREATE TABLE IF NOT EXISTS renewal_customer_price (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  client_company_id INT NOT NULL,
  service_master_id INT NOT NULL,
  override_price    DECIMAL(12,2) NOT NULL,
  billing_unit      VARCHAR(20) NOT NULL DEFAULT 'year',
  currency          VARCHAR(5) NOT NULL DEFAULT 'INR',
  effective_from    DATE NOT NULL,
  effective_to      DATE NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  notes             TEXT NULL,
  approved_by_id    INT NULL,
  created_by_id     INT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rcp_client_service (client_company_id, service_master_id, is_active),
  INDEX idx_rcp_effective (effective_from, effective_to),
  CONSTRAINT fk_rcp_client FOREIGN KEY (client_company_id)
    REFERENCES client_companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_rcp_service FOREIGN KEY (service_master_id)
    REFERENCES renewal_service_master(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Per-mapping custom alert timeline steps
CREATE TABLE IF NOT EXISTS renewal_instance_alert_step (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  service_instance_id  INT NOT NULL,
  step_number          INT NOT NULL DEFAULT 1,
  days_before          INT NOT NULL,
  channel              VARCHAR(30) NOT NULL,
  email_template_id    INT NULL,
  is_active            TINYINT(1) NOT NULL DEFAULT 1,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rias_instance_step (service_instance_id, step_number),
  INDEX idx_rias_instance (service_instance_id),
  CONSTRAINT fk_rias_instance FOREIGN KEY (service_instance_id)
    REFERENCES renewal_service_instance(id) ON DELETE CASCADE,
  CONSTRAINT fk_rias_template FOREIGN KEY (email_template_id)
    REFERENCES renewal_notification_template(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Brand profile for email templates
CREATE TABLE IF NOT EXISTS renewal_brand_profile (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  company_id      INT NULL,
  profile_name    VARCHAR(200) NOT NULL DEFAULT 'Default',
  logo_url        VARCHAR(500) NULL,
  alt_logo_url    VARCHAR(500) NULL,
  primary_color   VARCHAR(7) NULL DEFAULT '#074388',
  secondary_color VARCHAR(7) NULL DEFAULT '#0ea5e9',
  sender_name     VARCHAR(200) NULL DEFAULT 'Angler iTech Solutions',
  sender_email    VARCHAR(300) NULL,
  email_footer    LONGTEXT NULL,
  is_default      TINYINT(1) NOT NULL DEFAULT 0,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rbp_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Extend renewal_notification_template for visual builder
ALTER TABLE renewal_notification_template
  ADD COLUMN IF NOT EXISTS editor_json     LONGTEXT NULL AFTER variables,
  ADD COLUMN IF NOT EXISTS compiled_html   LONGTEXT NULL AFTER editor_json,
  ADD COLUMN IF NOT EXISTS brand_profile_id INT NULL AFTER compiled_html;

ALTER TABLE renewal_notification_template
  ADD INDEX IF NOT EXISTS idx_rnt_brand (brand_profile_id);

-- 6. Extend notification_outbox for approval queue + recipient display
ALTER TABLE notification_outbox
  ADD COLUMN IF NOT EXISTS recipient_name     VARCHAR(200) NULL AFTER recipient,
  ADD COLUMN IF NOT EXISTS requires_approval  TINYINT(1) NOT NULL DEFAULT 0 AFTER rendered_body,
  ADD COLUMN IF NOT EXISTS approved_by_id     INT NULL AFTER requires_approval,
  ADD COLUMN IF NOT EXISTS approved_at        DATETIME NULL AFTER approved_by_id,
  ADD COLUMN IF NOT EXISTS mapping_context    LONGTEXT NULL AFTER approved_at;

ALTER TABLE notification_outbox
  ADD INDEX IF NOT EXISTS idx_no_approval (requires_approval, status);

-- 7. Seed default brand profile
INSERT IGNORE INTO renewal_brand_profile (profile_name, primary_color, secondary_color, sender_name, is_default, is_active)
VALUES ('Angler Default', '#074388', '#0ea5e9', 'Angler iTech Solutions', 1, 1);

-- Migration: Add WhatsApp Web Sessions Table & Outbox Session Mapping
-- Date: 2026-07-30
-- Description: Supports dynamic WhatsApp Web (QR-Link) session management for Angler & future brands.

CREATE TABLE IF NOT EXISTS `whatsapp_web_session` (
  `id` INT NOT NULL AUTO_INCREMENT,
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
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `whatsapp_web_session_brand_key_unique` (`brand_key`),
  INDEX `idx_whatsapp_session_company` (`company_id`),
  INDEX `idx_whatsapp_session_status` (`status`),
  CONSTRAINT `fk_whatsapp_session_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add session_phone to notification_outbox if not present
ALTER TABLE `notification_outbox` ADD COLUMN `session_phone` VARCHAR(30) NULL AFTER `attachment_path`;

-- ============================================================
-- ANGLER CRM — SMTP Configuration Store
-- Migration: 20260717_smtp_config.sql
-- Phase 3 of Renewals Module — Email Dispatch Config
-- ============================================================

CREATE TABLE IF NOT EXISTS smtp_config (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  host          VARCHAR(200) NOT NULL,
  port          INT NOT NULL DEFAULT 587,
  secure        TINYINT(1) NOT NULL DEFAULT 0,
  username      VARCHAR(300) NOT NULL,
  password_enc  VARCHAR(500) NOT NULL,
  from_email    VARCHAR(300) NOT NULL,
  from_name     VARCHAR(200) NOT NULL DEFAULT 'Angler iTech Solutions',
  reply_to      VARCHAR(300) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  tested_at     DATETIME NULL,
  test_result   VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_smtp_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

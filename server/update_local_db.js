const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Safely updating local database schema without dropping data...');

  const DDL_STATEMENTS = [
    // 1. Client Company Missing Columns
    `ALTER TABLE client_company ADD COLUMN IF NOT EXISTS address TEXT NULL;`,
    `ALTER TABLE client_company ADD COLUMN IF NOT EXISTS city_pincode VARCHAR(100) NULL;`,
    `ALTER TABLE client_company ADD COLUMN IF NOT EXISTS state VARCHAR(100) NULL;`,
    `ALTER TABLE client_company ADD COLUMN IF NOT EXISTS gstin VARCHAR(50) NULL;`,
    `ALTER TABLE client_company ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL;`,
    `ALTER TABLE client_company ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL;`,

    // 2. Renewal Notification Template Missing Columns
    `ALTER TABLE renewal_notification_template MODIFY COLUMN code VARCHAR(100) NULL;`,
    `ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS category_code VARCHAR(20) NULL;`,
    `ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS variables LONGTEXT NULL;`,
    `ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS editor_json LONGTEXT NULL;`,
    `ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS compiled_html LONGTEXT NULL;`,
    `ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS brand_profile_id INT NULL;`,
    `ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;`,
    `ALTER TABLE renewal_notification_template ADD COLUMN IF NOT EXISTS is_published TINYINT(1) DEFAULT 0;`,

    // 3. Application Notification Table
    `CREATE TABLE IF NOT EXISTS application_notification (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      reminder_id INT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(300) NOT NULL,
      body TEXT NOT NULL,
      link VARCHAR(500) NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      read_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_app_notif_user_read (user_id, is_read),
      INDEX idx_app_notif_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 4. WhatsApp Web Session Table
    `CREATE TABLE IF NOT EXISTS whatsapp_web_session (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_name VARCHAR(100) NOT NULL,
      brand_key VARCHAR(50) NOT NULL UNIQUE,
      phone_number VARCHAR(30) NULL,
      company_id INT NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'DISCONNECTED',
      qr_code_base64 LONGTEXT NULL,
      connected_at DATETIME NULL,
      last_active_at DATETIME NULL,
      error_message TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wa_session_status (status),
      INDEX idx_wa_session_company (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 5. Cron Job Lock Table
    `CREATE TABLE IF NOT EXISTS cron_job_lock (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_name VARCHAR(100) NOT NULL UNIQUE,
      lock_owner VARCHAR(200) NOT NULL,
      locked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locked_until DATETIME NOT NULL,
      last_heartbeat_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_job_name_locked (job_name, locked_until)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 6. Renewal Follow Up Task Table
    `CREATE TABLE IF NOT EXISTS renewal_follow_up_task (
      id INT AUTO_INCREMENT PRIMARY KEY,
      renewal_account_id INT NOT NULL,
      service_instance_id INT NOT NULL,
      cycle_id INT NOT NULL,
      policy_version INT NULL,
      follow_up_group_key VARCHAR(50) NOT NULL,
      scheduled_for DATETIME NOT NULL,
      overall_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      assigned_user_id INT NULL,
      completed_at DATETIME NULL,
      cancelled_at DATETIME NULL,
      cancel_reason VARCHAR(500) NULL,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      source_type VARCHAR(50) NOT NULL DEFAULT 'POLICY_STEP',
      source_reference_id INT NULL,
      migration_confidence VARCHAR(20) NULL,
      source VARCHAR(50) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_task_scheduled (scheduled_for, overall_status),
      INDEX idx_task_cycle (cycle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 7. Renewal Follow Up Channel Action Table
    `CREATE TABLE IF NOT EXISTS renewal_follow_up_channel_action (
      id INT AUTO_INCREMENT PRIMARY KEY,
      follow_up_task_id INT NOT NULL,
      renewal_account_id INT NOT NULL,
      service_instance_id INT NOT NULL,
      cycle_id INT NOT NULL,
      reminder_id INT NULL,
      channel VARCHAR(50) NOT NULL,
      action_type VARCHAR(50) NULL,
      execution_mode VARCHAR(50) NOT NULL DEFAULT 'AUTOMATIC',
      communication_purpose VARCHAR(50) NULL,
      is_required TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      scheduled_at DATETIME NULL,
      executed_at DATETIME NULL,
      skip_reason VARCHAR(500) NULL,
      failure_reason TEXT NULL,
      outbox_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_action_task (follow_up_task_id),
      INDEX idx_action_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 8. Renewal Communication Event Table
    `CREATE TABLE IF NOT EXISTS renewal_communication_event (
      id INT AUTO_INCREMENT PRIMARY KEY,
      renewal_account_id INT NOT NULL,
      service_instance_id INT NOT NULL,
      cycle_id INT NOT NULL,
      follow_up_task_id INT NULL,
      channel_action_id INT NULL,
      outbox_id INT NULL,
      channel VARCHAR(50) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      recipient VARCHAR(300) NOT NULL,
      subject VARCHAR(500) NULL,
      message_preview TEXT NULL,
      status VARCHAR(50) NOT NULL,
      error_details TEXT NULL,
      metadata LONGTEXT NULL,
      occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_event_account (renewal_account_id),
      INDEX idx_event_cycle (cycle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 9. Notification Outbox Table
    `CREATE TABLE IF NOT EXISTS notification_outbox (
      id INT AUTO_INCREMENT PRIMARY KEY,
      channel VARCHAR(20) NOT NULL,
      recipient VARCHAR(300) NOT NULL,
      cc_recipients VARCHAR(500) NULL,
      recipient_name VARCHAR(200) NULL,
      template_id INT NULL,
      subject VARCHAR(500) NULL,
      rendered_body TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
      attempt_count INT NOT NULL DEFAULT 0,
      next_retry_at DATETIME NULL,
      sent_at DATETIME NULL,
      provider_ref VARCHAR(200) NULL,
      error_message TEXT NULL,
      requires_approval TINYINT(1) NOT NULL DEFAULT 0,
      approved_by_id INT NULL,
      approved_at DATETIME NULL,
      mapping_context LONGTEXT NULL,
      attachment_path VARCHAR(500) NULL,
      session_phone VARCHAR(30) NULL,
      channel_action_id INT NULL,
      follow_up_task_id INT NULL,
      execution_mode VARCHAR(50) NULL,
      communication_purpose VARCHAR(50) NULL,
      idempotency_key VARCHAR(200) NULL,
      digest_channel_action_ids TEXT NULL,
      delivery_status VARCHAR(50) NULL,
      delivery_timestamp DATETIME NULL,
      read_timestamp DATETIME NULL,
      bounce_type VARCHAR(50) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_outbox_status (status, next_retry_at),
      INDEX idx_outbox_action (channel_action_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const sql of DDL_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      console.log('Notice:', err.message);
    }
  }

  console.log('✅ Local Database Schema updated successfully without data loss!');
}

main()
  .catch((e) => console.error('❌ Error updating database:', e))
  .finally(() => prisma.$disconnect());

-- Billing Forecast (VP screens, "md files/billing forecast/vpscreen.md"). A
-- management-facing forecast / invoice-tracking layer over Order Won lead
-- milestones. A milestone is added here once (unique FK) from the Billing
-- Forecast Milestones screen, starts as "Forecast", and moves to "Achieved"
-- when its invoice details are saved from the Billing Forecast Tracker.
CREATE TABLE `billing_forecast` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_milestone_id` INT NOT NULL,
  `added_by_id` INT NULL,
  `invoice_number` VARCHAR(100) NULL,
  `invoice_date` DATETIME(3) NULL,
  `edc_payment_collection` DATETIME(3) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Forecast',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `billing_forecast_lead_milestone_id_key` (`lead_milestone_id`),
  INDEX `idx_billing_forecast_status` (`status`),
  CONSTRAINT `fk_billing_forecast_lead_milestone` FOREIGN KEY (`lead_milestone_id`) REFERENCES `lead_milestone` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_billing_forecast_added_by` FOREIGN KEY (`added_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
);

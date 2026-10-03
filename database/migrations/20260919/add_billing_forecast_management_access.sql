-- Billing Forecast Privileges: Management Access
-- Adds a dedicated "Management Access" flag + assigned-companies join table for the
-- Billing Forecast module, allowing an admin to grant a user company-scoped access to
-- all BDEs' billing forecast records for selected companies, bypassing the normal
-- reporting hierarchy restriction. Mirrors cashflow_management_access /
-- cashflow_management_company (see 20260717/add_cashflow_management_access.sql).

ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `billing_forecast_management_access` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS `billing_forecast_management_company` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_bfmc_user_company` (`user_id`, `company_id`),
  CONSTRAINT `fk_bfmc_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bfmc_company` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE
);

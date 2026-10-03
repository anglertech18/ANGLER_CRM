-- Cashflow Privileges: Management Access
-- Adds a dedicated "Management Access" flag + assigned-companies join table for the
-- Cashflow Report module, allowing an admin to grant a user company-scoped access to
-- all BDE cashflow records for selected companies, bypassing the normal reporting
-- hierarchy restriction. Independent of the existing `managed_companies` relation
-- (which is used only for Sales Manager invite-company mapping).

ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `cashflow_management_access` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS `cashflow_management_company` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_cashflow_mgmt_user_company` (`user_id`, `company_id`),
  CONSTRAINT `fk_cfmc_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cfmc_company` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE
);

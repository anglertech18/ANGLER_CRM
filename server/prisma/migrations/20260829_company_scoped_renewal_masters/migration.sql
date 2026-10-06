ALTER TABLE `renewal_service_category`
  ADD COLUMN `company_id` INTEGER NULL;

ALTER TABLE `renewal_service_master`
  ADD COLUMN `company_id` INTEGER NULL;

ALTER TABLE `renewal_service_category`
  DROP INDEX `renewal_service_category_name_key`;

ALTER TABLE `renewal_service_category`
  DROP INDEX `renewal_service_category_code_key`;

ALTER TABLE `renewal_service_category`
  ADD INDEX `renewal_service_category_company_id_idx` (`company_id`);

ALTER TABLE `renewal_service_category`
  ADD INDEX `renewal_service_category_company_id_name_idx` (`company_id`, `name`);

ALTER TABLE `renewal_service_category`
  ADD UNIQUE INDEX `renewal_service_category_company_id_code_key` (`company_id`, `code`);

ALTER TABLE `renewal_service_master`
  ADD INDEX `renewal_service_master_company_id_idx` (`company_id`);

ALTER TABLE `renewal_service_master`
  ADD INDEX `renewal_service_master_company_id_name_idx` (`company_id`, `name`);

ALTER TABLE `renewal_service_category`
  ADD CONSTRAINT `renewal_service_category_company_id_fkey`
  FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `renewal_service_master`
  ADD CONSTRAINT `renewal_service_master_company_id_fkey`
  FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

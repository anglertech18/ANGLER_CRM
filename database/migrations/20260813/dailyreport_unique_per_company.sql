-- A BDE's products can map to more than one company (e.g. Aura/Vendora ->
-- Angler, FMS -> Trinetra). The Daily Report cron now generates and sends one
-- report/email per company instead of one per user, so the duplicate-prevention
-- uniqueness must include company_id alongside user_id + report_date.
ALTER TABLE `dailyreport`
  DROP INDEX `uniq_dailyreport_user_date`,
  ADD UNIQUE KEY `uniq_dailyreport_user_date_company` (`user_id`, `report_date`, `company_id`);

-- Additive expansion: preserve order and invoice references per service while
-- retaining the legacy account-level columns for backward compatibility.
ALTER TABLE `renewal_service_instance`
  ADD COLUMN `order_number` VARCHAR(100) NULL,
  ADD COLUMN `order_date` DATETIME(3) NULL,
  ADD COLUMN `po_reference` VARCHAR(200) NULL,
  ADD COLUMN `invoice_number` VARCHAR(100) NULL,
  ADD COLUMN `invoice_date` DATETIME(3) NULL;

CREATE INDEX `renewal_service_instance_order_number_idx`
  ON `renewal_service_instance`(`order_number`);

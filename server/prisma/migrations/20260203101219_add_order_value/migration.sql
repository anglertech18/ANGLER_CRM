-- AlterTable
ALTER TABLE `lead` ADD COLUMN `order_value` DECIMAL(65, 30) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('CEO', 'SalesManager', 'SalesPerson', 'Marketing') NOT NULL DEFAULT 'SalesPerson';

-- AlterTable
ALTER TABLE `lead` ADD COLUMN `service_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

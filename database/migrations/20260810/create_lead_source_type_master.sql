-- Migration: Create Lead Source Type master and map Lead Source to it
-- Date: 2026-08-10
-- Description: Adds a new Lead Source Type master (Direct / Digital / Reference /
--              Exhibition, etc.) and a lead_source_type_id FK column on leadsource
--              so each Lead Source can be mapped to one Lead Source Type.

CREATE TABLE IF NOT EXISTS `leadsourcetype` (
  `id`        INT NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(191) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `leadsourcetype_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `leadsource`
  ADD COLUMN IF NOT EXISTS `lead_source_type_id` INT NULL AFTER `is_active`,
  ADD INDEX IF NOT EXISTS `leadsource_lead_source_type_id_idx` (`lead_source_type_id`);

ALTER TABLE `leadsource`
  ADD CONSTRAINT `fk_leadsource_lead_source_type`
  FOREIGN KEY IF NOT EXISTS (`lead_source_type_id`)
  REFERENCES `leadsourcetype` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

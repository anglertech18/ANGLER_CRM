-- Adds the derived Won/Lost/Open status to each stored Daily Report lead row,
-- so the persisted structured record matches the rendered email HTML.
ALTER TABLE `dailyreportlead`
  ADD COLUMN `status` VARCHAR(20) NULL AFTER `follow_up_notes`;

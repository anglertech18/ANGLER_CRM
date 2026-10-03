-- Add received_amount column to cashflow_milestone
ALTER TABLE `cashflow_milestone`
  ADD COLUMN `received_amount` DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER `amount`;

-- Update status default to match new status values
ALTER TABLE `cashflow_milestone`
  MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'Yet To Start';

-- Set existing rows: if status was 'Received', mark as Completed; otherwise Yet To Start
UPDATE `cashflow_milestone`
  SET status = CASE
    WHEN status = 'Received' THEN 'Completed'
    ELSE 'Yet To Start'
  END;

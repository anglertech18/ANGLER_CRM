-- Rename 'Closed Won' to 'Order Won' in SalesStage table
UPDATE `SalesStage` 
SET `name` = 'Order Won' 
WHERE `name` = 'Closed Won';

-- Adds a Digital Leads Target field to per-user/product targets, alongside the
-- existing Direct Marketing Calls Target (calls_target). Configured in the
-- Target Configuration modal (admin/EditUserPerformanceModal.tsx).
ALTER TABLE `userproducttarget`
  ADD COLUMN `digital_leads_target` INT NULL DEFAULT 0 AFTER `calls_target`;

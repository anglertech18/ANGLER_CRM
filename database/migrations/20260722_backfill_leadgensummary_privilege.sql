-- Lead Gen Summary now has its own privilege module ('LeadGenSummary') instead of
-- inheriting visibility from 'SealDashboard'. Backfill existing users so access is
-- preserved: anyone who currently has a SealDashboard privilege row keeps the same
-- can_view/can_add/can_edit/can_delete flags for LeadGenSummary.

INSERT INTO privilege (user_id, module_name, can_add, can_edit, can_delete, can_view)
SELECT p.user_id, 'LeadGenSummary', p.can_add, p.can_edit, p.can_delete, p.can_view
FROM privilege p
WHERE p.module_name = 'SealDashboard'
ON DUPLICATE KEY UPDATE
    can_add    = VALUES(can_add),
    can_edit   = VALUES(can_edit),
    can_delete = VALUES(can_delete),
    can_view   = VALUES(can_view);

import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import {
  getFollowUpQueue,
  completeFollowUp,
  skipFollowUp,
  rescheduleFollowUp,
  getQueueCounts,
  getFollowUpTaskAudit,
} from '../controllers/renewalFollowUpController';

const router = express.Router();

router.get('/counts', authenticate, checkPrivilege('Renewals', 'can_view'), getQueueCounts);
router.get('/', authenticate, checkPrivilege('Renewals', 'can_view'), getFollowUpQueue);
router.get('/:reminderId/audit', authenticate, checkPrivilege('Renewals', 'can_view'), getFollowUpTaskAudit);
router.post('/:reminderId/complete', authenticate, checkPrivilege('Renewals', 'can_edit'), completeFollowUp);
router.post('/:reminderId/skip', authenticate, checkPrivilege('Renewals', 'can_edit'), skipFollowUp);
router.post('/:reminderId/reschedule', authenticate, checkPrivilege('Renewals', 'can_edit'), rescheduleFollowUp);

export default router;

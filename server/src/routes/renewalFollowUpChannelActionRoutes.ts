import { Router } from 'express';
import {
  getChannelAction,
  getChannelActionsForTask,
  getChannelActionByIdempotency,
  getChannelActionsForReminder,
  getChannelActionsForDigest,
  getPendingActions,
  createAction,
  updateAction,
  startAction,
  completeAction,
  failAction,
  skipAction,
  linkActionToDigest,
  deleteAction,
  previewEmailAction,
  queueEmailAction,
  sendTestEmailAction,
  approveEmailAction,
  previewWhatsAppAction,
  queueWhatsAppAction,
  approveWhatsAppAction,
  completeFromOutbox,
  failFromOutbox,
} from '../controllers/renewalFollowUpChannelActionController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/:id', getChannelAction);
router.get('/task/:followUpTaskId', getChannelActionsForTask);
router.get('/idempotency/:idempotencyKey', getChannelActionByIdempotency);
router.get('/reminder/:reminderId', getChannelActionsForReminder);
router.get('/digest/:digestOutboxId', getChannelActionsForDigest);
router.get('/pending', getPendingActions);
router.get('/:id/preview-email', previewEmailAction);
router.get('/:id/preview-whatsapp', previewWhatsAppAction);

// POST routes
router.post('/', checkPrivilege('Renewals', 'can_edit'), createAction);
router.post('/:id/start', checkPrivilege('Renewals', 'can_edit'), startAction);
router.post('/:id/complete', checkPrivilege('Renewals', 'can_edit'), completeAction);
router.post('/:id/fail', checkPrivilege('Renewals', 'can_edit'), failAction);
router.post('/:id/skip', checkPrivilege('Renewals', 'can_edit'), skipAction);
router.post('/:id/link-digest', checkPrivilege('Renewals', 'can_edit'), linkActionToDigest);
router.post('/:id/queue-email', checkPrivilege('Renewals', 'can_edit'), queueEmailAction);
router.post('/:id/send-test-email', checkPrivilege('Renewals', 'can_edit'), sendTestEmailAction);
router.post('/:id/approve-email', checkPrivilege('Renewals', 'can_edit'), approveEmailAction);
router.post('/:id/queue-whatsapp', checkPrivilege('Renewals', 'can_edit'), queueWhatsAppAction);
router.post('/:id/approve-whatsapp', checkPrivilege('Renewals', 'can_edit'), approveWhatsAppAction);
router.post('/:id/complete-from-outbox', checkPrivilege('Renewals', 'can_edit'), completeFromOutbox);
router.post('/:id/fail-from-outbox', checkPrivilege('Renewals', 'can_edit'), failFromOutbox);

// PUT routes
router.put('/:id', checkPrivilege('Renewals', 'can_edit'), updateAction);

// DELETE routes
router.delete('/:id', checkPrivilege('Renewals', 'can_edit'), deleteAction);

export default router;

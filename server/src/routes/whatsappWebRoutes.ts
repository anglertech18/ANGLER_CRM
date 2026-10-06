import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import {
  getSessions,
  createSession,
  connectSession,
  getSessionQR,
  setDefaultSession,
  disconnectSession,
  testSendMessage,
} from '../controllers/whatsappWebController';

const router = express.Router();

router.get('/sessions', authenticate, checkPrivilege('Renewals', 'can_view'), getSessions);
router.post('/sessions', authenticate, checkPrivilege('Renewals', 'can_edit'), createSession);
router.post('/sessions/:id/connect', authenticate, checkPrivilege('Renewals', 'can_edit'), connectSession);
router.get('/sessions/:id/qr', authenticate, checkPrivilege('Renewals', 'can_view'), getSessionQR);
router.post('/sessions/:id/default', authenticate, checkPrivilege('Renewals', 'can_edit'), setDefaultSession);
router.post('/sessions/:id/disconnect', authenticate, checkPrivilege('Renewals', 'can_edit'), disconnectSession);
router.post('/test-send', authenticate, checkPrivilege('Renewals', 'can_edit'), testSendMessage);

export default router;

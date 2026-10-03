import express from 'express';
import { logCall, getCalls, getKRA } from '../controllers/callController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';

const router = express.Router();

router.post('/', authenticate, checkPrivilege('Calls', 'can_add'), logCall);
router.get('/', authenticate, checkPrivilege('Calls', 'can_view'), getCalls);
router.get('/kra/:userId', authenticate, checkPrivilege('Calls', 'can_view'), getKRA);

export default router;

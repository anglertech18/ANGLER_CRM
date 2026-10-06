import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import { getSmtpConfig, saveSmtpConfig, testSmtpConfig } from '../controllers/smtpConfigController';

const router = Router();
router.use(authenticate);

router.get('/', checkPrivilege('RenewalSettings', 'can_view'), getSmtpConfig);
router.post('/', checkPrivilege('RenewalSettings', 'can_edit'), saveSmtpConfig);
router.post('/test', checkPrivilege('RenewalSettings', 'can_edit'), testSmtpConfig);

export default router;

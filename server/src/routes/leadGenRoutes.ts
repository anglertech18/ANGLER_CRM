import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import * as leadGenController from '../controllers/leadGenController';

const router = Router();

router.get('/',         authenticate, checkPrivilege('LeadGenSummary', 'can_view'), leadGenController.getLeadGenSummary);
router.get('/bdes',     authenticate, checkPrivilege('LeadGenSummary', 'can_view'), leadGenController.getLeadGenBdes);
router.get('/products', authenticate, checkPrivilege('LeadGenSummary', 'can_view'), leadGenController.getLeadGenProducts);

export default router;

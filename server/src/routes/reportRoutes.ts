import express from 'express';
import { getDashboardStats, getMISReports, getLeadCategoryReport } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';

const router = express.Router();

router.get('/dashboard', authenticate, getDashboardStats);
router.get('/mis', authenticate, checkPrivilege('Reports', 'can_view'), getMISReports);
router.get('/leads', authenticate, checkPrivilege('Reports', 'can_view'), getLeadCategoryReport);

export default router;

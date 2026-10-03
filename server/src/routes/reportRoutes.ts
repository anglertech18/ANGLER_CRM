import express from 'express';
import { getDashboardStats, getDashboardBdes, getDashboardProducts, getMISReports, getLeadCategoryReport, getSalesActivities } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';

const router = express.Router();

router.get('/dashboard', authenticate, getDashboardStats);
router.get('/dashboard-bdes', authenticate, getDashboardBdes);
router.get('/dashboard-products', authenticate, getDashboardProducts);
router.get('/sales-activities', authenticate, checkPrivilege('Reports', 'can_view'), getSalesActivities);
router.get('/mis', authenticate, checkPrivilege('Reports', 'can_view'), getMISReports);
router.get('/leads', authenticate, checkPrivilege('Reports', 'can_view'), getLeadCategoryReport);

export default router;

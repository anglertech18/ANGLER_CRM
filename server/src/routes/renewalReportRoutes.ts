import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import {
  getMonthlyReport,
  getServiceWiseReport,
  getUpcomingReport,
  getOverdueReport,
} from '../controllers/renewalReportController';

const router = express.Router();

router.get('/monthly', authenticate, checkPrivilege('RenewalReports', 'can_view'), getMonthlyReport);
router.get('/service-wise', authenticate, checkPrivilege('RenewalReports', 'can_view'), getServiceWiseReport);
router.get('/upcoming', authenticate, checkPrivilege('RenewalReports', 'can_view'), getUpcomingReport);
router.get('/overdue', authenticate, checkPrivilege('RenewalReports', 'can_view'), getOverdueReport);

export default router;

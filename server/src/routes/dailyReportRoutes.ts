import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import { listDailyReports, getDailyReportById } from '../controllers/dailyReportController';

const router = express.Router();

router.get('/', authenticate, checkPrivilege('DailyReport', 'can_view'), listDailyReports);
router.get('/:id', authenticate, checkPrivilege('DailyReport', 'can_view'), getDailyReportById);

export default router;

import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import { getCashflowReport, getCashflowReportBdes, getCashflowReportClientCompanies } from '../controllers/cashflowReportController';

const router = express.Router();

router.get('/bdes', authenticate, checkPrivilege('CashflowReport', 'can_view'), getCashflowReportBdes);
router.get('/client-companies', authenticate, checkPrivilege('CashflowReport', 'can_view'), getCashflowReportClientCompanies);
router.get('/', authenticate, checkPrivilege('CashflowReport', 'can_view'), getCashflowReport);

export default router;

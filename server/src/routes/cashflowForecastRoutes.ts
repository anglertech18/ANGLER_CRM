import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import {
    getForecastList, getForecastDashboard, getForecastBdes, getForecastClientCompanies, getForecastById, getForecastByLeadId,
    upsertForecast, deleteForecast,
} from '../controllers/cashflowForecastController';

const router = express.Router();

router.get('/', authenticate, checkPrivilege('CashflowForecast', 'can_view'), getForecastList);
router.get('/dashboard', authenticate, checkPrivilege('CashflowForecast', 'can_view'), getForecastDashboard);
router.get('/bdes', authenticate, checkPrivilege('CashflowForecast', 'can_view'), getForecastBdes);
router.get('/client-companies', authenticate, checkPrivilege('CashflowForecast', 'can_view'), getForecastClientCompanies);
router.get('/by-lead/:leadId', authenticate, checkPrivilege('CashflowForecast', 'can_view'), getForecastByLeadId);
router.get('/:id', authenticate, checkPrivilege('CashflowForecast', 'can_view'), getForecastById);
router.post('/', authenticate, checkPrivilege('CashflowForecast', 'can_edit'), upsertForecast);
router.delete('/:id', authenticate, checkPrivilege('CashflowForecast', 'can_delete'), deleteForecast);

export default router;

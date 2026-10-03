import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import {
    searchBillingCompanies, getAvailableMilestones, addToBillingForecast,
    getBillingForecastTracker, saveBillingInvoice, getBillingAchievedReport,
    getBillingForecastBdes, getBillingForecastClientCompanies,
    getBillingForecastMilestoneBdes, getBillingForecastMilestoneCompanies,
} from '../controllers/billingForecastController';

const router = express.Router();

// Screen 1 — Billing Forecast Milestones
router.get('/companies', authenticate, checkPrivilege('BillingForecast', 'can_view'), searchBillingCompanies);
router.get('/milestones', authenticate, checkPrivilege('BillingForecast', 'can_view'), getAvailableMilestones);
router.get('/milestone-bdes', authenticate, checkPrivilege('BillingForecast', 'can_view'), getBillingForecastMilestoneBdes);
router.get('/milestone-companies', authenticate, checkPrivilege('BillingForecast', 'can_view'), getBillingForecastMilestoneCompanies);
router.post('/', authenticate, checkPrivilege('BillingForecast', 'can_add'), addToBillingForecast);

// Screen 2 — Billing Forecast Tracker
router.get('/tracker', authenticate, checkPrivilege('BillingForecast', 'can_view'), getBillingForecastTracker);
router.put('/:id/invoice', authenticate, checkPrivilege('BillingForecast', 'can_edit'), saveBillingInvoice);

// Screen 3 — Billing Achieved Report
router.get('/achieved', authenticate, checkPrivilege('BillingForecast', 'can_view'), getBillingAchievedReport);

// Shared filter option lists
router.get('/bdes', authenticate, checkPrivilege('BillingForecast', 'can_view'), getBillingForecastBdes);
router.get('/client-companies', authenticate, checkPrivilege('BillingForecast', 'can_view'), getBillingForecastClientCompanies);

export default router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const billingForecastController_1 = require("../controllers/billingForecastController");
const router = express_1.default.Router();
// Screen 1 — Billing Forecast Milestones
router.get('/companies', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_view'), billingForecastController_1.searchBillingCompanies);
router.get('/milestones', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_view'), billingForecastController_1.getAvailableMilestones);
router.get('/milestone-bdes', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_view'), billingForecastController_1.getBillingForecastMilestoneBdes);
router.get('/milestone-companies', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_view'), billingForecastController_1.getBillingForecastMilestoneCompanies);
router.post('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_add'), billingForecastController_1.addToBillingForecast);
// Screen 2 — Billing Forecast Tracker
router.get('/tracker', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_view'), billingForecastController_1.getBillingForecastTracker);
router.put('/:id/invoice', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_edit'), billingForecastController_1.saveBillingInvoice);
// Screen 3 — Billing Achieved Report
router.get('/achieved', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_view'), billingForecastController_1.getBillingAchievedReport);
// Shared filter option lists
router.get('/bdes', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_view'), billingForecastController_1.getBillingForecastBdes);
router.get('/client-companies', auth_1.authenticate, (0, rbac_1.checkPrivilege)('BillingForecast', 'can_view'), billingForecastController_1.getBillingForecastClientCompanies);
exports.default = router;

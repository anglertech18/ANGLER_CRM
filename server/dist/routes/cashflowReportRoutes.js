"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const cashflowReportController_1 = require("../controllers/cashflowReportController");
const router = express_1.default.Router();
router.get('/dashboard-activities', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowReport', 'can_view'), cashflowReportController_1.getCashflowDashboardActivities);
router.get('/bdes', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowReport', 'can_view'), cashflowReportController_1.getCashflowReportBdes);
router.get('/client-companies', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowReport', 'can_view'), cashflowReportController_1.getCashflowReportClientCompanies);
router.get('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowReport', 'can_view'), cashflowReportController_1.getCashflowReport);
exports.default = router;

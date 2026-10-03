"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const cashflowForecastController_1 = require("../controllers/cashflowForecastController");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowForecast', 'can_view'), cashflowForecastController_1.getForecastList);
router.get('/dashboard', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowForecast', 'can_view'), cashflowForecastController_1.getForecastDashboard);
router.get('/bdes', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowForecast', 'can_view'), cashflowForecastController_1.getForecastBdes);
router.get('/client-companies', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowForecast', 'can_view'), cashflowForecastController_1.getForecastClientCompanies);
router.get('/by-lead/:leadId', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowForecast', 'can_view'), cashflowForecastController_1.getForecastByLeadId);
router.get('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowForecast', 'can_view'), cashflowForecastController_1.getForecastById);
router.post('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowForecast', 'can_edit'), cashflowForecastController_1.upsertForecast);
router.delete('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('CashflowForecast', 'can_delete'), cashflowForecastController_1.deleteForecast);
exports.default = router;

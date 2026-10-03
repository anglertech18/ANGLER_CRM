"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reportController_1 = require("../controllers/reportController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
router.get('/dashboard', auth_1.authenticate, reportController_1.getDashboardStats);
router.get('/dashboard-bdes', auth_1.authenticate, reportController_1.getDashboardBdes);
router.get('/dashboard-products', auth_1.authenticate, reportController_1.getDashboardProducts);
router.get('/sales-activities', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Reports', 'can_view'), reportController_1.getSalesActivities);
router.get('/mis', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Reports', 'can_view'), reportController_1.getMISReports);
router.get('/leads', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Reports', 'can_view'), reportController_1.getLeadCategoryReport);
exports.default = router;

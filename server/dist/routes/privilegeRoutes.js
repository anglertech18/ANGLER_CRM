"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const privilegeController_1 = require("../controllers/privilegeController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
router.get('/:userId/cashflow-access', auth_1.authenticate, (0, rbac_1.checkPrivilege)('PrivilegeMaster', 'can_view'), privilegeController_1.getCashflowAccess);
router.post('/:userId/cashflow-access', auth_1.authenticate, (0, rbac_1.checkPrivilege)('PrivilegeMaster', 'can_edit'), privilegeController_1.updateCashflowAccess);
router.get('/:userId/billing-forecast-access', auth_1.authenticate, (0, rbac_1.checkPrivilege)('PrivilegeMaster', 'can_view'), privilegeController_1.getBillingForecastAccess);
router.post('/:userId/billing-forecast-access', auth_1.authenticate, (0, rbac_1.checkPrivilege)('PrivilegeMaster', 'can_edit'), privilegeController_1.updateBillingForecastAccess);
router.get('/:userId/lead-source-types', auth_1.authenticate, (0, rbac_1.checkPrivilege)('PrivilegeMaster', 'can_view'), privilegeController_1.getLeadSourceTypeAccess);
router.post('/:userId/lead-source-types', auth_1.authenticate, (0, rbac_1.checkPrivilege)('PrivilegeMaster', 'can_edit'), privilegeController_1.updateLeadSourceTypeAccess);
router.get('/:userId', auth_1.authenticate, (0, rbac_1.checkPrivilege)('PrivilegeMaster', 'can_view'), privilegeController_1.getPrivileges);
router.post('/:userId', auth_1.authenticate, (0, rbac_1.checkPrivilege)('PrivilegeMaster', 'can_edit'), privilegeController_1.updatePrivileges);
exports.default = router;

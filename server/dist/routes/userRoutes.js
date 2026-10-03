"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, userController_1.getUsers);
router.get('/:id', auth_1.authenticate, userController_1.getUserById);
router.post('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_add'), userController_1.createUser);
router.put('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_edit'), userController_1.updateUser);
router.delete('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_delete'), userController_1.deleteUser);
router.patch('/:id/toggle-status', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_edit'), userController_1.toggleUserStatus);
router.patch('/:id/toggle-daily-report', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_edit'), userController_1.toggleDailyReportEnabled);
// New Routes
router.post('/:id/resend-invite', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_edit'), userController_1.resendInvite);
router.patch('/:id/status', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_edit'), userController_1.updateUserStatus);
router.patch('/:id/profile', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_edit'), userController_1.updateUserProfile);
router.get('/:id/targets', auth_1.authenticate, userController_1.getAllUserTargets);
router.get('/:id/product-targets', auth_1.authenticate, userController_1.getUserProductTargets);
router.patch('/:id/product-targets', auth_1.authenticate, (0, rbac_1.checkPrivilege)('UserMaster', 'can_edit'), userController_1.updateUserProductTargets);
exports.default = router;

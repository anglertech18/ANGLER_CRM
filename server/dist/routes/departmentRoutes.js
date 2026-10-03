"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const departmentController_1 = require("../controllers/departmentController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, departmentController_1.getDepartments);
router.get('/all', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_view'), departmentController_1.getAllDepartments);
router.post('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_add'), departmentController_1.createDepartment);
router.put('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_edit'), departmentController_1.updateDepartment);
router.delete('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_delete'), departmentController_1.deleteDepartment);
exports.default = router;

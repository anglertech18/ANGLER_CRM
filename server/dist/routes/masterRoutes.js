"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const masterController_1 = require("../controllers/masterController");
const rbac_1 = require("../middleware/rbac");
const auth_1 = require("../middleware/auth");
const bantController_1 = require("../controllers/bantController");
const router = express_1.default.Router();
const masters = [
    'company', 'sBU', 'jobTitle', 'leadSource', 'leadSourceType', 'industry',
    'country', 'state', 'city', 'product', 'eitService', 'imService', 'persona',
    'collateral', 'salesStage', 'activity', 'avatar', 'sourceOfDB', 'callStatus', 'department', 'emailStatus',
    'vertical', 'paymentType', 'clientCompany'
];
masters.forEach((master) => {
    const controller = (0, masterController_1.createMasterController)(master);
    const routeName = master.toLowerCase();
    router.get(`/${routeName}`, auth_1.authenticate, controller.getAll);
    router.get(`/${routeName}/:id`, auth_1.authenticate, controller.getById);
    router.post(`/${routeName}`, auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_add'), controller.create);
    router.put(`/${routeName}/:id`, auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_edit'), controller.update);
    router.delete(`/${routeName}/:id`, auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_delete'), controller.delete);
});
// BANT master routes (lead-facing reads — no privilege check, auth only)
router.get('/bant-categories', auth_1.authenticate, bantController_1.getBantCategories);
router.get('/bant-questions', auth_1.authenticate, bantController_1.getBantQuestions);
// BANT admin CRUD routes
router.get('/bant-categories/admin', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_view'), bantController_1.getBantCategoriesAdmin);
router.post('/bant-categories', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_add'), bantController_1.createBantCategory);
router.put('/bant-categories/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_edit'), bantController_1.updateBantCategory);
router.delete('/bant-categories/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_delete'), bantController_1.deleteBantCategory);
router.get('/bant-questions/admin', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_view'), bantController_1.getBantQuestionsAdmin);
router.post('/bant-questions', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_add'), bantController_1.createBantQuestion);
router.put('/bant-questions/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_edit'), bantController_1.updateBantQuestion);
router.delete('/bant-questions/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Masters', 'can_delete'), bantController_1.deleteBantQuestion);
exports.default = router;

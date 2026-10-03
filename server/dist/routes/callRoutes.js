"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const callController_1 = require("../controllers/callController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = express_1.default.Router();
router.post('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_add'), callController_1.logCall);
router.get('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_view'), callController_1.getCalls);
router.get('/kra/:userId', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_view'), callController_1.getKRA);
exports.default = router;

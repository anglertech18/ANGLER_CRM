"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const dailyReportController_1 = require("../controllers/dailyReportController");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('DailyReport', 'can_view'), dailyReportController_1.listDailyReports);
router.get('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('DailyReport', 'can_view'), dailyReportController_1.getDailyReportById);
exports.default = router;

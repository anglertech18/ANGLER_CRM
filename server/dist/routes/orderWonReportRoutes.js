"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const orderWonReportController_1 = require("../controllers/orderWonReportController");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, orderWonReportController_1.getOrderWonReport);
exports.default = router;

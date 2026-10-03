"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const cashflowTrackerController_1 = require("../controllers/cashflowTrackerController");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, cashflowTrackerController_1.getCashflowTrackers);
router.get('/:id', auth_1.authenticate, cashflowTrackerController_1.getCashflowTrackerById);
router.post('/', auth_1.authenticate, cashflowTrackerController_1.createCashflowTracker);
router.put('/:id', auth_1.authenticate, cashflowTrackerController_1.updateCashflowTracker);
router.delete('/:id', auth_1.authenticate, cashflowTrackerController_1.deleteCashflowTracker);
exports.default = router;

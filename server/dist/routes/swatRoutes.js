"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const swatController_1 = require("../controllers/swatController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, swatController_1.getSwatPerformance);
router.post('/', auth_1.authenticate, swatController_1.saveSwatPerformance);
router.get('/my-mappings', auth_1.authenticate, swatController_1.getMyMappings);
router.get('/stats', auth_1.authenticate, swatController_1.getSwatStats);
exports.default = router;

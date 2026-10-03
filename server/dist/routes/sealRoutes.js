"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const sealController = __importStar(require("../controllers/sealController"));
const poaController = __importStar(require("../controllers/poaController"));
const partnerController = __importStar(require("../controllers/partnerController"));
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, sealController.getSealData);
router.get('/summary', auth_1.authenticate, sealController.getSealSummary);
router.get('/bdes', auth_1.authenticate, sealController.getBdes);
router.get('/weekly-reports', auth_1.authenticate, sealController.getWeeklyReports);
router.get('/weekly-reports/latest', auth_1.authenticate, sealController.getLatestWeeklyReport);
router.get('/weekly-reports/leads', auth_1.authenticate, sealController.getWeeklyReportLeads);
router.post('/weekly-reports', auth_1.authenticate, sealController.createWeeklyReport);
router.put('/weekly-reports/:id', auth_1.authenticate, sealController.updateWeeklyReport);
// POA Routes
router.get('/poas/mapped-products', auth_1.authenticate, poaController.getMappedProducts);
router.get('/poas/mapped-bdes', auth_1.authenticate, poaController.getMappedBdes);
router.get('/poas', auth_1.authenticate, poaController.getPOAs);
router.get('/poas/summary', auth_1.authenticate, poaController.getPOASummary);
router.get('/poas/weekly-summary', auth_1.authenticate, poaController.getWeeklyPOASummary);
router.post('/poas', auth_1.authenticate, poaController.createPOA);
router.put('/poas/:id', auth_1.authenticate, poaController.updatePOA);
router.delete('/poas/:id', auth_1.authenticate, poaController.deletePOA);
// Partner Onboarding Routes
router.get('/partners', auth_1.authenticate, partnerController.getPartners);
router.get('/partners/:id', auth_1.authenticate, partnerController.getPartnerById);
router.post('/partners', auth_1.authenticate, partnerController.createPartner);
router.put('/partners/:id', auth_1.authenticate, partnerController.updatePartner);
router.delete('/partners/:id', auth_1.authenticate, partnerController.deletePartner);
exports.default = router;

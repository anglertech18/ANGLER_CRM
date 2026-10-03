"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leadController_1 = require("../controllers/leadController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const upload_1 = require("../utils/upload");
const bantController_1 = require("../controllers/bantController");
const milestoneController_1 = require("../controllers/milestoneController");
const router = express_1.default.Router();
console.log('Lead routes loaded');
router.use((req, res, next) => {
    console.log('========== LEAD ROUTER MIDDLEWARE ==========');
    console.log('Lead Router Request:', req.method, req.url);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Has body?:', !!req.body);
    console.log('Body type:', typeof req.body);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('Body keys:', req.body ? Object.keys(req.body).length : 0);
    }
    console.log('===========================================');
    next();
});
// Test route to verify body parser is working
router.post('/test', (req, res) => {
    console.log('TEST ROUTE - Body:', req.body);
    res.json({ received: req.body, bodyType: typeof req.body, hasBody: !!req.body });
});
const conditionalUpload = (req, res, next) => {
    const contentType = req.headers['content-type'];
    console.log(`[LeadRoute] Content-Type: ${contentType}`);
    if (contentType && contentType.includes('multipart/form-data')) {
        console.log('[LeadRoute] Applying Multer');
        upload_1.upload.fields([
            { name: 'pain_points_files', maxCount: 5 },
            { name: 'order_won_attachment', maxCount: 1 }
        ])(req, res, next);
    }
    else {
        console.log('[LeadRoute] Skipping Multer (JSON flow)');
        next();
    }
};
router.get('/search-company', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), (req, res, next) => {
    // We import directly to avoid any circular dependency or type issues if needed
    require('../controllers/leadController').searchCompany(req, res);
});
router.get('/order-won/milestones', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), milestoneController_1.getOrderWonLeadsWithMilestones);
router.get('/order-won/milestones/client-companies', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), milestoneController_1.getOrderWonClientCompanies);
router.get('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), leadController_1.getLeads);
router.post('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_add'), conditionalUpload, leadController_1.createLead);
router.get('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), leadController_1.getLeadById);
router.put('/:id/score', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), leadController_1.updateLeadScore);
router.put('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), conditionalUpload, leadController_1.updateLead);
router.delete('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_delete'), leadController_1.deleteLead);
router.post('/:id/documents', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), upload_1.upload.single('file'), leadController_1.uploadDocument);
router.post('/:id/pricing-negotiations', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), leadController_1.addPricingNegotiationLog);
router.patch('/:id/follow-up-logs/:logId/status', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), leadController_1.updateFollowUpLogStatus);
router.patch('/:id/cashflow', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), leadController_1.cashFlowUpdateLead);
router.get('/:id/bant', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), bantController_1.getLeadBantAnswers);
router.post('/:id/bant', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), bantController_1.saveLeadBantAnswers);
router.get('/:id/milestones', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), milestoneController_1.getLeadMilestones);
router.post('/:id/milestones', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), milestoneController_1.saveLeadMilestones);
router.put('/:id/milestones/:mid', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_edit'), milestoneController_1.updateMilestone);
router.get('/:id/milestones/:mid/payment-history', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), milestoneController_1.getMilestonePaymentHistory);
router.get('/:id/milestones/:mid/bant-poa-history', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Leads', 'can_view'), milestoneController_1.getMilestoneBantPoaHistory);
exports.default = router;

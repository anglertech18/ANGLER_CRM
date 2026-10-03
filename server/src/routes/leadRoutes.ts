import express from 'express';
import { createLead, getLeads, getLeadById, updateLead, deleteLead, uploadDocument, updateLeadScore, addPricingNegotiationLog, cashFlowUpdateLead } from '../controllers/leadController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import { upload } from '../utils/upload';
import { getLeadBantAnswers, saveLeadBantAnswers } from '../controllers/bantController';
import { getLeadMilestones, saveLeadMilestones, updateMilestone, getOrderWonLeadsWithMilestones, getOrderWonClientCompanies, getMilestonePaymentHistory, getMilestoneBantPoaHistory } from '../controllers/milestoneController';

const router = express.Router();

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

const conditionalUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const contentType = req.headers['content-type'];
    console.log(`[LeadRoute] Content-Type: ${contentType}`);
    if (contentType && contentType.includes('multipart/form-data')) {
        console.log('[LeadRoute] Applying Multer');
        upload.fields([
            { name: 'pain_points_files', maxCount: 5 },
            { name: 'order_won_attachment', maxCount: 1 }
        ])(req, res, next);
    } else {
        console.log('[LeadRoute] Skipping Multer (JSON flow)');
        next();
    }
};

router.get('/search-company', authenticate, checkPrivilege('Leads', 'can_view'), (req: any, res: any, next: any) => {
    // We import directly to avoid any circular dependency or type issues if needed
    require('../controllers/leadController').searchCompany(req, res);
});

router.get('/order-won/milestones', authenticate, checkPrivilege('Leads', 'can_view'), getOrderWonLeadsWithMilestones);
router.get('/order-won/milestones/client-companies', authenticate, checkPrivilege('Leads', 'can_view'), getOrderWonClientCompanies);

router.get('/', authenticate, checkPrivilege('Leads', 'can_view'), getLeads);
router.post('/',
    authenticate,
    checkPrivilege('Leads', 'can_add'),
    conditionalUpload,
    createLead
);
router.get('/:id', authenticate, checkPrivilege('Leads', 'can_view'), getLeadById);
router.put('/:id/score', authenticate, checkPrivilege('Leads', 'can_edit'), updateLeadScore);
router.put('/:id',
    authenticate,
    checkPrivilege('Leads', 'can_edit'),
    conditionalUpload,
    updateLead
);
router.delete('/:id', authenticate, checkPrivilege('Leads', 'can_delete'), deleteLead);
router.post('/:id/documents', authenticate, checkPrivilege('Leads', 'can_edit'), upload.single('file'), uploadDocument);
router.post('/:id/pricing-negotiations', authenticate, checkPrivilege('Leads', 'can_edit'), addPricingNegotiationLog);
router.patch('/:id/cashflow', authenticate, checkPrivilege('Leads', 'can_edit'), cashFlowUpdateLead);
router.get('/:id/bant', authenticate, checkPrivilege('Leads', 'can_view'), getLeadBantAnswers);
router.post('/:id/bant', authenticate, checkPrivilege('Leads', 'can_edit'), saveLeadBantAnswers);

router.get('/:id/milestones', authenticate, checkPrivilege('Leads', 'can_view'), getLeadMilestones);
router.post('/:id/milestones', authenticate, checkPrivilege('Leads', 'can_edit'), saveLeadMilestones);
router.put('/:id/milestones/:mid', authenticate, checkPrivilege('Leads', 'can_edit'), updateMilestone);
router.get('/:id/milestones/:mid/payment-history', authenticate, checkPrivilege('Leads', 'can_view'), getMilestonePaymentHistory);
router.get('/:id/milestones/:mid/bant-poa-history', authenticate, checkPrivilege('Leads', 'can_view'), getMilestoneBantPoaHistory);

export default router;

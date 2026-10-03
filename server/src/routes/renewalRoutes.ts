import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import { upload } from '../utils/upload';
import {
  listRenewals, getRenewal, createRenewal, updateRenewal,
  deleteRenewal, activateRenewal, addService, updateService,
  renewService, markNotRenewing, addPayment, uploadDocument,
  getDashboard, previewReminders, generatePdfDocument, generateProformaInvoicePdf, previewPdfDocument,
  getRenewalFollowUpTasks, getRenewalCommunicationTimeline,
} from '../controllers/renewalController';

import { downloadTemplate, processUpload, previewUpload } from '../controllers/renewalBulkUploadController';

const router = express.Router();

// Bulk Upload Suite Endpoints
router.get('/bulk-upload/template', authenticate, downloadTemplate);
router.post('/bulk-upload/preview', authenticate, checkPrivilege('Renewals', 'can_add'), upload.single('file'), previewUpload);
router.post('/bulk-upload/process', authenticate, checkPrivilege('Renewals', 'can_add'), upload.single('file'), processUpload);

// Dashboard & Previews
router.get('/dashboard', authenticate, checkPrivilege('Renewals', 'can_view'), getDashboard);
router.get('/preview-reminders', authenticate, checkPrivilege('Renewals', 'can_view'), previewReminders);
router.post('/preview-pdf', authenticate, checkPrivilege('Renewals', 'can_view'), previewPdfDocument);

// Renewal CRUD
router.get('/', authenticate, checkPrivilege('Renewals', 'can_view'), listRenewals);
router.post('/', authenticate, checkPrivilege('Renewals', 'can_add'), createRenewal);
router.get('/:id', authenticate, checkPrivilege('Renewals', 'can_view'), getRenewal);
router.put('/:id', authenticate, checkPrivilege('Renewals', 'can_edit'), updateRenewal);
router.delete('/:id', authenticate, checkPrivilege('Renewals', 'can_delete'), deleteRenewal);
router.post('/:id/activate', authenticate, checkPrivilege('Renewals', 'can_edit'), activateRenewal);

// Services
router.post('/:id/services', authenticate, checkPrivilege('Renewals', 'can_edit'), addService);
router.put('/:id/services/:svcId', authenticate, checkPrivilege('Renewals', 'can_edit'), updateService);
router.post('/:id/services/:svcId/renew', authenticate, checkPrivilege('Renewals', 'can_edit'), renewService);
router.post('/:id/services/:svcId/mark-not-renewing', authenticate, checkPrivilege('Renewals', 'can_edit'), markNotRenewing);

// Payments
router.post('/:id/payments', authenticate, checkPrivilege('Renewals', 'can_edit'), addPayment);

// Documents & Reports
router.post('/:id/documents', authenticate, checkPrivilege('Renewals', 'can_edit'), upload.single('file'), uploadDocument);
router.post('/:id/generate-pdf', authenticate, checkPrivilege('Renewals', 'can_edit'), generatePdfDocument);
router.post('/:id/generate-proforma-invoice', authenticate, checkPrivilege('Renewals', 'can_edit'), generateProformaInvoicePdf);

// Multi-channel follow-up architecture
router.get('/:id/follow-up-tasks', authenticate, checkPrivilege('Renewals', 'can_view'), getRenewalFollowUpTasks);
router.get('/:id/communication-timeline', authenticate, checkPrivilege('Renewals', 'can_view'), getRenewalCommunicationTimeline);

export default router;

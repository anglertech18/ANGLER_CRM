import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import { upload } from '../utils/upload';
import {
  listServicePrices, createServicePrice,
  getCustomerPrice, createCustomerPrice, deactivateCustomerPrice,
  resolveInstancePrice, getPricingHistory,
  listAlertSteps, saveAlertSteps,
  listMappings, getMappingHover, getMappingDetail,
  listDrafts, approveDraft, skipDraft, approveDraftsBulk,
  listBrandProfiles, createBrandProfile, updateBrandProfile, uploadBrandLogo,
  triggerAlertsManual,
} from '../controllers/renewalPricingController';

const router = express.Router();

const canView = [authenticate, checkPrivilege('Renewals', 'can_view')];
const canEdit = [authenticate, checkPrivilege('Renewals', 'can_edit')];
const canAdd  = [authenticate, checkPrivilege('Renewals', 'can_add')];

// ── Service Default Prices ────────────────────────────────────────────────────
router.get('/service/:serviceId/prices', ...canView, listServicePrices);
router.post('/service/:serviceId/prices', ...canEdit, createServicePrice);

// ── Customer Overrides ────────────────────────────────────────────────────────
router.get('/customer/:clientId/service/:serviceId', ...canView, getCustomerPrice);
router.post('/customer-prices', ...canEdit, createCustomerPrice);
router.put('/customer-prices/:id/deactivate', ...canEdit, deactivateCustomerPrice);

// ── Resolve ───────────────────────────────────────────────────────────────────
router.get('/resolve', ...canView, resolveInstancePrice);
router.get('/history', ...canView, getPricingHistory);

// ── Alert Steps ───────────────────────────────────────────────────────────────
router.get('/mappings/:instanceId/alert-steps', ...canView, listAlertSteps);
router.put('/mappings/:instanceId/alert-steps', ...canEdit, saveAlertSteps);

// ── Mapping Views ─────────────────────────────────────────────────────────────
router.get('/mappings', ...canView, listMappings);
router.get('/mappings/:id/hover', ...canView, getMappingHover);
router.get('/mappings/:id', ...canView, getMappingDetail);

// ── Draft Queue ───────────────────────────────────────────────────────────────
router.get('/drafts', ...canView, listDrafts);
router.post('/drafts/:id/approve', ...canEdit, approveDraft);
router.post('/drafts/:id/skip', ...canEdit, skipDraft);
router.post('/drafts/approve-bulk', ...canEdit, approveDraftsBulk);

// ── Brand Profiles ────────────────────────────────────────────────────────────
router.get('/brand-profiles', ...canView, listBrandProfiles);
router.post('/brand-profiles', ...canAdd, createBrandProfile);
router.put('/brand-profiles/:id', ...canEdit, updateBrandProfile);
router.post('/brand-profiles/:id/logo', ...canEdit, upload.single('logo'), uploadBrandLogo);

// ── Manual Trigger for Testing ────────────────────────────────────────────────
router.post('/trigger-alerts', ...canEdit, triggerAlertsManual);

export default router;

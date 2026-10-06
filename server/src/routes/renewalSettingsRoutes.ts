import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import {
  getPolicies, getPolicyById, getPolicyVersions, createPolicy, updatePolicy, deletePolicy,
  getTemplates, getTemplateById, getTemplateVersions, createTemplate, updateTemplate, deleteTemplate,
} from '../controllers/renewalSettingsController';

const router = express.Router();

// Policies
router.get('/policies', authenticate, checkPrivilege('RenewalSettings', 'can_view'), getPolicies);
router.get('/policies/:id', authenticate, checkPrivilege('RenewalSettings', 'can_view'), getPolicyById);
router.get('/policies/:id/versions', authenticate, checkPrivilege('RenewalSettings', 'can_view'), getPolicyVersions);
router.post('/policies', authenticate, checkPrivilege('RenewalSettings', 'can_add'), createPolicy);
router.put('/policies/:id', authenticate, checkPrivilege('RenewalSettings', 'can_edit'), updatePolicy);
router.delete('/policies/:id', authenticate, checkPrivilege('RenewalSettings', 'can_delete'), deletePolicy);

// Templates
router.get('/templates', authenticate, checkPrivilege('RenewalSettings', 'can_view'), getTemplates);
router.get('/templates/:id', authenticate, checkPrivilege('RenewalSettings', 'can_view'), getTemplateById);
router.get('/templates/:id/versions', authenticate, checkPrivilege('RenewalSettings', 'can_view'), getTemplateVersions);
router.post('/templates', authenticate, checkPrivilege('RenewalSettings', 'can_add'), createTemplate);
router.put('/templates/:id', authenticate, checkPrivilege('RenewalSettings', 'can_edit'), updateTemplate);
router.delete('/templates/:id', authenticate, checkPrivilege('RenewalSettings', 'can_delete'), deleteTemplate);

export default router;

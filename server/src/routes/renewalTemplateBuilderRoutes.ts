import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import {
  listTokens, listTemplates, getTemplateBuilder,
  saveTemplateBuilder, previewTemplate, createTemplate, deleteTemplate,
} from '../controllers/renewalTemplateBuilderController';

const router = express.Router();

const canView = [authenticate, checkPrivilege('RenewalSettings', 'can_view')];
const canEdit = [authenticate, checkPrivilege('RenewalSettings', 'can_edit')];
const canAdd  = [authenticate, checkPrivilege('RenewalSettings', 'can_add')];

router.get('/tokens',            ...canView, listTokens);
router.get('/',                  ...canView, listTemplates);
router.post('/',                 ...canAdd,  createTemplate);
router.get('/:id/builder',       ...canView, getTemplateBuilder);
router.put('/:id/builder',       ...canEdit, saveTemplateBuilder);
router.post('/:id/builder/preview', ...canView, previewTemplate);
router.delete('/:id',            ...canEdit, deleteTemplate);

export default router;

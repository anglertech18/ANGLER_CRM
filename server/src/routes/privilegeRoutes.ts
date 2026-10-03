import express from 'express';
import { getPrivileges, updatePrivileges, getCashflowAccess, updateCashflowAccess, getBillingForecastAccess, updateBillingForecastAccess, getLeadSourceTypeAccess, updateLeadSourceTypeAccess } from '../controllers/privilegeController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';

const router = express.Router();

router.get('/:userId/cashflow-access', authenticate, checkPrivilege('PrivilegeMaster', 'can_view'), getCashflowAccess);
router.post('/:userId/cashflow-access', authenticate, checkPrivilege('PrivilegeMaster', 'can_edit'), updateCashflowAccess);

router.get('/:userId/billing-forecast-access', authenticate, checkPrivilege('PrivilegeMaster', 'can_view'), getBillingForecastAccess);
router.post('/:userId/billing-forecast-access', authenticate, checkPrivilege('PrivilegeMaster', 'can_edit'), updateBillingForecastAccess);

router.get('/:userId/lead-source-types', authenticate, checkPrivilege('PrivilegeMaster', 'can_view'), getLeadSourceTypeAccess);
router.post('/:userId/lead-source-types', authenticate, checkPrivilege('PrivilegeMaster', 'can_edit'), updateLeadSourceTypeAccess);

router.get('/:userId', authenticate, checkPrivilege('PrivilegeMaster', 'can_view'), getPrivileges);
router.post('/:userId', authenticate, checkPrivilege('PrivilegeMaster', 'can_edit'), updatePrivileges);

export default router;

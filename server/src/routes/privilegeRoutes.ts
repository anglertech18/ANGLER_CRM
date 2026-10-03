import express from 'express';
import { getPrivileges, updatePrivileges, getCashflowAccess, updateCashflowAccess } from '../controllers/privilegeController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';

const router = express.Router();

router.get('/:userId/cashflow-access', authenticate, checkPrivilege('PrivilegeMaster', 'can_view'), getCashflowAccess);
router.post('/:userId/cashflow-access', authenticate, checkPrivilege('PrivilegeMaster', 'can_edit'), updateCashflowAccess);

router.get('/:userId', authenticate, checkPrivilege('PrivilegeMaster', 'can_view'), getPrivileges);
router.post('/:userId', authenticate, checkPrivilege('PrivilegeMaster', 'can_edit'), updatePrivileges);

export default router;

import express from 'express';
import { getDepartments, getAllDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';

const router = express.Router();

router.get('/', authenticate, getDepartments);
router.get('/all', authenticate, checkPrivilege('Masters', 'can_view'), getAllDepartments);
router.post('/', authenticate, checkPrivilege('Masters', 'can_add'), createDepartment);
router.put('/:id', authenticate, checkPrivilege('Masters', 'can_edit'), updateDepartment);
router.delete('/:id', authenticate, checkPrivilege('Masters', 'can_delete'), deleteDepartment);

export default router;

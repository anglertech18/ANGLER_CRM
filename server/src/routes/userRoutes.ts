import express from 'express';
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus, resendInvite, updateUserStatus, updateUserProfile, getUserById, getAllUserTargets, getUserProductTargets, updateUserProductTargets } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';

const router = express.Router();

router.get('/', authenticate, getUsers);
router.get('/:id', authenticate, getUserById);
router.post('/', authenticate, checkPrivilege('UserMaster', 'can_add'), createUser);
router.put('/:id', authenticate, checkPrivilege('UserMaster', 'can_edit'), updateUser);
router.delete('/:id', authenticate, checkPrivilege('UserMaster', 'can_delete'), deleteUser);
router.patch('/:id/toggle-status', authenticate, checkPrivilege('UserMaster', 'can_edit'), toggleUserStatus);

// New Routes
router.post('/:id/resend-invite', authenticate, checkPrivilege('UserMaster', 'can_edit'), resendInvite);
router.patch('/:id/status', authenticate, checkPrivilege('UserMaster', 'can_edit'), updateUserStatus);
router.patch('/:id/profile', authenticate, checkPrivilege('UserMaster', 'can_edit'), updateUserProfile);

router.get('/:id/targets', authenticate, getAllUserTargets);
router.get('/:id/product-targets', authenticate, getUserProductTargets);
router.patch('/:id/product-targets', authenticate, checkPrivilege('UserMaster', 'can_edit'), updateUserProductTargets);


export default router;

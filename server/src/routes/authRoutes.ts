import express from 'express';
import { login, logout, forgotPassword, resetPassword, getMe, changePassword, updatePreferences } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/update-preferences', authenticate, updatePreferences);

export default router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreferences = exports.changePassword = exports.getMe = exports.resetPassword = exports.forgotPassword = exports.logout = exports.login = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.is_active) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        const devMasterPassword = process.env.DEV_MASTER_PASSWORD;
        const isDevOverride = !!(devMasterPassword && password === devMasterPassword);
        if (!isMatch && !isDevOverride) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, sbu_id: user.sbu_id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        // Fetch user with privileges
        const userWithPrivs = await prisma.user.findUnique({
            where: { id: user.id },
            include: { privileges: true, managed_companies: true, cashflow_management_companies: true }
        });
        if (!userWithPrivs)
            return res.status(500).json({ message: 'User not found' });
        // Remove password from response
        const { password_hash: _, ...userData } = userWithPrivs;
        // Store user in session
        if (req.session) {
            req.session.user = userData;
        }
        res.json({ token, user: userData });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.login = login;
const logout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid'); // Default session cookie name
        res.json({ message: 'Logged out successfully' });
    });
};
exports.logout = logout;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        // Don't reveal if user exists or not for security
        if (!user) {
            return res.json({ message: 'If that email exists, a reset link has been sent' });
        }
        // Generate reset token
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
        // Save token to database
        await prisma.user.update({
            where: { email },
            data: {
                reset_token: resetToken,
                reset_token_expiry: resetTokenExpiry
            }
        });
        // Send email
        const { sendPasswordResetEmail } = require('../utils/emailService');
        await sendPasswordResetEmail(email, resetToken);
        res.json({ message: 'If that email exists, a reset link has been sent' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: 'Token and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const user = await prisma.user.findFirst({
            where: {
                reset_token: token,
                reset_token_expiry: {
                    gt: new Date()
                }
            }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Prepare update data
        const updateData = {
            password_hash: hashedPassword,
            reset_token: null,
            reset_token_expiry: null
        };
        // Auto-activate account if user status is INVITED
        if (user.status === 'INVITED') {
            updateData.status = 'ACTIVE';
            updateData.is_active = true;
        }
        // Update password and clear reset token (and activate if INVITED)
        await prisma.user.update({
            where: { id: user.id },
            data: updateData
        });
        const message = user.status === 'INVITED'
            ? 'Account activated successfully! You can now login.'
            : 'Password reset successful';
        res.json({ message });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.resetPassword = resetPassword;
const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                privileges: true,
                company: true,
                sbu: true,
                managed_companies: true,
                cashflow_management_companies: true,
                reporting_manager: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                },
                department_rel: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { password_hash: _, ...userData } = user;
        res.json(userData);
    }
    catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMe = getMe;
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Verify current password
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }
        // Hash new password
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: {
                password_hash: hashedNewPassword
            }
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.changePassword = changePassword;
const updatePreferences = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { preferences } = req.body;
        req.session.preferences = {
            ...req.session.preferences,
            ...preferences
        };
        res.json({ message: 'Preferences updated', preferences: req.session.preferences });
    }
    catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updatePreferences = updatePreferences;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendActivationEmail = exports.sendPasswordResetEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'CRM System'}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
        };
        if (options.cc)
            mailOptions.cc = options.cc;
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
    }
    catch (error) {
        console.error('Error sending email:', error);
        // Don't throw logic error to prevent crashing the main flow, but log it critical
        throw error;
    }
};
exports.sendEmail = sendEmail;
const sendPasswordResetEmail = async (email, resetToken) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to reset it:</p>
            <div style="margin: 20px 0;">
                <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
            <p style="color: #888; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
        </div>
    `;
    await (0, exports.sendEmail)({
        to: email,
        subject: 'CRM - Password Reset Request',
        html
    });
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendActivationEmail = async (email, token) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const activationUrl = `${clientUrl}/activate-account?token=${token}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10B981;">Welcome to CRM!</h2>
            <p>Your account has been created. Please click the link below to activate your account and set your password:</p>
            <div style="margin: 20px 0;">
                <a href="${activationUrl}" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Activate Account</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${activationUrl}">${activationUrl}</a></p>
            <p style="color: #888; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours.</p>
        </div>
    `;
    await (0, exports.sendEmail)({
        to: email,
        subject: 'CRM - Activate Your Account',
        html
    });
};
exports.sendActivationEmail = sendActivationEmail;

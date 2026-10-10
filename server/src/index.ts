import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://213.210.36.216',
    'https://213.210.36.216',
    clientUrl
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // Extract base origin if CLIENT_URL has a path
        const clientOrigin = clientUrl.split('/').slice(0, 3).join('/');

        const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed)) || 
                         origin.startsWith(clientOrigin) ||
                         origin.includes('192.168.') || 
                         origin.includes('localhost') ||
                         origin.includes('anglertechnologies');

        if (isAllowed) {
            callback(null, true);
        } else {
            console.error(`[CORS REJECTED] Origin: ${origin}`);
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { prisma } from './lib/prisma';

// Session configuration
app.use(
    session({
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        },
        secret: process.env.SESSION_SECRET || 'angler_crm_secret_2024',
        resave: false,
        saveUninitialized: false,
        store: new PrismaSessionStore(
            prisma,
            {
                checkPeriod: 2 * 60 * 1000,  // 2 minutes
                dbRecordIdIsSessionId: true,
                dbRecordIdFunction: undefined,
            }
        )
    })
);

// Activity tracking middleware
app.use((req, res, next) => {
    if (req.session && (req.session as any).user) {
        (req.session as any).lastActivity = new Date();
    }
    next();
});

// Debug middleware to log request body
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (req.path.includes('-targets')) {
            require('fs').appendFileSync('target_debug.log', JSON.stringify({
                time: new Date().toISOString(),
                method: req.method,
                path: req.path,
                body: req.body
            }) + '\n');
        }
        console.log(`[${req.method}] ${req.path} - Body type:`, typeof req.body, '- Has body:', !!req.body);
        if (!req.body || Object.keys(req.body).length === 0) {
            console.warn('WARNING: Empty or undefined request body detected!');
        }
    }
    next();
});

import authRoutes from './routes/authRoutes';
import masterRoutes from './routes/masterRoutes';
import userRoutes from './routes/userRoutes';
import privilegeRoutes from './routes/privilegeRoutes';
import leadRoutes from './routes/leadRoutes';
import callRoutes from './routes/callRoutes';
import reportRoutes from './routes/reportRoutes';
import departmentRoutes from './routes/departmentRoutes';
import callTrackerRoutes from './routes/callTrackerRoutes';
import swatRoutes from './routes/swatRoutes';
import { startQuadrantCron } from './cron/quadrantCron';
import { startSwatCron } from './cron/swatCron';
import { startDailyReportCron } from './cron/dailyReportCron';
import { startRenewalReminderCron } from './cron/renewalReminderCron';

import kraRoutes from './routes/kraRoutes';
import sealRoutes from './routes/sealRoutes';
import enquiryRoutes from './routes/enquiryRoutes';
import leadGenRoutes from './routes/leadGenRoutes';
import dailyReportRoutes from './routes/dailyReportRoutes';
import cashflowTrackerRoutes from './routes/cashflowTrackerRoutes';
import cashflowReportRoutes from './routes/cashflowReportRoutes';
import orderWonReportRoutes from './routes/orderWonReportRoutes';
import cashflowForecastRoutes from './routes/cashflowForecastRoutes';
import billingForecastRoutes from './routes/billingForecastRoutes';
import renewalRoutes from './routes/renewalRoutes';
import renewalFollowUpRoutes from './routes/renewalFollowUpRoutes';
import renewalSettingsRoutes from './routes/renewalSettingsRoutes';
import renewalMasterRoutes from './routes/renewalMasterRoutes';
import renewalReportRoutes from './routes/renewalReportRoutes';
import notificationRoutes from './routes/notificationRoutes';
import renewalPricingRoutes from './routes/renewalPricingRoutes';
import renewalTemplateBuilderRoutes from './routes/renewalTemplateBuilderRoutes';
import smtpConfigRoutes from './routes/smtpConfigRoutes';
import whatsappWebRoutes from './routes/whatsappWebRoutes';
import renewalFollowUpTaskRoutes from './routes/renewalFollowUpTaskRoutes';
import renewalFollowUpChannelActionRoutes from './routes/renewalFollowUpChannelActionRoutes';
import renewalCommunicationEventRoutes from './routes/renewalCommunicationEventRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/privileges', privilegeRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/call-tracker', callTrackerRoutes);
app.use('/api/swat-performance', swatRoutes);
app.use('/api/kra-tracker', kraRoutes);
app.use('/api/seal', sealRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/lead-gen', leadGenRoutes);
app.use('/api/daily-report', dailyReportRoutes);
app.use('/api/cashflow-tracker', cashflowTrackerRoutes);
app.use('/api/cashflow-report', cashflowReportRoutes);
app.use('/api/order-won-report', orderWonReportRoutes);
app.use('/api/cashflow-forecast', cashflowForecastRoutes);
app.use('/api/billing-forecast', billingForecastRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/renewal-followups', renewalFollowUpRoutes);
app.use('/api/renewal-settings', renewalSettingsRoutes);
app.use('/api/renewal-masters', renewalMasterRoutes);
app.use('/api/renewal-reports', renewalReportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/renewal-pricing', renewalPricingRoutes);
app.use('/api/renewal-templates', renewalTemplateBuilderRoutes);
app.use('/api/smtp-config', smtpConfigRoutes);
app.use('/api/whatsapp-web', whatsappWebRoutes);
app.use('/api/renewal-follow-up-tasks', renewalFollowUpTaskRoutes);
app.use('/api/renewal-channel-actions', renewalFollowUpChannelActionRoutes);
app.use('/api/renewal-communication-events', renewalCommunicationEventRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
    res.send('CRM API is running');
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('========== GLOBAL ERROR HANDLER ==========');
    console.error('Error:', err.message);
    if (err.stack) console.error('Stack:', err.stack);
    console.error('==========================================');

    // Send JSON response so frontend doesn't choke on HTML
    res.status(500).json({
        error: 'Internal Server Error',
        details: err.message,
        code: err.code || 'UNKNOWN_ERROR'
    });
});

process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    // Keep running if possible, or exit
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startQuadrantCron();
    startSwatCron();
    startDailyReportCron();
    startRenewalReminderCron();
});
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        // Extract base origin if CLIENT_URL has a path
        const clientOrigin = clientUrl.split('/').slice(0, 3).join('/');
        const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed)) ||
            origin.startsWith(clientOrigin) ||
            origin.includes('192.168.') ||
            origin.includes('localhost') ||
            origin.includes('anglertechnologies');
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.error(`[CORS REJECTED] Origin: ${origin}`);
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
const express_session_1 = __importDefault(require("express-session"));
const prisma_session_store_1 = require("@quixo3/prisma-session-store");
const prisma_1 = require("./lib/prisma");
// Session configuration
app.use((0, express_session_1.default)({
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
    secret: process.env.SESSION_SECRET || 'angler_crm_secret_2024',
    resave: false,
    saveUninitialized: false,
    store: new prisma_session_store_1.PrismaSessionStore(prisma_1.prisma, {
        checkPeriod: 2 * 60 * 1000, // 2 minutes
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
    })
}));
// Activity tracking middleware
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        req.session.lastActivity = new Date();
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
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const masterRoutes_1 = __importDefault(require("./routes/masterRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const privilegeRoutes_1 = __importDefault(require("./routes/privilegeRoutes"));
const leadRoutes_1 = __importDefault(require("./routes/leadRoutes"));
const callRoutes_1 = __importDefault(require("./routes/callRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const departmentRoutes_1 = __importDefault(require("./routes/departmentRoutes"));
const callTrackerRoutes_1 = __importDefault(require("./routes/callTrackerRoutes"));
const swatRoutes_1 = __importDefault(require("./routes/swatRoutes"));
const quadrantCron_1 = require("./cron/quadrantCron");
const swatCron_1 = require("./cron/swatCron");
const dailyReportCron_1 = require("./cron/dailyReportCron");
const kraRoutes_1 = __importDefault(require("./routes/kraRoutes"));
const sealRoutes_1 = __importDefault(require("./routes/sealRoutes"));
const enquiryRoutes_1 = __importDefault(require("./routes/enquiryRoutes"));
const leadGenRoutes_1 = __importDefault(require("./routes/leadGenRoutes"));
const dailyReportRoutes_1 = __importDefault(require("./routes/dailyReportRoutes"));
const cashflowTrackerRoutes_1 = __importDefault(require("./routes/cashflowTrackerRoutes"));
const cashflowReportRoutes_1 = __importDefault(require("./routes/cashflowReportRoutes"));
const orderWonReportRoutes_1 = __importDefault(require("./routes/orderWonReportRoutes"));
const cashflowForecastRoutes_1 = __importDefault(require("./routes/cashflowForecastRoutes"));
const billingForecastRoutes_1 = __importDefault(require("./routes/billingForecastRoutes"));
app.use('/api/auth', authRoutes_1.default);
app.use('/api/masters', masterRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/privileges', privilegeRoutes_1.default);
app.use('/api/leads', leadRoutes_1.default);
app.use('/api/calls', callRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/departments', departmentRoutes_1.default);
app.use('/api/call-tracker', callTrackerRoutes_1.default);
app.use('/api/swat-performance', swatRoutes_1.default);
app.use('/api/kra-tracker', kraRoutes_1.default);
app.use('/api/seal', sealRoutes_1.default);
app.use('/api/enquiries', enquiryRoutes_1.default);
app.use('/api/lead-gen', leadGenRoutes_1.default);
app.use('/api/daily-report', dailyReportRoutes_1.default);
app.use('/api/cashflow-tracker', cashflowTrackerRoutes_1.default);
app.use('/api/cashflow-report', cashflowReportRoutes_1.default);
app.use('/api/order-won-report', orderWonReportRoutes_1.default);
app.use('/api/cashflow-forecast', cashflowForecastRoutes_1.default);
app.use('/api/billing-forecast', billingForecastRoutes_1.default);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.get('/', (req, res) => {
    res.send('CRM API is running');
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('========== GLOBAL ERROR HANDLER ==========');
    console.error('Error:', err.message);
    if (err.stack)
        console.error('Stack:', err.stack);
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
    // Temporarily disabled cron job - uncomment after lead creation is working
    (0, quadrantCron_1.startQuadrantCron)();
    (0, swatCron_1.startSwatCron)();
    (0, dailyReportCron_1.startDailyReportCron)();
    // Trigger nodemon restart
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKraMonthlyData = void 0;
const client_1 = require("@prisma/client");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const teamScope_1 = require("../utils/teamScope");
dayjs_1.default.extend(utc_1.default);
const prisma = new client_1.PrismaClient();
/**
 * Get KRA monthly performance data
 */
const getKraMonthlyData = async (req, res) => {
    try {
        const { month, user_id, type, product_id } = req.query;
        const authUser = req.user;
        if (!month) {
            return res.status(400).json({ message: 'Month (YYYY-MM) is required' });
        }
        // Parse month
        const startOfMonth = dayjs_1.default.utc(`${month}-01`).startOf('month').toDate();
        const endOfMonth = dayjs_1.default.utc(`${month}-01`).endOf('month').toDate();
        let targetUserId = user_id ? parseInt(user_id) : authUser.id;
        // RBAC Check
        if (authUser.role === 'SalesPerson') {
            targetUserId = authUser.id; // SalesPerson can only see their own data
        }
        else if (authUser.role === 'SalesManager') {
            // Managers see themselves + their entire downward reporting tree
            const allowedIds = await (0, teamScope_1.getTeamIds)(authUser);
            if (!allowedIds.includes(targetUserId)) {
                return res.status(403).json({ message: 'Access denied to this user performance' });
            }
        }
        let where = {
            user_id: targetUserId,
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        };
        let targetData = { revenue_target: 0, device_target: 0, leads_target: 0 };
        let multipliers = {};
        if (type === 'Product' && product_id) {
            where.product_id = parseInt(product_id);
            const productTarget = await prisma.userProductTarget.findUnique({
                where: {
                    user_id_product_id: {
                        user_id: targetUserId,
                        product_id: parseInt(product_id)
                    }
                }
            });
            if (productTarget)
                targetData = productTarget;
            // Fetch product master for multipliers
            const productMaster = await prisma.product.findUnique({
                where: { id: parseInt(product_id) }
            });
            if (productMaster) {
                multipliers = {
                    device_q4: productMaster.device_q4_multiplier,
                    device_q3: productMaster.device_q3_multiplier,
                    device_q2: productMaster.device_q2_multiplier,
                    device_q1: productMaster.device_q1_multiplier,
                    lead_q4: productMaster.lead_q4_multiplier,
                    lead_q3: productMaster.lead_q3_multiplier,
                    lead_q2: productMaster.lead_q2_multiplier,
                    lead_q1: productMaster.lead_q1_multiplier,
                };
            }
        }
        else if (type === 'EIT Service' || type === 'IM Service') {
            const isEit = type === 'EIT Service';
            const serviceDeptName = isEit ? 'EIT Services' : 'IM Services';
            // Proxy product: targets may be stored in UserProductTarget instead of UserServiceTarget
            const proxyProduct = await prisma.product.findFirst({ where: { name: serviceDeptName } });
            // Query SwatPerformance for both service_department and old proxy product_id records
            const swatOrConditions = [{ service_department: serviceDeptName }];
            if (proxyProduct)
                swatOrConditions.push({ product_id: proxyProduct.id });
            where.OR = swatOrConditions;
            // Target lookup: UserProductTarget only (UserServiceTarget has been removed)
            if (proxyProduct) {
                const proxyTarget = await prisma.userProductTarget.findUnique({
                    where: { user_id_product_id: { user_id: targetUserId, product_id: proxyProduct.id } }
                });
                if (proxyTarget)
                    targetData = proxyTarget;
            }
            // Fetch service master for multipliers
            if (isEit) {
                const svs = await prisma.eitService.findFirst();
                if (svs)
                    multipliers = { lead_q1: svs.lead_q1_multiplier };
            }
            else {
                const svs = await prisma.imService.findFirst();
                if (svs)
                    multipliers = { lead_q1: svs.lead_q1_multiplier };
            }
        }
        const reports = await prisma.swatPerformance.findMany({
            where,
            orderBy: { date: 'asc' },
            include: {
                product: { select: { name: true } }
            }
        });
        // Group by day of month (1-31) and sum if multiple records exist on the same day
        const dailyData = {};
        reports.forEach(report => {
            const day = dayjs_1.default.utc(report.date).date();
            if (!dailyData[day]) {
                dailyData[day] = { ...report };
            }
            else {
                for (const key in report) {
                    if (typeof report[key] === 'number') {
                        // Skip summing ID and foreign key fields
                        if (!['id', 'user_id', 'product_id', 'service_department', 'sales_stage_id'].includes(key)) {
                            dailyData[day][key] = (dailyData[day][key] || 0) + (report[key] || 0);
                        }
                    }
                }
            }
        });
        // Fetch "Order Won" leads for the selected user in the selected month
        const leadsWhere = {
            lead_owner_id: targetUserId,
            updated_at: {
                gte: startOfMonth,
                lte: endOfMonth
            },
            sales_stage: { name: 'Order Won' }
        };
        if (type === 'Product' && product_id) {
            leadsWhere.product_id = parseInt(product_id);
        }
        else if (type === 'EIT Service') {
            leadsWhere.eit_service_id = { not: null };
        }
        else if (type === 'IM Service') {
            leadsWhere.im_service_id = { not: null };
        }
        const orderWonLeads = await prisma.lead.findMany({
            where: leadsWhere,
            select: { id: true, updated_at: true, sales_device: true, device_count: true, license_count: true }
        });
        // Group order won leads by day with count and sum of sales devices
        const leadsDailyData = {};
        const salesDeviceDailyData = {};
        orderWonLeads.forEach(lead => {
            const day = dayjs_1.default.utc(lead.updated_at).date();
            leadsDailyData[day] = (leadsDailyData[day] || 0) + 1;
            const count = lead.sales_device || parseInt(lead.device_count || lead.license_count || '0') || 0;
            salesDeviceDailyData[day] = (salesDeviceDailyData[day] || 0) + count;
        });
        // Build CallTracker base filters (user + date range)
        const callTrackerBase = {
            user_id: targetUserId,
            date: { gte: startOfMonth, lte: endOfMonth }
        };
        if (type === 'Product' && product_id) {
            callTrackerBase.product_id = parseInt(product_id);
        }
        else if (type === 'EIT Service') {
            callTrackerBase.OR = [{ eit_service_id: { not: null } }, { product_or_service: 'EIT Service' }];
        }
        else if (type === 'IM Service') {
            callTrackerBase.OR = [{ im_service_id: { not: null } }, { product_or_service: 'IM Service' }];
        }
        // Emails Sent per day
        const emailsSent = await prisma.callTracker.findMany({
            where: { ...callTrackerBase, email_status_id: { not: null } },
            select: { date: true }
        });
        const emailDailyData = {};
        emailsSent.forEach(r => {
            const day = dayjs_1.default.utc(r.date).date();
            emailDailyData[day] = (emailDailyData[day] || 0) + 1;
        });
        // LinkedIn Requests Sent per day
        const linkedinRequests = await prisma.callTracker.findMany({
            where: { ...callTrackerBase, linkedin_sent: true },
            select: { date: true }
        });
        const linkedinReqDailyData = {};
        linkedinRequests.forEach(r => {
            const day = dayjs_1.default.utc(r.date).date();
            linkedinReqDailyData[day] = (linkedinReqDailyData[day] || 0) + 1;
        });
        // Calls Achieved per day
        const callsAchieved = await prisma.callTracker.findMany({
            where: callTrackerBase,
            select: { date: true }
        });
        const callsAchievedDailyData = {};
        callsAchieved.forEach(r => {
            const day = dayjs_1.default.utc(r.date).date();
            callsAchievedDailyData[day] = (callsAchievedDailyData[day] || 0) + 1;
        });
        // Leads Created per day (Q1 Direct Lead)
        const leadsCreatedWhere = {
            lead_owner_id: targetUserId,
            created_at: { gte: startOfMonth, lte: endOfMonth }
        };
        if (type === 'Product' && product_id)
            leadsCreatedWhere.product_id = parseInt(product_id);
        else if (type === 'EIT Service')
            leadsCreatedWhere.eit_service_id = { not: null };
        else if (type === 'IM Service')
            leadsCreatedWhere.im_service_id = { not: null };
        const leadsCreated = await prisma.lead.findMany({
            where: leadsCreatedWhere,
            select: { created_at: true }
        });
        const leadsCreatedDailyData = {};
        leadsCreated.forEach(l => {
            const day = dayjs_1.default.utc(l.created_at).date();
            leadsCreatedDailyData[day] = (leadsCreatedDailyData[day] || 0) + 1;
        });
        // Quarterly Leads Count logic (Leads currently in that quadrant, grouped by movement date)
        const qLeadsWhere = {
            lead_owner_id: targetUserId,
            quadrant_updated_at: { gte: startOfMonth, lte: endOfMonth },
            quadrant: { in: ['Q1', 'Q2', 'Q3', 'Q4'] }
        };
        if (type === 'Product' && product_id)
            qLeadsWhere.product_id = parseInt(product_id);
        else if (type === 'EIT Service')
            qLeadsWhere.eit_service_id = { not: null };
        else if (type === 'IM Service')
            qLeadsWhere.im_service_id = { not: null };
        const qLeads = await prisma.lead.findMany({
            where: qLeadsWhere,
            select: { quadrant_updated_at: true, created_at: true, quadrant: true, device_count: true, license_count: true }
        });
        const q1LeadsDailyData = {};
        const q2LeadsDailyData = {};
        const q3LeadsDailyData = {};
        const q4LeadsDailyData = {};
        const q1DevicesDailyData = {};
        const q2DevicesDailyData = {};
        const q3DevicesDailyData = {};
        const q4DevicesDailyData = {};
        qLeads.forEach(l => {
            const dateToUse = l.quadrant_updated_at || l.created_at;
            const day = dayjs_1.default.utc(dateToUse).date();
            const count = parseInt(l.device_count || l.license_count || '0') || 0;
            if (l.quadrant === 'Q1') {
                q1LeadsDailyData[day] = (q1LeadsDailyData[day] || 0) + 1;
                q1DevicesDailyData[day] = (q1DevicesDailyData[day] || 0) + count;
            }
            else if (l.quadrant === 'Q2') {
                q2LeadsDailyData[day] = (q2LeadsDailyData[day] || 0) + 1;
                q2DevicesDailyData[day] = (q2DevicesDailyData[day] || 0) + count;
            }
            else if (l.quadrant === 'Q3') {
                q3LeadsDailyData[day] = (q3LeadsDailyData[day] || 0) + 1;
                q3DevicesDailyData[day] = (q3DevicesDailyData[day] || 0) + count;
            }
            else if (l.quadrant === 'Q4') {
                q4LeadsDailyData[day] = (q4LeadsDailyData[day] || 0) + 1;
                q4DevicesDailyData[day] = (q4DevicesDailyData[day] || 0) + count;
            }
        });
        res.json({
            month,
            user_id: targetUserId,
            monthly_targets: targetData,
            multipliers,
            dailyData,
            leadsDailyData,
            salesDeviceDailyData,
            emailDailyData,
            linkedinReqDailyData,
            callsAchievedDailyData,
            leadsCreatedDailyData,
            q1LeadsDailyData,
            q2LeadsDailyData,
            q3LeadsDailyData,
            q4LeadsDailyData,
            q1DevicesDailyData,
            q2DevicesDailyData,
            q3DevicesDailyData,
            q4DevicesDailyData
        });
    }
    catch (error) {
        console.error('Error fetching KRA monthly data:', error);
        res.status(500).json({ message: 'Error fetching KRA data' });
    }
};
exports.getKraMonthlyData = getKraMonthlyData;

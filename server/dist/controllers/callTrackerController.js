"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferStagedRecords = exports.clearAllStagedRecords = exports.deleteStagedRecords = exports.updateStagedRecord = exports.getStagedUploads = exports.bulkUpload = exports.downloadTemplate = exports.deleteCall = exports.updateCall = exports.createCall = exports.getCallById = exports.getCalls = void 0;
exports.createCallTrackerFromEnquiry = createCallTrackerFromEnquiry;
const client_1 = require("@prisma/client");
const leadHelper_1 = require("../utils/leadHelper");
const companyHelper_1 = require("../utils/companyHelper");
const teamScope_1 = require("../utils/teamScope");
const XLSX = __importStar(require("xlsx"));
const exceljs_1 = __importDefault(require("exceljs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dayjs_1 = __importDefault(require("dayjs"));
const customParseFormat_1 = __importDefault(require("dayjs/plugin/customParseFormat"));
dayjs_1.default.extend(customParseFormat_1.default);
const prisma = new client_1.PrismaClient();
// Accepted import date formats, most-specific/DD-MM first so an ambiguous
// value like "02/08/2026" is always read as DD/MM/YYYY (Aug 2), never MM/DD.
// D/M variants let users type unpadded dates (e.g. "2/8/2026"); dayjs still
// parses them to a real Date, which we then re-format as DD/MM/YYYY on save.
const IMPORT_DATE_FORMATS = [
    'DD/MM/YYYY', 'D/MM/YYYY', 'DD/M/YYYY', 'D/M/YYYY',
    'YYYY-MM-DD',
    'DD-MM-YYYY', 'D-M-YYYY',
    'MM/DD/YYYY'
];
/**
 * Parse a date cell coming from an uploaded Excel file. Cells that are
 * genuinely formatted as dates in Excel (as our template's Date column is,
 * via data validation) come through as JS Date objects when the workbook is
 * read with `cellDates: true` — those can't be run through dayjs's strict
 * format-array parser (it expects a string), so they're accepted directly.
 * Anything still typed as a string (older templates, pasted text) goes
 * through the strict DD/MM/YYYY-first format list as before. A lingering
 * numeric Excel serial (cellDates fallback edge cases) is decoded via
 * XLSX's own date-code parser rather than left to fail.
 */
const parseImportDate = (raw) => {
    if (raw === null || raw === undefined || raw === '')
        return null;
    if (raw instanceof Date) {
        return isNaN(raw.getTime()) ? null : raw;
    }
    if (typeof raw === 'number') {
        const code = XLSX.SSF.parse_date_code(raw);
        if (!code)
            return null;
        const d = new Date(code.y, code.m - 1, code.d, code.H || 0, code.M || 0, code.S || 0);
        return isNaN(d.getTime()) ? null : d;
    }
    const parsed = (0, dayjs_1.default)(raw, IMPORT_DATE_FORMATS, true);
    return parsed.isValid() ? parsed.toDate() : null;
};
/**
 * Get calls with filters
 */
const getCalls = async (req, res) => {
    try {
        const { dateFrom, dateTo, productId, industryId, callStatusId, salespersonId, nextFollowUpDate, nextFollowUpFrom, nextFollowUpTo, notMovedToPipeline, company_name, page, pageSize } = req.query;
        const user = req.user;
        console.log('Fetching calls for user:', user.email, 'Role:', user.role);
        console.log('Filters:', req.query);
        let where = {};
        let allowedUserIds = null; // null = no restriction (CEO)
        // Role-based access control: determine the scope of users this role can see
        if (user.role === client_1.Role.SalesPerson) {
            allowedUserIds = [user.id];
        }
        else if (user.role === client_1.Role.SalesManager) {
            allowedUserIds = [user.id, ...await (0, teamScope_1.getSubordinateIds)(user.id)];
        }
        // CEO: allowedUserIds stays null → no user restriction
        // Owner filter: if specific ownerIds are requested, apply them (gated by role scope)
        if (salespersonId && user.role !== client_1.Role.SalesPerson) {
            const idList = Array.isArray(salespersonId)
                ? salespersonId.map(id => parseInt(id)).filter(n => !isNaN(n))
                : String(salespersonId).split(',').filter(Boolean).map(id => parseInt(id)).filter(n => !isNaN(n));
            if (idList.length > 0) {
                const allowed = allowedUserIds === null
                    ? idList
                    : idList.filter(id => allowedUserIds.includes(id));
                if (allowed.length === 0) {
                    where.user_id = -1;
                }
                else if (allowed.length === 1) {
                    where.user_id = allowed[0];
                }
                else {
                    where.user_id = { in: allowed };
                }
            }
        }
        else if (allowedUserIds !== null) {
            where.user_id = { in: allowedUserIds };
        }
        // else CEO with no filter → no user_id restriction
        // Apply filters
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom)
                where.date.gte = (0, dayjs_1.default)(dateFrom).startOf('day').toDate();
            if (dateTo)
                where.date.lte = (0, dayjs_1.default)(dateTo).endOf('day').toDate();
        }
        if (productId)
            where.product_id = parseInt(productId);
        if (industryId)
            where.industry_id = parseInt(industryId);
        if (callStatusId)
            where.call_status_id = parseInt(callStatusId);
        if (nextFollowUpDate) {
            where.next_follow_up_date = {
                gte: new Date(nextFollowUpDate),
                lt: new Date(new Date(nextFollowUpDate).getTime() + 24 * 60 * 60 * 1000)
            };
        }
        else if (nextFollowUpFrom || nextFollowUpTo) {
            // Follow-up window, e.g. the dashboard's "This Week's Call Activities" card
            where.next_follow_up_date = {};
            if (nextFollowUpFrom)
                where.next_follow_up_date.gte = (0, dayjs_1.default)(nextFollowUpFrom).startOf('day').toDate();
            if (nextFollowUpTo)
                where.next_follow_up_date.lte = (0, dayjs_1.default)(nextFollowUpTo).endOf('day').toDate();
        }
        // Calls not yet routed into the pipeline (Move to Pipeline is empty)
        if (notMovedToPipeline === '1') {
            where.pipeline_action = null;
        }
        if (company_name) {
            where.company_name = { contains: company_name };
        }
        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageSizeNum = Math.min(100, Math.max(5, parseInt(pageSize) || 10));
        const skip = (pageNum - 1) * pageSizeNum;
        const [calls, total] = await Promise.all([
            prisma.callTracker.findMany({
                where,
                include: {
                    product: true,
                    industry: true,
                    lead_source: true,
                    source_of_db: true,
                    call_status: true,
                    email_status: true,
                    user: {
                        select: { id: true, first_name: true, last_name: true }
                    },
                    lead: {
                        select: { id: true }
                    }
                },
                orderBy: [{ id: 'desc' }],
                skip,
                take: pageSizeNum,
            }),
            prisma.callTracker.count({ where })
        ]);
        console.log(`[DEBUG] Found ${total} total calls, returning page ${pageNum} of ${Math.ceil(total / pageSizeNum)}`);
        res.json({
            data: calls,
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages: Math.ceil(total / pageSizeNum)
        });
    }
    catch (error) {
        console.error('Error fetching calls:', error);
        res.status(500).json({ message: 'Error fetching calls' });
    }
};
exports.getCalls = getCalls;
/**
 * Get a single call entry by ID
 */
const getCallById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = req.user;
        const call = await prisma.callTracker.findUnique({
            where: { id },
            include: {
                product: true,
                industry: true,
                lead_source: true,
                source_of_db: true,
                call_status: true,
                email_status: true,
                user: {
                    select: { first_name: true, last_name: true }
                },
                lead: {
                    select: { id: true }
                },
                enquiry: {
                    select: { id: true }
                }
            }
        });
        if (!call) {
            return res.status(404).json({ message: 'Call not found' });
        }
        // Access control: only owner or manager can see
        if (user.role === client_1.Role.SalesPerson && call.user_id !== user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json(call);
    }
    catch (error) {
        console.error('Error fetching call:', error);
        res.status(500).json({ message: 'Error fetching call details' });
    }
};
exports.getCallById = getCallById;
/**
 * Create a new call entry
 */
const createCall = async (req, res) => {
    try {
        const body = req.body;
        const user = req.user;
        console.log("CREATE CALL PAYLOAD received from fr:", body);
        // Validation
        if (!body.company_name) {
            return res.status(400).json({ message: 'Company name is required' });
        }
        if (!body.product_id) {
            return res.status(400).json({ message: 'Product is required' });
        }
        // Pick only the known scalar fields to avoid Prisma "unknown field" errors
        const data = {
            company_name: body.company_name,
            date: body.date ? new Date(body.date) : new Date(),
            location: body.location || null,
            contact_person_name: body.contact_person_name || null,
            designation: body.designation || null,
            email_address: body.email_address || null,
            personal_email: body.personal_email || null,
            mobile_no: body.mobile_no || null,
            business_potential: body.business_potential || null,
            linkedin_sent: body.linkedin_sent === true || body.linkedin_sent === 'true' || false,
            remarks: body.remarks || null,
            next_follow_up_date: body.next_follow_up_date ? new Date(body.next_follow_up_date) : null,
            follow_up_note: body.follow_up_note || null,
            follow_up_status: body.follow_up_status || 'Pending',
            user_id: user.id,
        };
        // "Move to Pipeline" dropdown: Quadrant | Nurturing | Enquiry
        const pipelineAction = body.pipeline_action || null;
        data.pipeline_action = pipelineAction;
        if (pipelineAction === 'Nurturing') {
            data.moved_to_quad = 'Nurturing';
        }
        else if (pipelineAction === 'Quadrant') {
            data.moved_to_quad = body.moved_to_quad || 'Q1';
        }
        else {
            data.moved_to_quad = null;
        }
        // Only set relation IDs if provided, otherwise nullify to handle un-selection or type changes
        data.product_id = body.product_id ? parseInt(body.product_id) : null;
        data.industry_id = body.industry_id ? parseInt(body.industry_id) : null;
        data.lead_source_id = body.lead_source_id ? parseInt(body.lead_source_id) : null;
        data.source_of_db_id = body.source_of_db_id ? parseInt(body.source_of_db_id) : null;
        data.call_status_id = body.call_status_id ? parseInt(body.call_status_id) : null;
        data.email_status_id = body.email_status_id ? parseInt(body.email_status_id) : null;
        // Set quadrant moved date if quadrant is selected
        if (data.moved_to_quad) {
            data.quadrant_moved_date = new Date();
        }
        try {
            fs_1.default.appendFileSync('f:/crm/angler_crm/server/tmp/payload_debug.log', JSON.stringify({ body, data }, null, 2) + '\n');
        }
        catch (e) { }
        const call = await prisma.callTracker.create({
            data,
            include: { call_status: true, email_status: true }
        });
        // 1. Log Call Activity
        await prisma.callActivityLog.create({
            data: {
                call_id: call.id,
                user_id: user.id,
                action_type: 'CREATE',
                action_date: data.date
            }
        });
        // 2. Log LinkedIn/Email Activity if Sent
        if (call.linkedin_sent) {
            await prisma.activityLog.create({
                data: {
                    user_id: user.id,
                    type: 'LinkedIn Sent',
                    status: 'Sent',
                    created_at: data.date
                }
            });
        }
        if (call.email_status?.name === 'Sent') {
            await prisma.activityLog.create({
                data: {
                    user_id: user.id,
                    type: 'Email Sent',
                    status: 'Sent',
                    created_at: data.date
                }
            });
        }
        // Move to Pipeline routing
        let responseCall = call;
        if (call.pipeline_action === 'Enquiry') {
            await convertToEnquiryLogic(call.id, user.id);
            responseCall = await prisma.callTracker.findUniqueOrThrow({ where: { id: call.id }, include: { call_status: true, email_status: true } });
        }
        else if (call.moved_to_quad) {
            // Conversion is driven only by an explicit "Move to Pipeline" selection —
            // Call Status ("Converted to Lead") is an outcome field, not a movement trigger.
            await convertToLeadLogic(call.id, user.id);
            responseCall = await prisma.callTracker.findUniqueOrThrow({ where: { id: call.id }, include: { call_status: true, email_status: true } });
        }
        res.status(201).json(responseCall);
    }
    catch (error) {
        console.error('Error creating call:', error);
        res.status(400).json({ message: 'Error creating call', error });
    }
};
exports.createCall = createCall;
/**
 * Update a call entry
 */
const updateCall = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const body = req.body;
        const user = req.user;
        console.log("UPDATE CALL PAYLOAD received from fr:", body);
        // Validation
        if (!body.company_name) {
            return res.status(400).json({ message: 'Company name is required' });
        }
        if (!body.product_id) {
            return res.status(400).json({ message: 'Product is required' });
        }
        // Pick only the known scalar fields to avoid Prisma "unknown field" errors
        const data = {
            company_name: body.company_name,
            date: body.date ? new Date(body.date) : undefined,
            location: body.location || null,
            contact_person_name: body.contact_person_name || null,
            designation: body.designation || null,
            email_address: body.email_address || null,
            personal_email: body.personal_email || null,
            mobile_no: body.mobile_no || null,
            business_potential: body.business_potential || null,
            linkedin_sent: body.linkedin_sent === true || body.linkedin_sent === 'true' || false,
            remarks: body.remarks || null,
            next_follow_up_date: body.next_follow_up_date ? new Date(body.next_follow_up_date) : null,
            follow_up_note: body.follow_up_note || null,
            follow_up_status: body.follow_up_status || 'Pending',
        };
        // "Move to Pipeline" dropdown: Quadrant | Nurturing | Enquiry
        const pipelineAction = body.pipeline_action || null;
        data.pipeline_action = pipelineAction;
        if (pipelineAction === 'Nurturing') {
            data.moved_to_quad = 'Nurturing';
        }
        else if (pipelineAction === 'Quadrant') {
            data.moved_to_quad = body.moved_to_quad || 'Q1';
        }
        else {
            data.moved_to_quad = null;
        }
        // Only set relation IDs if provided, otherwise nullify to handle un-selection or type changes
        data.product_id = body.product_id ? parseInt(body.product_id) : null;
        data.industry_id = body.industry_id ? parseInt(body.industry_id) : null;
        data.lead_source_id = body.lead_source_id ? parseInt(body.lead_source_id) : null;
        data.source_of_db_id = body.source_of_db_id ? parseInt(body.source_of_db_id) : null;
        data.call_status_id = body.call_status_id ? parseInt(body.call_status_id) : null;
        data.email_status_id = body.email_status_id ? parseInt(body.email_status_id) : null;
        // Update quadrant date if changed
        if (data.moved_to_quad) {
            data.quadrant_moved_date = new Date();
        }
        const previousCall = await prisma.callTracker.findUnique({
            where: { id },
            include: { email_status: true }
        });
        if (!previousCall) {
            return res.status(404).json({ message: 'Call not found' });
        }
        try {
            fs_1.default.appendFileSync('f:/crm/angler_crm/server/tmp/payload_debug.log', JSON.stringify({ action: "UPDATE", body, data }, null, 2) + '\n');
        }
        catch (e) { }
        const call = await prisma.callTracker.update({
            where: { id },
            data,
            include: { call_status: true, email_status: true, lead: true }
        });
        // 1. Log Call Activity (Every update counts as +1 per requirement)
        await prisma.callActivityLog.create({
            data: {
                call_id: call.id,
                user_id: user.id,
                action_type: 'UPDATE',
                action_date: data.date || call.date
            }
        });
        // 2. Log LinkedIn Activity if it was newly marked as sent
        if (call.linkedin_sent && !previousCall.linkedin_sent) {
            await prisma.activityLog.create({
                data: {
                    user_id: user.id,
                    type: 'LinkedIn Sent',
                    status: 'Sent',
                    created_at: data.date || call.date
                }
            });
        }
        // 3. Log Email Activity if it was newly marked as Sent
        if (call.email_status?.name === 'Sent' && previousCall.email_status?.name !== 'Sent') {
            await prisma.activityLog.create({
                data: {
                    user_id: user.id,
                    type: 'Email Sent',
                    status: 'Sent',
                    created_at: data.date || call.date
                }
            });
        }
        // Handle conversion: trigger if status is 'Converted' OR quadrant/nurturing is chosen OR enquiry is chosen
        let didConvert = false;
        if (!call.is_converted) {
            if (call.pipeline_action === 'Enquiry') {
                await convertToEnquiryLogic(call.id, user.id);
                didConvert = true;
            }
            else if (call.moved_to_quad) {
                // Only an explicit "Move to Pipeline" selection converts — Call Status is not a movement trigger.
                await convertToLeadLogic(call.id, user.id);
                didConvert = true;
            }
        }
        // Update linked lead quadrant/sales stage if moved_to_quad changed
        if (call.lead && data.moved_to_quad && data.moved_to_quad !== previousCall.moved_to_quad) {
            const leadUpdateData = {
                quadrant: data.moved_to_quad,
                quadrant_updated_at: new Date()
            };
            if (data.pipeline_action === 'Nurturing') {
                const nurturingStage = await prisma.salesStage.findFirst({ where: { name: 'Nurturing' } });
                if (nurturingStage)
                    leadUpdateData.sales_stage_id = nurturingStage.id;
                Object.assign(leadUpdateData, (0, leadHelper_1.getQualificationResetData)());
            }
            await prisma.lead.update({
                where: { id: call.lead.id },
                data: leadUpdateData
            });
            await (0, leadHelper_1.logQuadrantMovement)({
                leadId: call.lead.id,
                userId: user.id,
                oldQuadrant: previousCall.moved_to_quad,
                newQuadrant: data.moved_to_quad,
                movementType: 'MANUAL'
            });
        }
        const responseCall = didConvert
            ? await prisma.callTracker.findUniqueOrThrow({ where: { id: call.id }, include: { call_status: true, email_status: true, lead: true } })
            : call;
        res.json(responseCall);
    }
    catch (error) {
        console.error('Error updating call:', error);
        res.status(400).json({ message: 'Error updating call', error });
    }
};
exports.updateCall = updateCall;
/**
 * Delete a call entry
 */
const deleteCall = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = req.user;
        const call = await prisma.callTracker.findUnique({ where: { id } });
        if (!call) {
            return res.status(404).json({ message: 'Call not found' });
        }
        // Role-based access: SalesPerson can only delete own records
        if (user.role === client_1.Role.SalesPerson && call.user_id !== user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Prevent deletion of converted calls (linked lead exists)
        if (call.is_converted) {
            return res.status(400).json({ message: 'Cannot delete a call that has been converted to a lead' });
        }
        // Delete related CallActivityLog entries first (no Prisma FK defined)
        await prisma.$executeRaw `DELETE FROM callactivitylog WHERE call_id = ${id}`;
        await prisma.callTracker.delete({ where: { id } });
        res.json({ message: 'Call deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting call:', error);
        res.status(500).json({ message: 'Error deleting call' });
    }
};
exports.deleteCall = deleteCall;
/**
 * Helper logic to convert Call to Lead
 */
async function convertToLeadLogic(callId, userId) {
    const call = await prisma.callTracker.findUnique({
        where: { id: callId },
        include: { call_status: true }
    });
    if (!call || call.is_converted)
        return;
    // 1. Find or create client company (Client Company Master — never Company Master)
    const clientCompanyId = await (0, companyHelper_1.findOrCreateClientCompany)(call.company_name);
    // 2. Create Lead
    const leadData = {
        created_by_id: userId,
        lead_owner_id: userId,
        first_name: call.contact_person_name || 'Converted Prospect',
        company_name: call.company_name,
        client_company_id: clientCompanyId,
        industry_id: call.industry_id,
        product_id: call.product_id,
        email: call.email_address,
        mobile_number: call.mobile_no,
        quadrant: call.moved_to_quad || 'Q4',
        call_tracker_id: call.id,
        // Map other fields as needed
    };
    // "Move to Nurturing": assign the Nurturing Sales Stage and apply the
    // standard qualification reset (mirrors leadController's Nurturing path).
    if (call.pipeline_action === 'Nurturing') {
        const nurturingStage = await prisma.salesStage.findFirst({ where: { name: 'Nurturing' } });
        if (nurturingStage)
            leadData.sales_stage_id = nurturingStage.id;
        Object.assign(leadData, (0, leadHelper_1.getQualificationResetData)());
    }
    const lead = await prisma.lead.create({ data: leadData });
    // 3. Mark call as converted
    await prisma.callTracker.update({
        where: { id: callId },
        data: {
            is_converted: true,
            converted_at: new Date()
        }
    });
    // Log initial quadrant history
    await (0, leadHelper_1.logQuadrantMovement)({
        leadId: lead.id,
        userId: userId,
        oldQuadrant: null,
        newQuadrant: lead.quadrant,
        movementType: 'AUTO'
    });
    return lead;
}
/**
 * Helper logic to convert Call to Enquiry ("Move to Enquiry" pipeline option).
 * No Lead or Quadrant is created — the record moves to the Enquiry Tracker instead.
 */
async function convertToEnquiryLogic(callId, userId) {
    const call = await prisma.callTracker.findUnique({ where: { id: callId } });
    if (!call || call.is_converted)
        return;
    const enquiry = await prisma.enquiry.create({
        data: {
            date: call.date,
            company_name: call.company_name,
            contact_name: call.contact_person_name,
            mobile_number: call.mobile_no,
            email: call.email_address,
            product_id: call.product_id,
            service_department: call.service_department,
            remarks: call.remarks,
            created_by_id: userId,
            call_tracker_id: call.id,
        }
    });
    await prisma.callTracker.update({
        where: { id: callId },
        data: {
            is_converted: true,
            converted_at: new Date()
        }
    });
    return enquiry;
}
/**
 * Helper logic to create a Call Tracker entry directly from an Enquiry
 * ("Enquiry Converted To" = "Call Tracker"). Bypasses Lead creation and
 * links the new Call Tracker record back to the originating Enquiry.
 */
async function createCallTrackerFromEnquiry(enquiry, userId) {
    // Owner of the new Call Tracker record = the Enquiry's "Lead Allocated To" user;
    // "Lead Allocated To" is often left blank, so fall back to "Enquiry Allocated To",
    // then to the user who triggered the conversion, so it always lands in someone's account.
    const ownerId = enquiry.allocated_to_id || enquiry.enquiry_allocated_to || userId;
    const data = {
        company_name: enquiry.company_name || 'Unknown',
        date: enquiry.date || new Date(),
        contact_person_name: enquiry.contact_name || null,
        email_address: enquiry.email || null,
        mobile_no: enquiry.mobile_number || null,
        remarks: enquiry.remarks || null,
        product_id: enquiry.product_id || null,
        service_department: enquiry.service_department || null,
        lead_source_id: enquiry.lead_source_id || null,
        user_id: ownerId,
    };
    const call = await prisma.callTracker.create({ data });
    await prisma.callActivityLog.create({
        data: {
            call_id: call.id,
            user_id: userId,
            action_type: 'CREATE',
            action_date: data.date
        }
    });
    await prisma.enquiry.update({
        where: { id: enquiry.id },
        data: { call_tracker_id: call.id }
    });
    return call;
}
/**
 * Download Excel Template for Bulk Upload
 * Generates an Excel file with dropdown validations for all master-dependent fields.
 * A hidden "Masters" sheet stores the dropdown source values.
 */
const downloadTemplate = async (req, res) => {
    try {
        const [products, industries, sources] = await Promise.all([
            prisma.product.findMany({ where: { is_active: true }, select: { name: true }, orderBy: { name: 'asc' } }),
            prisma.industry.findMany({ where: { is_active: true }, select: { name: true }, orderBy: { name: 'asc' } }),
            prisma.sourceOfDB.findMany({ where: { is_active: true }, select: { name: true }, orderBy: { name: 'asc' } }),
        ]);
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = 'Angler CRM';
        // --- Hidden Masters sheet (stores dropdown source values) ---
        const mastersSheet = workbook.addWorksheet('Masters', { state: 'hidden' });
        ['Product', 'Industry', 'Source of DB'].forEach((h, i) => {
            mastersSheet.getCell(1, i + 1).value = h;
        });
        const maxLen = Math.max(products.length, industries.length, sources.length);
        for (let i = 0; i < maxLen; i++) {
            if (products[i])
                mastersSheet.getCell(i + 2, 1).value = products[i].name;
            if (industries[i])
                mastersSheet.getCell(i + 2, 2).value = industries[i].name;
            if (sources[i])
                mastersSheet.getCell(i + 2, 3).value = sources[i].name;
        }
        // --- Main template sheet ---
        const sheet = workbook.addWorksheet('Call Tracker Upload');
        const headers = [
            'S No', 'Date', 'Product', 'Industry', 'Source of DB', 'Company Name',
            'Location', 'Contact Person Name', 'Designation', 'Company Email', 'Personal Email',
            'Mobile No',
        ];
        // Header row styling
        const headerRow = sheet.getRow(1);
        headerRow.height = 25;
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
        // Column widths
        [6, 14, 22, 22, 18, 28, 15, 24, 18, 30, 30, 14, 16, 12, 18, 20, 18, 14, 35]
            .forEach((w, i) => { sheet.getColumn(i + 1).width = w; });
        // Freeze header row
        sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
        // Date column: force dd/mm/yyyy display so whatever a user types
        // (e.g. "2/8/2026") is always shown/stored in the template's default
        // DD/MM/YYYY format, matching what bulkUpload expects on import.
        sheet.getColumn(2).numFmt = 'dd/mm/yyyy';
        // Sample row
        sheet.getRow(2).getCell(1).value = 1;
        sheet.getRow(2).getCell(2).value = (0, dayjs_1.default)().startOf('day').toDate();
        // --- Data Validations (rows 2–1001) ---
        const LAST_ROW = 1001;
        // Restrict Date column to actual date values (blocks stray text/typos)
        sheet.dataValidations.add(`B2:B${LAST_ROW}`, {
            type: 'date', operator: 'greaterThan', formulae: [new Date(1900, 0, 1)],
            allowBlank: true, showErrorMessage: true, errorStyle: 'warning',
            errorTitle: 'Invalid Date', error: 'Please enter a valid date (DD/MM/YYYY).',
        });
        if (products.length > 0) {
            sheet.dataValidations.add(`C2:C${LAST_ROW}`, {
                type: 'list', allowBlank: true,
                formulae: [`Masters!$A$2:$A$${products.length + 1}`],
                showErrorMessage: true, errorStyle: 'warning',
                errorTitle: 'Invalid Product', error: 'Please select a valid product from the dropdown list.',
            });
        }
        if (industries.length > 0) {
            sheet.dataValidations.add(`D2:D${LAST_ROW}`, {
                type: 'list', allowBlank: true,
                formulae: [`Masters!$B$2:$B$${industries.length + 1}`],
                showErrorMessage: true, errorStyle: 'warning',
                errorTitle: 'Invalid Industry', error: 'Please select a valid industry from the dropdown list.',
            });
        }
        if (sources.length > 0) {
            sheet.dataValidations.add(`E2:E${LAST_ROW}`, {
                type: 'list', allowBlank: true,
                formulae: [`Masters!$C$2:$C$${sources.length + 1}`],
                showErrorMessage: true, errorStyle: 'warning',
                errorTitle: 'Invalid Source of DB', error: 'Please select a valid source from the dropdown list.',
            });
        }
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=CallTracker_Template.xlsx');
        res.send(buffer);
    }
    catch (error) {
        console.error('Error generating template:', error);
        res.status(500).json({ message: 'Error generating template' });
    }
};
exports.downloadTemplate = downloadTemplate;
/**
 * Bulk Upload Call Tracker Entries
 */
const bulkUpload = async (req, res) => {
    try {
        const file = req.file;
        const user = req.user;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const fileBuffer = fs_1.default.readFileSync(file.path);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames.find(n => n === 'Call Tracker Upload')
            ?? workbook.SheetNames.find(n => n.toLowerCase() !== 'masters')
            ?? workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Excel file is empty' });
        }
        // Fetch Master Data for validation/mapping
        const [products, industries, sources, callStatuses, emailStatuses] = await Promise.all([
            prisma.product.findMany({ where: { is_active: true } }),
            prisma.industry.findMany({ where: { is_active: true } }),
            prisma.sourceOfDB.findMany({ where: { is_active: true } }),
            prisma.callStatus.findMany({ where: { is_active: true } }),
            prisma.emailStatus.findMany({ where: { is_active: true } })
        ]);
        let successCount = 0;
        let failCount = 0;
        const errors = [];
        for (const row of rows) {
            try {
                // 1. Basic empty row check
                const isEmpty = !row['Company Name'] && !row['Mobile No'] &&
                    !row['Contact Person Name'] && !row['Call Status'];
                if (isEmpty) {
                    // Skip completely empty rows without error report entry usually
                    // but the requirement says "Reject row if Entire row empty"
                    failCount++;
                    errors.push({ ...row, Error: 'Row is empty (must have Company, Mobile, Contact, or Status)' });
                    continue;
                }
                // 2. Format Conversions & Validations
                const rowData = {};
                // Date validation
                let callDate = null;
                if (row['Date']) {
                    callDate = parseImportDate(row['Date']);
                    if (!callDate) {
                        throw new Error('Invalid Date format (Use DD/MM/YYYY)');
                    }
                    if ((0, dayjs_1.default)(callDate).isAfter((0, dayjs_1.default)(), 'day')) {
                        throw new Error('Date must not be in the future');
                    }
                }
                rowData.date = callDate;
                // Product
                if (row['Product']) {
                    const prod = products.find(p => p.name.toLowerCase() === row['Product'].toString().toLowerCase());
                    if (!prod)
                        throw new Error(`Product "${row['Product']}" not found in Master`);
                    rowData.product_id = prod.id;
                }
                else {
                    rowData.product_id = null;
                }
                // Industry (Dropdown)
                if (row['Industry']) {
                    const ind = industries.find(i => i.name.toLowerCase() === row['Industry'].toString().toLowerCase());
                    if (!ind)
                        throw new Error(`Industry "${row['Industry']}" not found in Master`);
                    rowData.industry_id = ind.id;
                }
                // Source of DB (Dropdown)
                if (row['Source of DB']) {
                    const src = sources.find(s => s.name.toLowerCase() === row['Source of DB'].toString().toLowerCase());
                    if (!src)
                        throw new Error(`Source "${row['Source of DB']}" not found in Master`);
                    rowData.source_of_db_id = src.id;
                }
                // Company Name (Required for duplicate check)
                rowData.company_name = row['Company Name']?.toString().trim() || 'Unknown Company';
                // Mobile validation
                if (row['Mobile No']) {
                    const mobile = row['Mobile No'].toString().replace(/\D/g, '');
                    rowData.mobile_no = mobile;
                }
                // Company Email validation
                if (row['Company Email']) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(row['Company Email']))
                        throw new Error('Invalid Company Email format');
                    rowData.email_address = row['Company Email'];
                }
                // Personal Email validation (optional)
                if (row['Personal Email']) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(row['Personal Email']))
                        throw new Error('Invalid Personal Email format');
                    rowData.personal_email = row['Personal Email'];
                }
                // Boolean fields (Email Sent, LinkedIn Sent)
                const parseBool = (val) => {
                    if (!val)
                        return false;
                    const s = val.toString().toLowerCase();
                    return ['yes', '1', 'true'].includes(s);
                };
                // Requirement 13: Store Email Sent as boolean? 
                // Wait, database has email_status_id (ID). 
                // Requirement says: Store as boolean. 
                // But schema has email_status_id. I will map it to 'Sent' if true.
                const emailSent = parseBool(row['Email Sent']);
                if (emailSent) {
                    const sentStatus = emailStatuses.find(es => es.name.toLowerCase() === 'sent');
                    if (sentStatus)
                        rowData.email_status_id = sentStatus.id;
                }
                rowData.linkedin_sent = parseBool(row['LinkedIn conn sent']);
                // Call Status
                if (row['Call Status']) {
                    const status = callStatuses.find(s => s.name.toLowerCase() === row['Call Status'].toString().toLowerCase());
                    if (!status)
                        throw new Error(`Call Status "${row['Call Status']}" not found in Master`);
                    rowData.call_status_id = status.id;
                }
                // Next Follow Up Date
                if (row['Next Follow Up Date']) {
                    const nfDate = parseImportDate(row['Next Follow Up Date']);
                    if (!nfDate)
                        throw new Error('Invalid Next Follow Up Date format (Use DD/MM/YYYY)');
                    if (nfDate < rowData.date)
                        throw new Error('Next Follow Up Date cannot be before Call Date');
                    rowData.next_follow_up_date = nfDate;
                }
                // Moved to Quad
                if (row['Moved to Quad']) {
                    const quad = row['Moved to Quad'].toString().toUpperCase();
                    // Basic validation for Q1-Q4 or NURTURING
                    if (!['Q1', 'Q2', 'Q3', 'Q4', 'NURTURING'].includes(quad)) {
                        // User might put 'yes' or 'no' per requirement
                        if (quad === 'YES')
                            rowData.moved_to_quad = 'Q4'; // Default to Q4 if yes?
                        else if (quad === 'NO')
                            rowData.moved_to_quad = null;
                        else
                            throw new Error('Invalid Moved to Quad value (Q1-Q4, yes/no, Nurturing)');
                    }
                    else {
                        rowData.moved_to_quad = quad;
                    }
                }
                // Other fields
                rowData.location = row['Location'] || null;
                rowData.contact_person_name = row['Contact Person Name'] || null;
                rowData.designation = row['Designation'] || null;
                rowData.business_potential = row['Business Potential']?.toString() || null;
                rowData.remarks = row['Remarks']?.toString() || null;
                rowData.user_id = user.id;
                const originalRowData = JSON.stringify(row);
                const fileName = file.originalname || 'unknown';
                if (rowData.call_status_id) {
                    // Call Status is present → route directly to Call Tracker Module
                    const createData = { ...rowData };
                    delete createData.user_id;
                    const relations = [
                        { idField: 'product_id', relationName: 'product' },
                        { idField: 'industry_id', relationName: 'industry' },
                        { idField: 'source_of_db_id', relationName: 'source_of_db' },
                        { idField: 'email_status_id', relationName: 'email_status' },
                        { idField: 'call_status_id', relationName: 'call_status' }
                    ];
                    const connectionData = {
                        user: { connect: { id: user.id } }
                    };
                    relations.forEach(rel => {
                        const idValue = createData[rel.idField];
                        if (idValue && !isNaN(Number(idValue)) && Number(idValue) > 0) {
                            connectionData[rel.relationName] = { connect: { id: Number(idValue) } };
                        }
                        delete createData[rel.idField];
                    });
                    if (!createData.date)
                        createData.date = new Date();
                    const created = await prisma.callTracker.create({
                        data: { ...createData, ...connectionData },
                        include: { call_status: true, email_status: true }
                    });
                    await prisma.callActivityLog.create({
                        data: {
                            call_id: created.id,
                            user_id: user.id,
                            action_type: client_1.CallAction.CREATE,
                            action_date: created.date || new Date()
                        }
                    });
                    if (created.linkedin_sent) {
                        await prisma.activityLog.create({
                            data: { user_id: user.id, type: 'LinkedIn Sent', status: 'Sent', created_at: created.date || new Date() }
                        });
                    }
                    if (created.email_status?.name === 'Sent') {
                        await prisma.activityLog.create({
                            data: { user_id: user.id, type: 'Email Sent', status: 'Sent', created_at: created.date || new Date() }
                        });
                    }
                    // Convert only when an explicit quadrant/nurturing move is set — not on Call Status alone.
                    if (created.moved_to_quad) {
                        await convertToLeadLogic(created.id, user.id);
                    }
                }
                else {
                    // Call Status is NULL/empty → route to DB Upload Module (staging)
                    await prisma.bulkUploadStaging.create({
                        data: {
                            user_id: user.id,
                            product_id: rowData.product_id || null,
                            file_name: fileName,
                            original_row_data: originalRowData,
                            date: rowData.date || null,
                            industry_id: rowData.industry_id || null,
                            source_of_db_id: rowData.source_of_db_id || null,
                            company_name: rowData.company_name || null,
                            location: rowData.location || null,
                            contact_person_name: rowData.contact_person_name || null,
                            designation: rowData.designation || null,
                            email_address: rowData.email_address || null,
                            personal_email: rowData.personal_email || null,
                            mobile_no: rowData.mobile_no || null,
                            business_potential: rowData.business_potential || null,
                            email_status_id: rowData.email_status_id || null,
                            linkedin_sent: rowData.linkedin_sent || false,
                            next_follow_up_date: rowData.next_follow_up_date || null,
                            moved_to_quad: rowData.moved_to_quad || null,
                            remarks: rowData.remarks || null,
                        }
                    });
                }
                successCount++;
            }
            catch (err) {
                failCount++;
                errors.push({ ...row, Error: err.message });
            }
        }
        // Generate Error Report if needed
        let errorReportUrl = null;
        if (errors.length > 0) {
            // Format dates as DD/MM/YYYY in the error report for consistency
            const formattedErrors = errors.map(err => {
                const newErr = { ...err };
                if (newErr.date instanceof Date)
                    newErr.date = (0, dayjs_1.default)(newErr.date).format('DD/MM/YYYY');
                if (newErr['Date'] && (0, dayjs_1.default)(newErr['Date']).isValid())
                    newErr['Date'] = (0, dayjs_1.default)(newErr['Date']).format('DD/MM/YYYY');
                if (newErr['Next Follow Up Date'] && (0, dayjs_1.default)(newErr['Next Follow Up Date']).isValid()) {
                    newErr['Next Follow Up Date'] = (0, dayjs_1.default)(newErr['Next Follow Up Date']).format('DD/MM/YYYY');
                }
                return newErr;
            });
            const errorWs = XLSX.utils.json_to_sheet(formattedErrors);
            const errorWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(errorWb, errorWs, 'Errors');
            const errorFileName = `ErrorReport_${Date.now()}.xlsx`;
            const errorPath = path_1.default.join(__dirname, '../../uploads', errorFileName);
            XLSX.writeFile(errorWb, errorPath);
            errorReportUrl = `/uploads/${errorFileName}`;
        }
        // Cleanup uploaded file
        if (file.path && fs_1.default.existsSync(file.path)) {
            fs_1.default.unlinkSync(file.path);
        }
        res.json({
            totalRows: rows.length,
            imported: successCount,
            failed: failCount,
            errorReportUrl
        });
    }
    catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ message: 'Error processing bulk upload' });
    }
};
exports.bulkUpload = bulkUpload;
/**
 * Get Staged Bulk Uploads for Review (paginated, filtered, RBAC-aware)
 */
const getStagedUploads = async (req, res) => {
    try {
        const user = req.user;
        const { page, pageSize, uploadedById, search, location, dateFrom, dateTo, productId, industryId } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageSizeNum = Math.min(50, Math.max(5, parseInt(pageSize) || 10));
        const skip = (pageNum - 1) * pageSizeNum;
        let whereClause = { moved_to_calltracker: false, call_status_id: null };
        // Role-based default scope
        if (user.role === 'SalesPerson') {
            whereClause.user_id = user.id;
        }
        else if (user.role === 'SalesManager') {
            const uploadedByStr = uploadedById;
            if (uploadedByStr === 'all') {
                // Show all records from the manager's team (full downward tree)
                const teamIds = [user.id, ...await (0, teamScope_1.getSubordinateIds)(user.id)];
                whereClause.user_id = { in: teamIds };
            }
            else if (uploadedByStr && uploadedByStr !== '') {
                // Filter to a specific team member (validated)
                const teamIds = [user.id, ...await (0, teamScope_1.getSubordinateIds)(user.id)];
                const requestedId = parseInt(uploadedByStr);
                whereClause.user_id = teamIds.includes(requestedId) ? requestedId : user.id;
            }
            else {
                // Default: own uploads only
                whereClause.user_id = user.id;
            }
        }
        else if (user.role === 'CEO') {
            const uploadedByStr = uploadedById;
            if (uploadedByStr && uploadedByStr !== '' && uploadedByStr !== 'all') {
                whereClause.user_id = parseInt(uploadedByStr);
            }
            // empty or 'all' → no user restriction for CEO
        }
        // Text search
        if (search) {
            whereClause.AND = [
                {
                    OR: [
                        { company_name: { contains: search } },
                        { contact_person_name: { contains: search } },
                    ]
                }
            ];
        }
        // Additional filters
        if (location)
            whereClause.location = { contains: location };
        if (productId)
            whereClause.product_id = parseInt(productId);
        if (industryId)
            whereClause.industry_id = parseInt(industryId);
        if (dateFrom || dateTo) {
            whereClause.date = {};
            if (dateFrom)
                whereClause.date.gte = new Date(dateFrom);
            if (dateTo)
                whereClause.date.lte = new Date(dateTo);
        }
        const [stagedRecords, total] = await Promise.all([
            prisma.bulkUploadStaging.findMany({
                where: whereClause,
                include: {
                    user: { select: { id: true, first_name: true, last_name: true } }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: pageSizeNum,
            }),
            prisma.bulkUploadStaging.count({ where: whereClause }),
        ]);
        res.json({
            data: stagedRecords,
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages: Math.ceil(total / pageSizeNum) || 1,
        });
    }
    catch (error) {
        console.error('Error fetching staged uploads:', error);
        res.status(500).json({ message: 'Error fetching staged uploads' });
    }
};
exports.getStagedUploads = getStagedUploads;
/**
 * Update a single Staged Record's mapped data.
 * If moved_to_quad is set to 'yes', the record is transferred to CallTracker
 * and lead conversion is triggered — the staging row is then deleted.
 */
const updateStagedRecord = async (req, res) => {
    try {
        const user = req.user;
        const id = parseInt(req.params.id);
        const body = req.body;
        // Get products this user is mapped to
        const userProductTargets = await prisma.userProductTarget.findMany({
            where: { user_id: user.id },
            select: { product_id: true }
        });
        const mappedProductIds = userProductTargets.map(upt => upt.product_id);
        // Allow access if user is original uploader, mapped to the product, or CEO
        let accessFilter = { id, moved_to_calltracker: false };
        if (user.role !== 'CEO') {
            const orConditions = [{ user_id: user.id }];
            if (mappedProductIds.length > 0) {
                orConditions.push({ product_id: { in: mappedProductIds } });
            }
            accessFilter.OR = orConditions;
        }
        const record = await prisma.bulkUploadStaging.findFirst({ where: accessFilter });
        if (!record) {
            return res.status(404).json({ message: 'Record not found or already claimed' });
        }
        const resolvedQuad = body.moved_to_quad === 'yes' ? 'Q1' : (body.moved_to_quad || null);
        // Build the merged data from individual columns (no JSON parsing)
        const updated = {
            company_name: body.company_name ?? record.company_name,
            date: body.date ? new Date(body.date) : (record.date || new Date()),
            location: body.location ?? record.location,
            contact_person_name: body.contact_person_name ?? record.contact_person_name,
            designation: body.designation ?? record.designation,
            email_address: body.email_address ?? record.email_address,
            personal_email: body.personal_email ?? record.personal_email,
            mobile_no: body.mobile_no ?? record.mobile_no,
            business_potential: body.business_potential ?? record.business_potential,
            remarks: body.remarks ?? record.remarks,
            next_follow_up_date: body.next_follow_up_date
                ? new Date(body.next_follow_up_date)
                : (body.next_follow_up_date === '' ? null : record.next_follow_up_date),
            moved_to_quad: resolvedQuad,
            linkedin_sent: body.linkedin_sent !== undefined ? body.linkedin_sent : record.linkedin_sent,
            product_id: body.product_id !== undefined ? (body.product_id ? parseInt(body.product_id) : null) : record.product_id,
            industry_id: body.industry_id !== undefined ? (body.industry_id ? parseInt(body.industry_id) : null) : record.industry_id,
            source_of_db_id: body.source_of_db_id !== undefined ? (body.source_of_db_id ? parseInt(body.source_of_db_id) : null) : record.source_of_db_id,
            call_status_id: body.call_status_id !== undefined ? (body.call_status_id ? parseInt(body.call_status_id) : null) : record.call_status_id,
            email_status_id: body.email_status_id !== undefined ? (body.email_status_id ? parseInt(body.email_status_id) : null) : record.email_status_id,
        };
        // Only move to Call Tracker when Call Status is set; otherwise just update the staging record
        if (!updated.call_status_id) {
            // No call status → keep record in DB Upload, just update its fields
            await prisma.bulkUploadStaging.update({
                where: { id },
                data: {
                    company_name: updated.company_name,
                    date: updated.date,
                    location: updated.location,
                    contact_person_name: updated.contact_person_name,
                    designation: updated.designation,
                    email_address: updated.email_address,
                    personal_email: updated.personal_email,
                    mobile_no: updated.mobile_no,
                    business_potential: updated.business_potential,
                    remarks: updated.remarks,
                    next_follow_up_date: updated.next_follow_up_date,
                    moved_to_quad: updated.moved_to_quad,
                    linkedin_sent: updated.linkedin_sent,
                    product_id: updated.product_id,
                    industry_id: updated.industry_id,
                    source_of_db_id: updated.source_of_db_id,
                    email_status_id: updated.email_status_id,
                    // call_status_id remains null
                }
            });
            return res.json({ message: 'Record updated successfully.', moved: false, converted: false });
        }
        // Call Status is set → move record to Call Tracker
        const createData = { ...updated };
        delete createData.user_id;
        const relations = [
            { idField: 'product_id', relationName: 'product' },
            { idField: 'industry_id', relationName: 'industry' },
            { idField: 'source_of_db_id', relationName: 'source_of_db' },
            { idField: 'call_status_id', relationName: 'call_status' },
            { idField: 'email_status_id', relationName: 'email_status' },
        ];
        const connectionData = { user: { connect: { id: user.id } } };
        relations.forEach(rel => {
            const val = createData[rel.idField];
            if (val && !isNaN(Number(val)) && Number(val) > 0) {
                connectionData[rel.relationName] = { connect: { id: Number(val) } };
            }
            delete createData[rel.idField];
        });
        // Dates are already Date objects from individual columns; only set quadrant_moved_date if needed
        if (!createData.date)
            createData.date = new Date();
        if (resolvedQuad && !createData.quadrant_moved_date)
            createData.quadrant_moved_date = new Date();
        const created = await prisma.callTracker.create({
            data: { ...createData, ...connectionData },
            include: { call_status: true, email_status: true }
        });
        await prisma.callActivityLog.create({
            data: {
                call_id: created.id,
                user_id: user.id,
                action_type: client_1.CallAction.CREATE,
                action_date: created.date || new Date()
            }
        });
        if (created.linkedin_sent) {
            await prisma.activityLog.create({
                data: { user_id: user.id, type: 'LinkedIn Sent', status: 'Sent', created_at: created.date || new Date() }
            });
        }
        if (created.email_status?.name === 'Sent') {
            await prisma.activityLog.create({
                data: { user_id: user.id, type: 'Email Sent', status: 'Sent', created_at: created.date || new Date() }
            });
        }
        // Conversion is driven only by an explicit "Move to Quadrant" selection.
        // Call Status ("Converted to Lead") is an outcome field and does not move the record to the pipeline.
        const isConverted = !!resolvedQuad;
        if (isConverted) {
            await convertToLeadLogic(created.id, user.id);
        }
        // Mark staging record as claimed and moved to Call Tracker (soft flag for audit trail)
        await prisma.bulkUploadStaging.update({
            where: { id },
            data: {
                moved_to_calltracker: true,
                claimed_by_id: user.id,
                moved_at: new Date()
            }
        });
        return res.json({
            message: isConverted ? 'Lead created successfully from this record.' : 'Record moved to your Call Tracker.',
            moved: true,
            converted: isConverted
        });
    }
    catch (error) {
        console.error('Error updating staged record:', error);
        res.status(500).json({ message: 'Error updating staged record' });
    }
};
exports.updateStagedRecord = updateStagedRecord;
/**
 * Delete Staged Records (Discard)
 */
const deleteStagedRecords = async (req, res) => {
    try {
        const user = req.user;
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No records selected for deletion' });
        }
        // Get products this user is mapped to
        const userProductTargets = await prisma.userProductTarget.findMany({
            where: { user_id: user.id },
            select: { product_id: true }
        });
        const mappedProductIds = userProductTargets.map(upt => upt.product_id);
        // CEO can delete any unclaimed record; others can delete own uploads + product-mapped unclaimed records
        let deleteWhere = { id: { in: ids }, moved_to_calltracker: false };
        if (user.role !== 'CEO') {
            const orConditions = [{ user_id: user.id }];
            if (mappedProductIds.length > 0) {
                orConditions.push({ product_id: { in: mappedProductIds } });
            }
            deleteWhere.OR = orConditions;
        }
        await prisma.bulkUploadStaging.deleteMany({ where: deleteWhere });
        res.json({ message: 'Records deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting staged records:', error);
        res.status(500).json({ message: 'Error deleting staged records' });
    }
};
exports.deleteStagedRecords = deleteStagedRecords;
/**
 * Delete ALL Staged Records for the current user
 */
const clearAllStagedRecords = async (req, res) => {
    try {
        const user = req.user;
        await prisma.bulkUploadStaging.deleteMany({
            where: { user_id: user.id, moved_to_calltracker: false }
        });
        res.json({ message: 'All staged records cleared successfully' });
    }
    catch (error) {
        console.error('Error clearing staged records:', error);
        res.status(500).json({ message: 'Error clearing staged records' });
    }
};
exports.clearAllStagedRecords = clearAllStagedRecords;
/**
 * Transfer Staged Records to Active Call Tracker
 */
const transferStagedRecords = async (req, res) => {
    try {
        const user = req.user;
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No records selected for transfer' });
        }
        // Get products this user is mapped to
        const userProductTargets = await prisma.userProductTarget.findMany({
            where: { user_id: user.id },
            select: { product_id: true }
        });
        const mappedProductIds = userProductTargets.map(upt => upt.product_id);
        // Allow transfer of own uploads + product-mapped unclaimed records
        let transferWhere = { id: { in: ids }, has_validation_error: false, moved_to_calltracker: false };
        if (user.role !== 'CEO') {
            const orConditions = [{ user_id: user.id }];
            if (mappedProductIds.length > 0) {
                orConditions.push({ product_id: { in: mappedProductIds } });
            }
            transferWhere.OR = orConditions;
        }
        const stagedRecords = await prisma.bulkUploadStaging.findMany({
            where: transferWhere
        });
        if (stagedRecords.length === 0) {
            return res.status(400).json({ message: 'None of the selected records are valid for transfer' });
        }
        let transferredCount = 0;
        let duplicateCount = 0;
        let failCount = 0;
        const successfullyTransferredIds = [];
        for (const record of stagedRecords) {
            try {
                // Read directly from individual columns (no JSON parsing)
                let rowData = {
                    date: record.date || new Date(),
                    company_name: record.company_name,
                    location: record.location,
                    contact_person_name: record.contact_person_name,
                    designation: record.designation,
                    email_address: record.email_address,
                    personal_email: record.personal_email,
                    mobile_no: record.mobile_no,
                    business_potential: record.business_potential,
                    remarks: record.remarks,
                    next_follow_up_date: record.next_follow_up_date,
                    moved_to_quad: record.moved_to_quad,
                    linkedin_sent: record.linkedin_sent,
                    product_id: record.product_id,
                    industry_id: record.industry_id,
                    source_of_db_id: record.source_of_db_id,
                    call_status_id: record.call_status_id,
                    email_status_id: record.email_status_id,
                };
                // Ownership transfers to the user performing the transfer
                const finalUserId = user.id;
                // Map of scalar ID fields to relation names in CallTracker model
                const relations = [
                    { idField: 'product_id', relationName: 'product' },
                    { idField: 'industry_id', relationName: 'industry' },
                    { idField: 'source_of_db_id', relationName: 'source_of_db' },
                    { idField: 'email_status_id', relationName: 'email_status' },
                    { idField: 'call_status_id', relationName: 'call_status' }
                ];
                const createData = { ...rowData };
                const connectionData = {
                    user: { connect: { id: finalUserId } }
                };
                relations.forEach(rel => {
                    const idValue = createData[rel.idField];
                    // Only connect if we have a valid positive ID
                    if (idValue && !isNaN(Number(idValue)) && Number(idValue) > 0) {
                        connectionData[rel.relationName] = { connect: { id: Number(idValue) } };
                    }
                    delete createData[rel.idField];
                });
                // Create Call Tracker record using explicit connections to avoid scalar field validation errors
                const created = await prisma.callTracker.create({
                    data: {
                        ...createData,
                        ...connectionData
                    },
                    include: { call_status: true, email_status: true }
                });
                // Activity Logs
                await prisma.callActivityLog.create({
                    data: {
                        call_id: created.id,
                        user_id: user.id,
                        action_type: client_1.CallAction.CREATE,
                        action_date: created.date || new Date()
                    }
                });
                if (created.linkedin_sent) {
                    await prisma.activityLog.create({
                        data: {
                            user_id: user.id, type: 'LinkedIn Sent', status: 'Sent', created_at: created.date || new Date()
                        }
                    });
                }
                if (created.email_status?.name === 'Sent') {
                    await prisma.activityLog.create({
                        data: {
                            user_id: user.id, type: 'Email Sent', status: 'Sent', created_at: created.date || new Date()
                        }
                    });
                }
                // Conversion Logic — only an explicit "Move to Quadrant" converts; Call Status is not a movement trigger.
                if (created.moved_to_quad) {
                    await convertToLeadLogic(created.id, user.id);
                }
                successfullyTransferredIds.push(record.id);
                transferredCount++;
            }
            catch (itemError) {
                console.error(`Error transferring record ID ${record.id}:`, itemError);
                failCount++;
                // Update record with internal error message
                await prisma.bulkUploadStaging.update({
                    where: { id: record.id },
                    data: {
                        has_validation_error: true,
                        error_message: `Internal Transfer Error: ${itemError.message || 'Unknown error'}`
                    }
                });
            }
        }
        // Mark successfully transferred records as moved (soft flag for audit trail)
        if (successfullyTransferredIds.length > 0) {
            await prisma.bulkUploadStaging.updateMany({
                where: { id: { in: successfullyTransferredIds } },
                data: {
                    moved_to_calltracker: true,
                    claimed_by_id: user.id,
                    moved_at: new Date()
                }
            });
        }
        res.json({
            message: 'Transfer process complete',
            transferred: transferredCount,
            failed: failCount,
            duplicates: duplicateCount
        });
    }
    catch (error) {
        console.error('CRITICAL Error transferring staged records:', error);
        res.status(500).json({ message: 'Error transferring staged records' });
    }
};
exports.transferStagedRecords = transferStagedRecords;

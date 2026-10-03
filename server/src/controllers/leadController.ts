import { Request, Response } from 'express';
import dayjs from 'dayjs';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../lib/prisma';
import { calculateLeadScore, calculateQuadrant } from '../utils/leadScoring';
import { logQuadrantMovement, getQualificationResetData, getQuadrantStageId } from '../utils/leadHelper';
import { deleteForecastForLead } from './cashflowForecastController';
import { findOrCreateClientCompany } from '../utils/companyHelper';
import { getTeamIds, getSubordinateIds } from '../utils/teamScope';

const QUADRANT_STAGES = ['Q1', 'Q2', 'Q3', 'Q4'];
const CLOSED_SALES_STAGES = ['Order Won', 'Order Lost'];

const logErrorToFile = (error: any, context: string) => {
    try {
        const logPath = path.join(process.cwd(), 'server_error.log');
        const timestamp = new Date().toISOString();
        const message = `[${timestamp}] [${context}] ${error?.message || error}\nStack: ${error?.stack || 'N/A'}\nData: ${JSON.stringify(error, null, 2)}\n\n`;
        fs.appendFileSync(logPath, message);
    } catch (e) {
        console.error('Failed to log to file:', e);
    }
};

// Prisma model behind each lead relation, for the pre-update existence check below.
// The label is what the user is told to re-pick, so it reads as the field's name on
// the form rather than as a table.
const RELATION_MODELS: Record<string, { model: string; label: string }> = {
    owner: { model: 'user', label: 'Lead Owner' },
    company_master: { model: 'company', label: 'Company' },
    client_company: { model: 'clientCompany', label: 'Client Company' },
    sbu: { model: 'sBU', label: 'Sales SBU' },
    job_title: { model: 'jobTitle', label: 'Job Title' },
    lead_source: { model: 'leadSource', label: 'Lead Source' },
    industry: { model: 'industry', label: 'Industry' },
    country: { model: 'country', label: 'Country' },
    state: { model: 'state', label: 'State' },
    city: { model: 'city', label: 'City' },
    product: { model: 'product', label: 'Product' },
    persona: { model: 'persona', label: 'Persona' },
    avatar: { model: 'avatar', label: 'Avatar' },
    // "Where To Find Them" is a second reference into the Lead Source master.
    where_find_them: { model: 'leadSource', label: 'Where To Find Them' },
    sales_stage: { model: 'salesStage', label: 'Sales Stage' },
    next_activity: { model: 'activity', label: 'Next Activity' },
    follow_up_activity: { model: 'activity', label: 'Follow Up Activity' },
    call_tracker: { model: 'callTracker', label: 'Call Tracker' },
    vertical: { model: 'vertical', label: 'Vertical' },
};

// Returns the label of the first relation whose target row is missing, or null when
// every id is good. Checked in parallel — these are all primary-key lookups.
const findMissingRelation = async (
    connects: { field: string; relation: string; id: number }[]
): Promise<string | null> => {
    const checks = connects
        .map(c => ({ ...c, meta: RELATION_MODELS[c.relation] }))
        .filter(c => !!c.meta && !!(prisma as any)[c.meta!.model]);

    const results = await Promise.all(
        checks.map(async c => {
            try {
                const row = await (prisma as any)[c.meta!.model].findUnique({ where: { id: c.id }, select: { id: true } });
                return row ? null : c.meta!.label;
            } catch {
                // An unexpected model shape must not block a save that would otherwise
                // succeed; let Prisma's own error surface if the id really is bad.
                return null;
            }
        })
    );

    return results.find(r => r !== null) || null;
};

// Turns the Prisma failures a user can actually do something about into plain
// sentences. Anything not listed returns null and stays a 500 — an unexpected fault
// should not be dressed up as user error, and its stack is already in the log file.
const describePrismaError = (error: any): string | null => {
    const target = (t: any) => (Array.isArray(t) ? t.join(', ') : t || 'field');
    switch (error?.code) {
        case 'P2025': {
            // Nested connect to a row that is gone. Prisma's cause names the model in
            // quotes ("No 'City' record ... was found"); the rest of it is internals the
            // user cannot use, so only the name is kept.
            const model = /No '([A-Za-z]+)' record/.exec(error?.meta?.cause || '')?.[1];
            return model
                ? `The selected ${model} no longer exists. Please choose it again and save.`
                : 'A selected record no longer exists. Please re-select it and save again.';
        }
        case 'P2003':
            return `A linked record (${target(error?.meta?.field_name)}) no longer exists. Please re-select it and save again.`;
        case 'P2002':
            return `A lead with this ${target(error?.meta?.target)} already exists.`;
        case 'P2000':
            return `The value for ${target(error?.meta?.column_name)} is too long.`;
        default:
            return null;
    }
};

const findOrCreateJobTitle = async (name: string): Promise<number | null> => {
    console.log(`[DEBUG] findOrCreateJobTitle called with: "${name}"`);
    if (!name || !name.trim()) return null;
    const normalized = name.trim();

    const existing = await prisma.jobTitle.findFirst({
        where: { name: normalized }
    });

    if (existing) {
        console.log(`[DEBUG] findOrCreateJobTitle: found existing "${normalized}" with ID ${existing.id}`);
        return existing.id;
    }

    try {
        console.log(`[DEBUG] findOrCreateJobTitle: creating new "${normalized}"`);
        const newJob = await prisma.jobTitle.create({
            data: { name: normalized, is_active: true }
        });
        console.log(`[DEBUG] findOrCreateJobTitle: created new ID ${newJob.id}`);
        return newJob.id;
    } catch (e) {
        console.warn('Error creating job title, retrying find:', e);
        const retry = await prisma.jobTitle.findFirst({ where: { name: normalized } });
        return retry ? retry.id : null;
    }
};

export const createLead = async (req: Request, res: Response) => {
    try {
        // Logging
        console.log('=== CREATE LEAD REQUEST ===');
        console.log('Content-Type:', req.headers['content-type']);

        // Initialize data from body
        let data = { ...req.body };
        console.log('[DEBUG] createLead: data keys:', Object.keys(data));

        // Validate User (Auth Check)
        const user = (req as any).user;
        if (!user || !user.id) {
            console.error('Create Lead: User not found in request');
            return res.status(401).json({ error: 'User not authenticated or invalid' });
        }

        // Handle text-based masters (Job Title)
        if (data.job_title_name) {
            const jobId = await findOrCreateJobTitle(data.job_title_name);
            if (jobId) data.job_title_id = jobId;
            delete data.job_title_name;
        }

        // Auto-create Client Company from company_name
        if (data.company_name) {
            const clientCompanyId = await findOrCreateClientCompany(data.company_name);
            if (clientCompanyId) data.client_company_id = clientCompanyId;
        }

        // Handle files from multer
        const files = (req as any).files;
        if (files) {
            if (files.pain_points_files && files.pain_points_files.length > 0) {
                // Store as JSON array of paths
                const filePaths = files.pain_points_files.map((f: any) => `/uploads/${f.filename}`);
                data.pain_points_files = JSON.stringify(filePaths);
            }
            if (files.order_won_attachment && files.order_won_attachment.length > 0) {
                // Store first file as string path
                data.order_won_attachment = `/uploads/${files.order_won_attachment[0].filename}`;
            }
            if (files.post_demo_feedback_file && files.post_demo_feedback_file.length > 0) {
                // Store first file as string path
                data.post_demo_feedback_file = `/uploads/${files.post_demo_feedback_file[0].filename}`;
            }
        }

        // SANITIZATION: Fix known frontend issue where empty files are sent as {}
        if (data.pain_points_files && typeof data.pain_points_files === 'object' && !Array.isArray(data.pain_points_files)) {
            delete data.pain_points_files;
        }

        // Parse complex JSON fields (arrays/objects) coming as strings
        const jsonFields = ['contacts', 'scores', 'bant', 'collaterals'];
        jsonFields.forEach(field => {
            if (typeof data[field] === 'string') {
                try {
                    data[field] = JSON.parse(data[field]);
                } catch (e) {
                    console.warn(`Failed to parse JSON for ${field}:`, e);
                    // Don't overwrite if it fails, maybe it wasn't JSON
                }
            }
        });

        // Convert Numeric Fields
        const numericFields = [
            'company_id', 'sales_sbu_id', 'lead_owner_id', 'job_title_id', 'lead_source_id',
            'industry_id', 'country_id', 'state_id', 'city_id', 'product_id', 'persona_id',
            'avatar_id', 'where_find_them_id', 'sales_stage_id', 'next_activity_id', 'follow_up_activity_id',
            'created_by_id', 'lead_score', 'order_value', 'sales_device', 'annual_turnover', 'call_tracker_id', 'cp_score',
            'vertical_id',
            // Scores
            'reduce_cost_score', 'efficiency_score', 'automation_score', 'others_score',
            'established_need_score', 'urgency_score', 'budget_allocated_score', 'decision_maker_score',
            'competition_score', 'champion_score', 'influencer_score',
            'lead_source_quality', 'decision_contact_score', 'compliance_score'
        ];

        numericFields.forEach(field => {
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                const val = Number(data[field]);
                if (!isNaN(val)) {
                    data[field] = val;
                }
            }
        });

        // Convert Boolean Fields
        const booleanFields = [
            'telecalling_qualified', 'demo_completed', 'pilot_provided',
            'budget_yes_no', 'authority_yes_no', 'need_yes_no',
            'timeline_yes_no', 'is_farming',
            'demo_done_authority', 'post_demo_feedback_sent', 'post_demo_feedback_received',
            'probing_discussion_authority', 'direct_visit_authority', 'pilot_given',
            'mgmt_call_completed', 'utilized_mgmt_urgency', 'utilized_presales_timeline',
            'authority_champion_influencer_identified'
        ];

        booleanFields.forEach(field => {
            const value = data[field];

            // Set default false for all boolean fields to satisfy Prisma non-nullable requirement
            if (value === undefined || value === null || value === '') {
                data[field] = false;
                return;
            }

            console.log(`[DEBUG] Converting ${field}: ${value} (type: ${typeof value})`);
            const strVal = String(value).toLowerCase();
            if (strVal === 'true' || strVal === '1') {
                data[field] = true;
            } else {
                data[field] = false;
            }
        });

        // Check for calculated strings "undefined" or "null" usually sent by some frontends
        Object.keys(data).forEach(key => {
            if (data[key] === 'undefined' || data[key] === 'null' || data[key] === '') {
                delete data[key];
            }
        });

        // requires_requalification is server-controlled only
        delete data.requires_requalification;

        // Product is mandatory — mirrors the Lead Form's own check, so the
        // rule holds even for API calls that bypass the frontend.
        if (!data.product_id) {
            return res.status(400).json({ message: 'Product is required.' });
        }

        // Set Audit Info
        data.created_by_id = (req as any).user.id;
        if (!data.lead_owner_id) {
            data.lead_owner_id = (req as any).user.id;
        }

        // Date Conversion
        if (data.enquiry_date) {
            try {
                data.enquiry_date = new Date(data.enquiry_date).toISOString();
            } catch (e) {
                delete data.enquiry_date;
            }
        }

        if (data.expected_closure_date) {
            try {
                data.expected_closure_date = new Date(data.expected_closure_date).toISOString();
            } catch (e) {
                delete data.expected_closure_date;
            }
        }

        if (data.follow_up_datetime) {
            try {
                data.follow_up_datetime = new Date(data.follow_up_datetime).toISOString();
            } catch (e) { delete data.follow_up_datetime; }
        }

        if (data.next_activity_datetime) {
            try {
                data.next_activity_datetime = new Date(data.next_activity_datetime).toISOString();
            } catch (e) { delete data.next_activity_datetime; }
        }

        // Calculate Scores
        data.lead_score = calculateLeadScore(data);
        data.quadrant = calculateQuadrant(data);
        data.quadrant_updated_at = new Date(); // Always set on creation
        data.last_positive_movement_at = new Date();

        // Handle Manual Quadrant during Creation
        if (data.quadrant_manual) {
            data.quadrant = data.quadrant_manual;
            data.quadrant_updated_at = new Date().toISOString();
        }

        // Force quadrant to match terminal sales stages on creation
        if (data.sales_stage_id) {
            const terminalStage = await prisma.salesStage.findUnique({ where: { id: Number(data.sales_stage_id) }, select: { name: true } });
            if (terminalStage?.name === 'Order Won') {
                data.quadrant = 'Order Won';
                data.quadrant_updated_at = new Date();
                data.order_won_at = data.order_won_date ? new Date(data.order_won_date) : new Date();
            } else if (terminalStage?.name === 'Order Lost') {
                data.quadrant = 'Order Lost';
                data.quadrant_updated_at = new Date();
            } else if (terminalStage?.name === 'Nurturing') {
                Object.assign(data, getQualificationResetData());
                data.quadrant = 'Nurturing';
            }
        }

        // Sales Stage synchronization: any lead resolving to Q1-Q4 uses the single
        // "Quadrant" stage — Prospecting/Qualification/Proposal/Negotiation are not
        // tracked per-lead once quadrant-based scoring is active.
        if (QUADRANT_STAGES.includes(data.quadrant)) {
            const quadrantStageId = await getQuadrantStageId();
            if (quadrantStageId) data.sales_stage_id = quadrantStageId;
        }

        // Sanitise contacts strictly to avoid Prisma validation errors from extra UI fields
        let contactsData: any[] = [];
        if (req.body.contacts) {
            try {
                const parsedContacts = typeof req.body.contacts === 'string' ? JSON.parse(req.body.contacts) : req.body.contacts;
                if (Array.isArray(parsedContacts)) {
                    contactsData = parsedContacts.map((c: any) => ({
                        name: c.name || null,
                        designation: c.designation || null,
                        email: c.email || null,
                        contact_mobile: c.contact_mobile || null,
                        whatsapp: c.whatsapp || null,
                        avatar_id: (c.avatar_id && c.avatar_id !== '' && c.avatar_id !== 'null') ? Number(c.avatar_id) : null,
                        persona_id: (c.persona_id && c.persona_id !== '' && c.persona_id !== 'null') ? Number(c.persona_id) : null
                    }));
                }
            } catch (e) {
                console.warn('Failed to parse contacts in createLead', e);
            }
        }

        // Collaterals relation
        let collateralsData: any = undefined;
        if (req.body.collaterals) {
            try {
                const parsedCollaterals = typeof req.body.collaterals === 'string' ? JSON.parse(req.body.collaterals) : req.body.collaterals;
                if (Array.isArray(parsedCollaterals)) {
                    collateralsData = {
                        connect: parsedCollaterals.map((id: any) => ({ id: Number(id) }))
                    };
                }
            } catch (e) { console.warn('Failed to parse collaterals in createLead', e); }
        }

        // Pricing Negotiation Log
        let pricingNegotiationsData: any = undefined;
        if (req.body.new_negotiation_log) {
            pricingNegotiationsData = {
                create: [{
                    details: req.body.new_negotiation_log,
                    created_by: (req as any).user.id,
                    date: new Date()
                }]
            };
        }

        // Extract IDs for explicit connection to bypass validation errors with scalar fields
        // We MUST remove these from 'data' to avoid "Unknown argument" or "Duplicate argument" errors
        const relationLinks: any = {};
        const connections = [
            { field: 'created_by_id', relation: 'creator' },
            { field: 'lead_owner_id', relation: 'owner' },
            { field: 'company_id', relation: 'company_master' },
            { field: 'client_company_id', relation: 'client_company' },
            { field: 'sales_sbu_id', relation: 'sbu' },
            { field: 'job_title_id', relation: 'job_title' },
            { field: 'lead_source_id', relation: 'lead_source' },
            { field: 'industry_id', relation: 'industry' },
            { field: 'country_id', relation: 'country' },
            { field: 'state_id', relation: 'state' },
            { field: 'city_id', relation: 'city' },
            { field: 'product_id', relation: 'product' },
            { field: 'persona_id', relation: 'persona' },
            { field: 'avatar_id', relation: 'avatar' },
            { field: 'where_find_them_id', relation: 'where_find_them' },
            { field: 'sales_stage_id', relation: 'sales_stage' },
            { field: 'next_activity_id', relation: 'next_activity' },
            { field: 'follow_up_activity_id', relation: 'follow_up_activity' },
            { field: 'call_tracker_id', relation: 'call_tracker' },
            { field: 'vertical_id', relation: 'vertical' }
        ];

        // Ids that are about to be connected, so they can be checked before the create
        // runs — mirrors updateLead's pendingConnects check, so a stale/deleted master
        // record (e.g. a City removed after the form loaded) is named in the response
        // instead of surfacing as a raw Prisma P2025 that reads like an internal error.
        const pendingConnects: { field: string; relation: string; id: number }[] = [];

        connections.forEach(conn => {
            const val = data[conn.field];
            // ALWAYS delete the scalar field from data to avoid Prisma "Unknown argument"
            delete data[conn.field];

            // Only connect if we have a valid positive ID
            if (val && !isNaN(Number(val)) && Number(val) > 0) {
                relationLinks[conn.relation] = { connect: { id: Number(val) } };
                pendingConnects.push({ field: conn.field, relation: conn.relation, id: Number(val) });
            }
        });

        const missingRelation = await findMissingRelation(pendingConnects);
        if (missingRelation) {
            return res.status(400).json({
                error: 'Invalid reference',
                message: `The selected ${missingRelation} no longer exists. Please choose it again and save.`,
                field: missingRelation,
            });
        }

        // Cleanup fields that shouldn't be in data directly (Relations and internal UI fields)
        const fieldsToRemove = [
            'id', 'created_at', 'updated_at',
            'company_master', 'client_company', 'sbu', 'job_title', 'lead_source', 'industry',
            'country', 'state', 'city', 'product', 'persona', 'avatar', 'owner',
            'next_activity', 'follow_up_activity', 'sales_stage', 'contacts',
            'documents', 'calls', 'score_history', 'quadrant_history',
            'milestones', 'vertical',
            'creator', 'where_find_them', 'pricing_negotiations',
            'quadrant_manual', 'quadrant_change_reason',
            'job_title_name', 'new_negotiation_log',
            'new_documents', 'follow_up_notes',
            'enquiry_date', 'order_won_date',
            'expected_order', 'forecast_expected_order_value', 'forecast_expected_order_closure_date', 'forecast_device_count', 'forecast_remarks'
        ];
        const enquiryDateRaw = data.enquiry_date;

        fieldsToRemove.forEach(f => delete data[f]);

        console.log('Final Prisma Create Data:', JSON.stringify({ ...data, ...relationLinks }, null, 2));

        const newLead = await prisma.lead.create({
            data: {
                ...data,
                ...relationLinks,
                contacts: {
                    create: contactsData
                },
                collaterals: collateralsData,
                pricing_negotiations: pricingNegotiationsData
            }
        });

        // Create initial FollowUpLog if details provided
        // Store enquiry_date via raw SQL (field in schema but Prisma client not yet regenerated)
        if (enquiryDateRaw && (newLead as any).id) {
            try {
                await prisma.$executeRawUnsafe('UPDATE `lead` SET `enquiry_date` = ? WHERE `id` = ?', new Date(enquiryDateRaw), (newLead as any).id);
            } catch (e: any) { console.warn('[enquiry_date] store failed:', e.message); }
        }

        let latestFollowUpLogId = null;
        // Only log if at least one follow-up field is truthy
        if (newLead.next_activity_id || newLead.follow_up_datetime) {
            try {
                // Activity Type reflects whatever the user picked in the form's
                // (only) "Next Activity" control — see the matching note in
                // updateLead for why follow_up_activity_id is not used here.
                const log = await prisma.followUpLog.create({
                    data: {
                        lead_id: newLead.id,
                        activity_id: newLead.next_activity_id || null,
                        next_activity_id: newLead.next_activity_id || null,
                        sales_stage_id: newLead.sales_stage_id || null, // Capture start stage
                        date: newLead.follow_up_datetime || new Date(),
                        notes: req.body.follow_up_notes || 'Initial activity log',
                        created_by_id: user.id
                    }
                });
                latestFollowUpLogId = log.id;
            } catch (e) {
                console.error('Failed to create initial follow-up log:', e);
            }
        }

        // If quadrant was manually set, log it in history
        if (req.body.quadrant_manual) {
            await logQuadrantMovement({
                leadId: newLead.id,
                userId: user.id,
                oldQuadrant: null,
                newQuadrant: newLead.quadrant,
                movementType: 'MANUAL'
            });
        }

        res.status(201).json({ ...newLead, latestFollowUpLogId });
    } catch (error: any) {
        console.error('CRITICAL: Error creating lead:', error);
        logErrorToFile(error, 'createLead');

        const friendly = describePrismaError(error);
        // A cause the user can act on is a 400 with the plain-English reason, not a
        // 500 with "an internal server error occurred" — see describePrismaError.
        if (friendly) {
            return res.status(400).json({ error: 'Failed to create lead', message: friendly });
        }

        res.status(500).json({
            error: 'Failed to create lead',
            message: 'An internal server error occurred while creating the lead.',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const updateLead = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = (req as any).user;

        const oldLead = await prisma.lead.findUnique({
            where: { id },
            include: {
                sales_stage: true,
                follow_up_logs: { orderBy: { created_at: 'desc' }, take: 1 }
            }
        });

        if (!oldLead) return res.status(404).json({ error: 'Lead not found' });

        // BLOCK updates if lead is already in Order Won stage
        if (oldLead.sales_stage?.name === 'Order Won') {
            return res.status(403).json({
                error: 'Update Forbidden',
                message: 'This lead is frozen because it is in the Order Won stage.'
            });
        }

        // Permission check: only CEO, own leads, or subordinates' leads (full downward tree)
        if (user.role !== 'CEO') {
            const subordinateIds = new Set(await getSubordinateIds(user.id));
            const canEdit = (oldLead as any).lead_owner_id === user.id ||
                            subordinateIds.has((oldLead as any).lead_owner_id);
            if (!canEdit) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'You do not have permission to edit this lead.'
                });
            }
        }

        let data = { ...req.body };

        // Handle text-based masters (Job Title)
        if (data.job_title_name) {
            const jobId = await findOrCreateJobTitle(data.job_title_name);
            if (jobId) data.job_title_id = jobId;
            delete data.job_title_name;
        }

        // Auto-create Client Company from company_name
        if (data.company_name) {
            const clientCompanyId = await findOrCreateClientCompany(data.company_name);
            if (clientCompanyId) data.client_company_id = clientCompanyId;
        }

        // Handle files
        const files = (req as any).files;
        if (files) {
            if (files.pain_points_files && files.pain_points_files.length > 0) {
                const newFilePaths = files.pain_points_files.map((f: any) => `/uploads/${f.filename}`);
                let existingFiles: string[] = [];
                if (oldLead?.pain_points_files) {
                    try {
                        const parsed = JSON.parse(oldLead.pain_points_files);
                        existingFiles = Array.isArray(parsed) ? parsed : [oldLead.pain_points_files];
                    } catch (e) {
                        existingFiles = oldLead.pain_points_files.split(',').filter(s => s.trim());
                    }
                }
                data.pain_points_files = JSON.stringify([...existingFiles, ...newFilePaths]);
            }
            if (files.order_won_attachment && files.order_won_attachment.length > 0) {
                data.order_won_attachment = `/uploads/${files.order_won_attachment[0].filename}`;
            }
            if (files.post_demo_feedback_file && files.post_demo_feedback_file.length > 0) {
                data.post_demo_feedback_file = `/uploads/${files.post_demo_feedback_file[0].filename}`;
            }
        }

        // SANITIZATION: Fix known frontend issue where empty files are sent as {}
        if (data.pain_points_files && typeof data.pain_points_files === 'object' && !Array.isArray(data.pain_points_files)) {
            delete data.pain_points_files;
        }

        // Parse complex JSONs
        ['contacts', 'scores', 'bant', 'collaterals'].forEach(field => {
            if (typeof data[field] === 'string') {
                try { data[field] = JSON.parse(data[field]); } catch (e) { }
            }
        });

        // Convert numerics
        const numericFields = [
            'company_id', 'sales_sbu_id', 'lead_owner_id', 'job_title_id', 'lead_source_id',
            'industry_id', 'country_id', 'state_id', 'city_id', 'product_id', 'persona_id',
            'where_find_them_id', 'sales_stage_id', 'next_activity_id', 'follow_up_activity_id',
            'created_by_id', 'lead_score', 'order_value', 'sales_device', 'annual_turnover', 'call_tracker_id', 'cp_score',
            'reduce_cost_score', 'efficiency_score', 'automation_score', 'others_score',
            'compliance_score', 'established_need_score', 'urgency_score',
            'budget_allocated_score', 'decision_maker_score', 'competition_score', 'champion_score',
            'influencer_score', 'lead_source_quality', 'decision_contact_score', 'avatar_id'
        ];

        numericFields.forEach(field => {
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                const val = Number(data[field]);
                if (!isNaN(val)) data[field] = val;
            }
        });

        // Convert Boolean Fields
        const booleanFields = [
            'telecalling_qualified', 'demo_completed', 'pilot_provided',
            'budget_yes_no', 'authority_yes_no', 'need_yes_no',
            'timeline_yes_no', 'is_farming',
            'demo_done_authority', 'post_demo_feedback_sent', 'post_demo_feedback_received',
            'probing_discussion_authority', 'direct_visit_authority', 'pilot_given',
            'mgmt_call_completed', 'utilized_mgmt_urgency', 'utilized_presales_timeline',
            'authority_champion_influencer_identified'
        ];

        booleanFields.forEach(field => {
            const value = data[field];
            if (value !== undefined) {
                if (value === null || value === '') {
                    data[field] = false;
                } else {
                    const strVal = String(value).toLowerCase();
                    data[field] = (strVal === 'true' || strVal === '1');
                }
            }
        });

        // Automatically set farming_moved_at when lead is moved to farming
        if (data.is_farming === true && oldLead.is_farming !== true) {
            data.farming_moved_at = new Date().toISOString();
        }

        // Clean undefined/null/empty strings
        Object.keys(data).forEach(key => {
            if (data[key] === 'undefined' || data[key] === 'null' || data[key] === '') {
                data[key] = null;
                if (data[key] === 'undefined') delete data[key];
            }
        });

        // Product is mandatory — block clearing it, mirrors the create-side check.
        const finalProductId = data.product_id !== undefined ? data.product_id : oldLead.product_id;
        if (!finalProductId) {
            return res.status(400).json({ message: 'Product is required.' });
        }

        // Dates
        const dateFields = ['enquiry_date', 'expected_closure_date', 'follow_up_datetime', 'next_activity_datetime'];
        dateFields.forEach(field => {
            if (data[field]) {
                try {
                    data[field] = new Date(data[field]).toISOString();
                } catch (e) {
                    delete data[field];
                }
            }
        });

        // Recalculate Score & Quadrant (always system-controlled — no manual override)
        // Strip any quadrant_manual sent from frontend for safety
        delete data.quadrant_manual;
        delete data.quadrant_change_reason;
        delete data.requires_requalification;

        const mergedForCalc = { ...oldLead, ...data };
        data.lead_score = calculateLeadScore(mergedForCalc);
        mergedForCalc.lead_score = data.lead_score;
        data.quadrant = calculateQuadrant(mergedForCalc);

        // Force quadrant to match terminal sales stages
        if (data.sales_stage_id) {
            const newStage = await prisma.salesStage.findUnique({ where: { id: Number(data.sales_stage_id) }, select: { name: true } });
            if (newStage?.name === 'Order Won') {
                data.quadrant = 'Order Won';
                if (data.order_won_date) {
                    // User-supplied date wins — the field is editable in the UI even
                    // after the lead already won, so a deliberate correction here
                    // must overwrite the previously stamped value.
                    data.order_won_at = new Date(data.order_won_date);
                } else if (!oldLead.order_won_at) {
                    data.order_won_at = new Date();
                }
            } else if (newStage?.name === 'Order Lost') {
                data.quadrant = 'Order Lost';
            } else if (newStage?.name === 'Nurturing') {
                if (oldLead.sales_stage_id !== Number(data.sales_stage_id)) {
                    // Freshly moved into Nurturing - reset qualification data.
                    Object.assign(data, getQualificationResetData());
                    data.quadrant = 'Nurturing';
                }
                // Else: the lead was already in Nurturing and sales_stage_id is
                // unchanged - this save is a requalification attempt (the click-to-
                // requalify flow only edits the Score Card, not Sales Stage). Let the
                // freshly computed score/BANT-based quadrant above stand instead of
                // re-forcing Nurturing, otherwise requalification could never succeed.
            }
        }

        // Sales Stage synchronization: any lead resolving to Q1-Q4 uses the single
        // "Quadrant" stage, overriding whatever stage was submitted.
        if (QUADRANT_STAGES.includes(data.quadrant)) {
            const quadrantStageId = await getQuadrantStageId();
            if (quadrantStageId) data.sales_stage_id = quadrantStageId;
        }

        // Leaving Nurturing/degraded state via a fresh score+BANT recalculation
        // clears the requalification flag — the user has requalified the lead.
        if (data.quadrant && data.quadrant !== 'Nurturing' && data.quadrant !== 'Order Won' && data.quadrant !== 'Order Lost' && oldLead.requires_requalification) {
            data.requires_requalification = false;
        }

        if (data.quadrant !== oldLead.quadrant) {
            data.quadrant_updated_at = new Date();
        }

        // AUTO movement logging
        if (data.quadrant && data.quadrant !== oldLead.quadrant) {
            await logQuadrantMovement({
                leadId: id,
                userId: user.id,
                oldQuadrant: oldLead.quadrant,
                newQuadrant: data.quadrant,
                movementType: 'AUTO'
            });
        }

        // RESET quadrant_start_date and quadrant_changed_at if quadrant has changed
        if (data.quadrant && data.quadrant !== oldLead.quadrant) {
            data.quadrant_start_date = new Date().toISOString();
            data.quadrant_changed_at = new Date();
            data.last_positive_movement_at = new Date();
        }

        // Update Contacts
        if (data.contacts) {
            await prisma.leadContact.deleteMany({ where: { lead_id: id } });
            await prisma.leadContact.createMany({
                data: data.contacts.map((c: any) => ({
                    name: c.name || null,
                    designation: c.designation || null,
                    email: c.email || null,
                    contact_mobile: c.contact_mobile || null,
                    whatsapp: c.whatsapp || null,
                    avatar_id: (c.avatar_id && c.avatar_id !== '' && c.avatar_id !== 'null') ? Number(c.avatar_id) : null,
                    persona_id: (c.persona_id && c.persona_id !== '' && c.persona_id !== 'null') ? Number(c.persona_id) : null,
                    lead_id: id
                }))
            });
            delete data.contacts;
        }

        // Handle Relations for Update
        const relationLinks: any = {};
        const connections = [
            { field: 'lead_owner_id', relation: 'owner' },
            { field: 'company_id', relation: 'company_master' },
            { field: 'client_company_id', relation: 'client_company' },
            { field: 'sales_sbu_id', relation: 'sbu' },
            { field: 'job_title_id', relation: 'job_title' },
            { field: 'lead_source_id', relation: 'lead_source' },
            { field: 'industry_id', relation: 'industry' },
            { field: 'country_id', relation: 'country' },
            { field: 'state_id', relation: 'state' },
            { field: 'city_id', relation: 'city' },
            { field: 'product_id', relation: 'product' },
            { field: 'persona_id', relation: 'persona' },
            { field: 'avatar_id', relation: 'avatar' },
            { field: 'where_find_them_id', relation: 'where_find_them' },
            { field: 'sales_stage_id', relation: 'sales_stage' },
            { field: 'next_activity_id', relation: 'next_activity' },
            { field: 'follow_up_activity_id', relation: 'follow_up_activity' },
            { field: 'call_tracker_id', relation: 'call_tracker' },
            { field: 'vertical_id', relation: 'vertical' }
        ];

        // Ids that are about to be connected, so they can be checked before the update
        // runs. A connect to a row that no longer exists fails the whole update with a
        // Prisma P2025 the user cannot act on ("An internal server error occurred") —
        // most often a master record deleted after the lead was created, whose id the
        // form still carries. Naming the field turns that into something fixable.
        const pendingConnects: { field: string; relation: string; id: number }[] = [];

        connections.forEach(conn => {
            const val = data[conn.field];
            // ALWAYS delete/handle the scalar field to prevent Prisma "Unknown argument"
            if (data[conn.field] !== undefined) {
                if (val === null || val === '' || isNaN(Number(val)) || Number(val) <= 0) {
                    relationLinks[conn.relation] = { disconnect: true };
                } else {
                    relationLinks[conn.relation] = { connect: { id: Number(val) } };
                    pendingConnects.push({ field: conn.field, relation: conn.relation, id: Number(val) });
                }
                delete data[conn.field];
            }
        });

        const missingRelation = await findMissingRelation(pendingConnects);
        if (missingRelation) {
            return res.status(400).json({
                error: 'Invalid reference',
                message: `The selected ${missingRelation} no longer exists. Please choose it again and save.`,
                field: missingRelation,
            });
        }

        // Collaterals relation
        if (data.collaterals && Array.isArray(data.collaterals)) {
            relationLinks.collaterals = {
                set: data.collaterals.map((cid: any) => ({ id: parseInt(cid) }))
            };
            delete data.collaterals;
        } else if (data.collaterals === '') {
            relationLinks.collaterals = { set: [] };
            delete data.collaterals;
        }

        // Pricing Negotiation
        if (req.body.new_negotiation_log) {
            relationLinks.pricing_negotiations = {
                create: [{
                    details: req.body.new_negotiation_log,
                    created_by: user.id,
                    date: new Date()
                }]
            };
        }

        // Cleanup fields
        const fieldsToRemove = [
            'id', 'created_at', 'updated_at', 'created_by_id', 'contacts',
            'documents', 'calls', 'score_history', 'quadrant_history',
            'creator', 'where_find_them', 'pricing_negotiations',
            'quadrant_manual', 'quadrant_change_reason',
            'job_title_name', 'new_negotiation_log',
            'new_documents', 'follow_up_notes',
            'enquiry_date', 'order_won_date', 'milestones', 'vertical',
            'expected_order', 'forecast_expected_order_value', 'forecast_expected_order_closure_date', 'forecast_device_count', 'forecast_remarks',
        ];
        const enquiryDateRaw = data.enquiry_date;
        fieldsToRemove.forEach(f => delete data[f]);

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: { ...data, ...relationLinks }
        });

        // Cashflow Forecast: the forecast record (and its milestones) is deleted the
        // moment the lead resolves to Order Won or Lost — forecasting only applies
        // while the lead is still in the pipeline (see forecast.md Order Won/Lost flows).
        if (
            (updatedLead.quadrant === 'Order Won' || updatedLead.quadrant === 'Order Lost') &&
            oldLead.quadrant !== updatedLead.quadrant
        ) {
            await deleteForecastForLead(updatedLead.id);
        }

        // Store/clear enquiry_date via raw SQL (field in schema but Prisma client not yet regenerated)
        try {
            if (enquiryDateRaw && enquiryDateRaw !== 'null' && enquiryDateRaw !== '') {
                await prisma.$executeRawUnsafe('UPDATE `lead` SET `enquiry_date` = ? WHERE `id` = ?', new Date(enquiryDateRaw), id);
            } else if ((req as any).body.enquiry_date === '' || (req as any).body.enquiry_date === null) {
                await prisma.$executeRawUnsafe('UPDATE `lead` SET `enquiry_date` = NULL WHERE `id` = ?', id);
            }
        } catch (e: any) { console.warn('[enquiry_date] update failed:', e.message); }

        // Create FollowUpLog if needed
        // The form's only user-facing activity control is "Next Activity" (next_activity_id) —
        // whatever the user picks there is what this log's Activity Type should show. (There is
        // no separate visible "current activity" input, so follow_up_activity_id — a hidden,
        // form-managed field — must not be used here: it's silently hydrated from the *previous*
        // log's next_activity_id on load, which made every log's Activity Type read one save
        // behind whatever the user had actually just picked.)
        const hasActivity = req.body.next_activity_id && req.body.next_activity_id !== 'null' && req.body.next_activity_id !== '';
        const hasDate = req.body.follow_up_datetime && req.body.follow_up_datetime !== 'null' && req.body.follow_up_datetime !== '';
        const hasNotes = req.body.follow_up_notes && req.body.follow_up_notes !== '';

        // The Lead Form pre-fills the date/notes fields from the lead's own most
        // recent log (so they read as "current" values), which means they are
        // resubmitted unchanged on every save. Only create a new log when the
        // activity/date/notes have actually diverged from that latest log —
        // otherwise every unrelated edit to the lead would duplicate it.
        const latestLog = oldLead.follow_up_logs?.[0] ?? null;

        const submittedActivityId = updatedLead.next_activity_id || null;
        const submittedDateMs = updatedLead.follow_up_datetime ? new Date(updatedLead.follow_up_datetime).getTime() : null;
        const submittedNotes = (req.body.follow_up_notes || '').trim() || null;

        const latestActivityId = latestLog?.next_activity_id || null;
        const latestDateMs = latestLog?.date ? new Date(latestLog.date).getTime() : null;
        const latestNotes = (latestLog?.notes || '').trim() || null;

        const isGenuinelyNewEngagement =
            !latestLog ||
            submittedActivityId !== latestActivityId ||
            submittedDateMs !== latestDateMs ||
            submittedNotes !== latestNotes;

        if ((hasActivity || hasDate || hasNotes) && isGenuinelyNewEngagement) {
            try {
                await prisma.followUpLog.create({
                    data: {
                        lead_id: updatedLead.id,
                        activity_id: updatedLead.next_activity_id || null,
                        next_activity_id: updatedLead.next_activity_id || null,
                        sales_stage_id: updatedLead.sales_stage_id || null,
                        date: updatedLead.follow_up_datetime ? new Date(updatedLead.follow_up_datetime) : null,
                        notes: req.body.follow_up_notes || null,
                        created_by_id: user.id
                    }
                });
            } catch (logError) {
                console.error('Failed to create FollowUpLog for updated lead:', logError);
            }
        }

        res.json(updatedLead);
    } catch (error: any) {
        console.error('CRITICAL: Error updating lead:', error);
        logErrorToFile(error, 'updateLead');
        const friendly = describePrismaError(error);
        // A cause the user can act on is a 400, not a 500 — and it says what to fix
        // instead of "an internal server error occurred", which left them stuck.
        if (friendly) {
            return res.status(400).json({ error: 'Failed to update lead', message: friendly });
        }
        res.status(500).json({
            error: 'Failed to update lead',
            message: 'An internal server error occurred while updating the lead.'
        });
    }
};

export const getLeads = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        console.log('[DEBUG] getLeads - User Session:', { id: user.id, email: user.email, role: user.role, sbu_id: user.sbu_id });

        // Initialize where with AND array to safely combine multiple conditions
        const where: any = { AND: [] };

        // RBAC: Filter leads based on role
        const {
            search, quadrant, sortBy, sortOrder, is_farming, page, limit,
            company_name, product_id,
            startDate, endDate, ownerId, minValue, maxValue, weekly_report, lead_source_id,
            engagementFrom, engagementTo, engagementNotNull, excludeClosed,
            requiresRequalification, minAge, maxAge,
            closureFrom, closureTo
        } = req.query;

        if (user.role === 'SalesPerson') {
            where.AND.push({ lead_owner_id: user.id });
        } else if (user.role === 'SalesManager') {
            // Manager sees their own leads plus their entire downward reporting tree's leads
            const teamIds = await getTeamIds(user);
            where.AND.push({ lead_owner_id: { in: teamIds } });
        }
        // CEO sees all (no RBAC filter added)

        // Apply filters

        console.log('[DEBUG] getLeads - Query Params:', {
            search, quadrant, is_farming, page, limit,
            company_name, product_id,
            startDate, endDate, ownerId, minValue, maxValue
        });

        if (search) {
            const searchStr = String(search).trim();
            const searchTerms = searchStr.split(/\s+/);

            if (searchTerms.length > 1) {
                where.AND.push({
                    OR: [
                        {
                            AND: [
                                { first_name: { contains: searchTerms[0] } },
                                { last_name: { contains: searchTerms.slice(1).join(' ') } }
                            ]
                        },
                        { first_name: { contains: searchStr } },
                        { last_name: { contains: searchStr } },
                        { company_master: { name: { contains: searchStr } } },
                        { email: { contains: searchStr } }
                    ]
                });
            } else {
                where.AND.push({
                    OR: [
                        { first_name: { contains: searchStr } },
                        { last_name: { contains: searchStr } },
                        { company_master: { name: { contains: searchStr } } },
                        { email: { contains: searchStr } }
                    ]
                });
            }
        }

        if (quadrant) {
            const quadrantList = Array.isArray(quadrant)
                ? (quadrant as string[]).map(String)
                : String(quadrant).split(',').filter(Boolean);
            if (quadrantList.length === 1) {
                where.AND.push({ quadrant: quadrantList[0] });
            } else if (quadrantList.length > 1) {
                where.AND.push({ quadrant: { in: quadrantList } });
            }
        }

        if (company_name) {
            where.AND.push({
                company_name: { contains: String(company_name) }
            });
        }

        // Requalification deep-link filter — Dashboard's Requalification Breakdown
        // card drills down to just the leads flagged for requalification, not
        // every lead in that quadrant.
        if (requiresRequalification === '1' || requiresRequalification === 'true') {
            where.AND.push({ requires_requalification: true });
        }

        if (product_id) {
            const productIdList = Array.isArray(product_id)
                ? (product_id as string[]).map(p => parseInt(p)).filter(n => !isNaN(n))
                : String(product_id).split(',').filter(Boolean).map(p => parseInt(p)).filter(n => !isNaN(n));
            if (productIdList.length === 1) {
                where.AND.push({ product_id: productIdList[0] });
            } else if (productIdList.length > 1) {
                where.AND.push({ product_id: { in: productIdList } });
            }
        }

        if (startDate || endDate) {
            const dateFilter: any = {};
            if (startDate) dateFilter.gte = dayjs(startDate as string).startOf('day').toDate();
            if (endDate) dateFilter.lte = dayjs(endDate as string).endOf('day').toDate();
            where.AND.push({ created_at: dateFilter });
        }

        if (ownerId && ownerId !== '' && ownerId !== 'null' && ownerId !== 'undefined') {
            const ownerIdList = Array.isArray(ownerId)
                ? (ownerId as string[]).map(id => parseInt(id)).filter(n => !isNaN(n))
                : String(ownerId).split(',').filter(Boolean).map(id => parseInt(id)).filter(n => !isNaN(n));
            if (ownerIdList.length === 1) {
                where.AND.push({ lead_owner_id: ownerIdList[0] });
            } else if (ownerIdList.length > 1) {
                where.AND.push({ lead_owner_id: { in: ownerIdList } });
            }
        }

        if (minValue || maxValue) {
            const valueFilter: any = {};
            if (minValue) valueFilter.gte = parseFloat(minValue as string);
            if (maxValue) valueFilter.lte = parseFloat(maxValue as string);
            where.AND.push({ order_value: valueFilter });
        }

        // Age filter — age is days since enquiry_date (mirrors client's calculateAgeInDays).
        // Higher age = older enquiry_date, so minAge/maxAge invert onto the date range.
        if (minAge || maxAge) {
            const ageFilter: any = {};
            if (minAge) ageFilter.lte = dayjs().subtract(Number(minAge), 'day').endOf('day').toDate();
            if (maxAge) ageFilter.gte = dayjs().subtract(Number(maxAge), 'day').startOf('day').toDate();
            where.AND.push({ enquiry_date: ageFilter });
        }

        // Expected Order Closure Date filter — lives on the lead's forecast header
        // (forecast_headers.expected_order_closure_date). The client resolves each
        // selected duration preset (This/Next Week/Month/Quarter) or the custom picker
        // to an index-aligned closureFrom/closureTo pair; multiple windows are OR'd.
        // Only leads that carry a forecast with a closure date inside one of the
        // windows match.
        {
            const froms = ([] as string[]).concat((closureFrom as any) || []);
            const tos = ([] as string[]).concat((closureTo as any) || []);
            const pairCount = Math.max(froms.length, tos.length);
            const closureOr: any[] = [];
            for (let i = 0; i < pairCount; i++) {
                const closureFilter: any = {};
                if (froms[i]) closureFilter.gte = dayjs(froms[i]).startOf('day').toDate();
                if (tos[i]) closureFilter.lte = dayjs(tos[i]).endOf('day').toDate();
                if (Object.keys(closureFilter).length) {
                    closureOr.push({ forecast_header: { is: { expected_order_closure_date: closureFilter } } });
                }
            }
            if (closureOr.length === 1) where.AND.push(closureOr[0]);
            else if (closureOr.length > 1) where.AND.push({ OR: closureOr });
        }

        if (lead_source_id && lead_source_id !== '' && lead_source_id !== 'null') {
            const parsedSourceId = parseInt(lead_source_id as string);
            if (!isNaN(parsedSourceId)) {
                where.AND.push({ lead_source_id: parsedSourceId });
            }
        }

        // Sales Engagement Date (Lead.follow_up_datetime) — the window the dashboard
        // "Lead Sales Activities" cards link into. `engagementNotNull` covers the
        // Over Due Activities card, which has no window at all.
        if (engagementFrom || engagementTo) {
            const engagementFilter: any = {};
            if (engagementFrom) engagementFilter.gte = dayjs(engagementFrom as string).startOf('day').toDate();
            if (engagementTo) engagementFilter.lte = dayjs(engagementTo as string).endOf('day').toDate();
            where.AND.push({ follow_up_datetime: engagementFilter });
        } else if (engagementNotNull === '1') {
            where.AND.push({ follow_up_datetime: { not: null } });
        }

        // Exclude closed leads. A lead with no sales stage yet is still open, so it stays in.
        if (excludeClosed === '1') {
            where.AND.push({ OR: [
                { sales_stage_id: null },
                { sales_stage: { name: { notIn: CLOSED_SALES_STAGES } } }
            ]});
        }

        // Default to today's leads has been removed via requirements

        console.log('[DEBUG] getLeads - Applied Farming Filter:', is_farming);

        // Pagination Logic
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;
        const skip = (pageNum - 1) * limitNum;

        // Dynamic Sorting with Default
        const orderByField = (sortBy as string) || 'id';
        const orderDirection = (sortOrder as string) === 'asc' ? 'asc' : 'desc';

        let orderBy: any = { [orderByField]: orderDirection };

        // Handle relation sorting
        if (orderByField === 'sales_stage' || orderByField === 'stage') {
            orderBy = { sales_stage: { name: orderDirection } };
        } else if (orderByField === 'owner' || orderByField === 'manager') {
            orderBy = { owner: { first_name: orderDirection } };
        } else if (orderByField === 'company') {
            orderBy = { company_master: { name: orderDirection } };
        } else if (orderByField === 'lead_source') {
            orderBy = { lead_source: { name: orderDirection } };
        } else if (orderByField === 'product') {
            orderBy = { product: { name: orderDirection } };
        } else if (orderByField === 'ageing') {
            orderBy = { created_at: orderDirection };
        } else if (orderByField === 'quadrant') {
            orderBy = { quadrant: orderDirection };
        } else if (orderByField === 'lead_score') {
            orderBy = { lead_score: orderDirection };
        } else if (orderByField === 'order_value') {
            orderBy = { order_value: orderDirection };
        }

        console.log('[DEBUG] getLeads - Final Where Clause:', JSON.stringify(where, null, 2));
        console.log('[DEBUG] getLeads - Pagination:', { skip, take: limitNum });

        // Fetch total count and data concurrently
        const [total, leads] = await Promise.all([
            prisma.lead.count({ where }),
            prisma.lead.findMany({
                where,
                skip,
                take: limitNum,
                include: {
                    company_master: true,
                    owner: { select: { first_name: true, last_name: true } },
                    next_activity: true,
                    collaterals: true,
                    contacts: true,
                    documents: true,
                    calls: true,
                    score_history: true,
                    quadrant_history: true,
                    sbu: true,
                    pricing_negotiations: true,
                    job_title: true,
                    lead_source: true,
                    industry: true,
                    country: true,
                    state: true,
                    city: true,
                    product: true,
                    persona: true,
                    avatar: true,
                    follow_up_activity: true,
                    sales_stage: true,
                    forecast_header: { select: { expected_order_closure_date: true } },
                    follow_up_logs: {
                        orderBy: { created_at: 'desc' },
                        take: 1,
                        select: { notes: true }
                    },
                    bant_answers: {
                        include: {
                            category: { select: { id: true, code: true, name: true } },
                            question: { select: { id: true, question: true } }
                        }
                    }
                },
                orderBy
            })
        ]);

        const mappedLeads = leads.map(l => ({
            ...l,
            company_name: l.company_name || l.company_master?.name || '-',
            follow_up_notes: l.follow_up_logs?.[0]?.notes || '-'
        }));

        res.json({ data: mappedLeads, total });
    } catch (error: any) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ message: 'Error fetching leads' });
    }
};

export const getLeadById = async (req: Request, res: Response) => {
    try {
        const lead = await prisma.lead.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                contacts: { include: { avatar: true } },
                documents: true,
                calls: true,
                score_history: true,
                quadrant_history: true,
                company_master: true,
                sbu: true,
                pricing_negotiations: {
                    include: {
                        user: { select: { first_name: true, last_name: true } }
                    }
                },
                job_title: true,
                lead_source: true,
                industry: true,
                country: true,
                state: true,
                city: true,
                product: true,
                persona: true,
                avatar: true,
                collaterals: true,
                follow_up_activity: true,
                next_activity: true,
                sales_stage: true,
                forecast_header: { select: { expected_order_closure_date: true } },
                owner: { select: { first_name: true, last_name: true } },
                creator: { select: { first_name: true, last_name: true } },
                where_find_them: true,
                follow_up_logs: {
                    orderBy: { created_at: 'desc' },
                    include: {
                        activity: true,
                        next_activity: true,
                        sales_stage: true,
                        documents: true,
                        creator: { select: { first_name: true, last_name: true } }
                    }
                },
                bant_answers: {
                    include: {
                        category: { select: { id: true, code: true, name: true } },
                        question: { select: { id: true, question: true } }
                    }
                }
            }
        });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        // Map company_name fallback
        const mappedLead = {
            ...lead,
            company_name: lead.company_name || lead.company_master?.name || '-'
        };

        // Fetch enquiry_date, vertical_id via raw SQL
        try {
            const rawRows: any[] = await prisma.$queryRawUnsafe(
                'SELECT `enquiry_date`, `vertical_id` FROM `lead` WHERE `id` = ?',
                parseInt(req.params.id)
            );
            if (rawRows && rawRows.length > 0) {
                if (rawRows[0].enquiry_date) (mappedLead as any).enquiry_date = rawRows[0].enquiry_date;
                if (rawRows[0].vertical_id) (mappedLead as any).vertical_id = Number(rawRows[0].vertical_id);
            }
        } catch (e: any) { console.warn('[enquiry_date/vertical_id] fetch failed:', e.message); }

        // Fetch milestones via raw SQL
        try {
            const milestones: any[] = await prisma.$queryRawUnsafe(
                `SELECT lm.*, pt.name AS payment_type_name FROM lead_milestone lm
                 LEFT JOIN paymenttype pt ON lm.payment_type_id = pt.id
                 WHERE lm.lead_id = ? ORDER BY lm.id ASC`,
                parseInt(req.params.id)
            );
            (mappedLead as any).milestones = milestones.map((m: any) => ({
                ...m,
                payment_type: m.payment_type_name ? { id: m.payment_type_id, name: m.payment_type_name } : null,
            }));
        } catch (e: any) { console.warn('[milestones] fetch failed:', e.message); (mappedLead as any).milestones = []; }

        // Compute edit permission for the requesting user
        const user = (req as any).user;
        let isEditable = user.role === 'CEO' || lead.lead_owner_id === user.id;
        if (!isEditable) {
            const subordinateIds = await getSubordinateIds(user.id);
            isEditable = lead.lead_owner_id != null && subordinateIds.includes(lead.lead_owner_id);
        }
        (mappedLead as any).is_editable = isEditable;

        res.json(mappedLead);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lead' });
    }
};



export const deleteLead = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);

        // Use transaction to delete all related records first
        await prisma.$transaction([
            // 1. Delete related contacts
            prisma.leadContact.deleteMany({ where: { lead_id: id } }),
            // 2. Delete related documents
            prisma.leadDocument.deleteMany({ where: { lead_id: id } }),
            // 3. Delete related calls
            prisma.callLog.deleteMany({ where: { lead_id: id } }),
            // 4. Delete score history
            prisma.leadScore.deleteMany({ where: { lead_id: id } }),
            // 5. Delete quadrant history
            prisma.leadQuadrantHistory.deleteMany({ where: { lead_id: id } }),
            // 6. Delete pricing negotiations
            prisma.pricingNegotiationLog.deleteMany({ where: { lead_id: id } }),
            // 7. Delete follow-up logs
            prisma.followUpLog.deleteMany({ where: { lead_id: id } }),
            // 8. Finally, delete the lead
            prisma.lead.delete({ where: { id } })
        ]);

        res.json({ message: 'Lead deleted successfully' });
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'An internal error occurred while deleting the lead' });
    }
};

export const uploadDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const file = req.file;
        const { description, follow_up_log_id } = req.body;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const document = await prisma.leadDocument.create({
            data: {
                lead_id: parseInt(id),
                follow_up_log_id: follow_up_log_id ? parseInt(follow_up_log_id) : null,
                name: file.originalname,
                url: `/uploads/${file.filename}`,
                description
            }
        });

        res.status(201).json(document);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Error uploading document' });
    }
};

// Update Lead Score Card
export const updateLeadScore = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const scoreData = req.body;

        console.log('Received score update for lead:', id);
        console.log('Score data:', JSON.stringify(scoreData, null, 2));

        const oldLead = await prisma.lead.findUnique({ where: { id } });
        if (!oldLead) return res.status(404).json({ message: 'Lead not found' });

        // Calculate new lead score
        const newScore = calculateLeadScore(scoreData);
        console.log('Calculated new score:', newScore);

        const newQuadrant = calculateQuadrant({ ...oldLead, ...scoreData, lead_score: newScore });

        // Sales Stage synchronization: Q1-Q4 always uses the single "Quadrant" stage
        let quadrantStageId: number | null = null;
        if (QUADRANT_STAGES.includes(newQuadrant)) {
            quadrantStageId = await getQuadrantStageId();
        }

        // Update score fields
        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                // A. Organization Needs
                reduce_cost_score: scoreData.reduce_cost_score,
                efficiency_score: scoreData.efficiency_score,
                automation_score: scoreData.automation_score,
                others_score: scoreData.others_score,
                ...(scoreData.others_score_label !== undefined && { others_score_label: scoreData.others_score_label }),
                compliance_score: scoreData.compliance_score,

                // B. BANT Critical
                established_need_score: scoreData.established_need_score,
                urgency_score: scoreData.urgency_score,
                budget_allocated_score: scoreData.budget_allocated_score,
                decision_maker_score: scoreData.decision_maker_score,

                // C. Other Info
                competition_score: scoreData.competition_score,
                champion_score: scoreData.champion_score,
                influencer_score: scoreData.influencer_score,

                // D. Lead Source
                lead_source_quality: scoreData.lead_source_quality,
                decision_contact_score: scoreData.decision_contact_score,

                // BANT checkbox / detail fields (Score Card popup)
                ...(scoreData.budget_yes_no !== undefined && { budget_yes_no: scoreData.budget_yes_no }),
                ...(scoreData.budget_allocated !== undefined && { budget_allocated: scoreData.budget_allocated }),
                ...(scoreData.approval_stage !== undefined && { approval_stage: scoreData.approval_stage }),
                ...(scoreData.authority_yes_no !== undefined && { authority_yes_no: scoreData.authority_yes_no }),
                ...(scoreData.decision_maker !== undefined && { decision_maker: scoreData.decision_maker }),
                ...(scoreData.need_yes_no !== undefined && { need_yes_no: scoreData.need_yes_no }),
                ...(scoreData.pain_points_desc !== undefined && { pain_points_desc: scoreData.pain_points_desc }),
                ...(scoreData.timeline_yes_no !== undefined && { timeline_yes_no: scoreData.timeline_yes_no }),
                ...(scoreData.expected_closure_date !== undefined && { expected_closure_date: scoreData.expected_closure_date ? new Date(scoreData.expected_closure_date) : null }),

                // Calculated values
                lead_score: newScore,
                quadrant: newQuadrant,
                ...(quadrantStageId ? { sales_stage_id: quadrantStageId } : {}),
                // RESET quadrant_start_date and quadrant_changed_at if quadrant changed
                ...(
                    newQuadrant !== oldLead.quadrant
                        ? { quadrant_start_date: new Date(), quadrant_changed_at: new Date() }
                        : {}
                ),
                // Re-entering Lead Score criteria requalifies the lead
                ...(oldLead.requires_requalification ? { requires_requalification: false } : {})
            }
        });

        // AUTO movement logging
        if (newQuadrant !== oldLead.quadrant) {
            await logQuadrantMovement({
                leadId: id,
                userId: (req as any).user.id,
                oldQuadrant: oldLead.quadrant,
                newQuadrant,
                movementType: 'AUTO'
            });
        }

        // Log score history
        await prisma.leadScore.create({
            data: {
                lead_id: id,
                score: newScore,
                breakdown: JSON.stringify(scoreData),
                updated_by: (req as any).user?.id // Use optional chaining for safety
            }
        });

        res.json(updatedLead);
    } catch (error) {
        console.error('Error updating lead score:', error);
        res.status(500).json({ message: 'Error updating lead score' });
    }
};
export const searchCompany = async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        if (!query || query.length < 1) {
            return res.json([]);
        }

        // Search for companies by name
        const companies = await prisma.company.findMany({
            where: {
                name: {
                    contains: query
                },
                is_active: true
            },
            take: 10
        });

        // For each company, find the most recent lead to get auto-fill details
        const results = await Promise.all(companies.map(async (company) => {
            const latestLead = await prisma.lead.findFirst({
                where: { company_id: company.id },
                orderBy: { created_at: 'desc' },
                select: {
                    industry_id: true,
                    lead_source_id: true,
                    address: true,
                    country_id: true,
                    state_id: true,
                    city_id: true,
                    pin_code: true,
                    website: true,
                    email: true,
                    mobile_number: true,
                    whatsapp_number: true,
                    annual_turnover: true
                }
            });

            return {
                id: company.id,
                name: company.name,
                details: latestLead || {}
            };
        }));

        res.json(results);
    } catch (error) {
        console.error('Error searching company:', error);
        res.status(500).json({ message: 'Error searching company' });
    }
};

// Update lead collaterals (if needed in future)
const FOLLOW_UP_LOG_STATUSES = ['Pending', 'In Progress', 'Completed'];

// Inline status edit for one Sales Engagement & Activity Log entry — the log
// stays otherwise immutable (audit trail), only its progress status updates.
export const updateFollowUpLogStatus = async (req: Request, res: Response) => {
    try {
        const leadId = parseInt(req.params.id);
        const logId = parseInt(req.params.logId);
        const { status } = req.body;

        if (!FOLLOW_UP_LOG_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Status must be one of: ' + FOLLOW_UP_LOG_STATUSES.join(', ') });
        }

        const existing = await prisma.followUpLog.findUnique({ where: { id: logId } });
        if (!existing || existing.lead_id !== leadId) {
            return res.status(404).json({ message: 'Log entry not found' });
        }

        const log = await prisma.followUpLog.update({
            where: { id: logId },
            data: { status },
            include: {
                activity: { select: { name: true } },
                sales_stage: { select: { name: true } },
                creator: { select: { first_name: true, last_name: true } }
            }
        });

        res.json(log);
    } catch (error) {
        console.error('Error updating follow-up log status:', error);
        res.status(500).json({ message: 'Error updating log status' });
    }
};

export const addPricingNegotiationLog = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { details, date } = req.body;

        const log = await prisma.pricingNegotiationLog.create({
            data: {
                lead_id: id,
                details,
                date: date ? new Date(date) : new Date(),
                created_by: (req as any).user.id
            },
            include: {
                user: { select: { first_name: true, last_name: true } }
            }
        });

        res.status(201).json(log);
    } catch (error) {
        console.error('Error adding pricing log:', error);
        res.status(500).json({ message: 'Error adding pricing log' });
    }
};

export const cashFlowUpdateLead = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = (req as any).user;

        const lead = await prisma.lead.findUnique({
            where: { id },
            include: { sales_stage: true }
        });
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const {
            company_name, website, industry_id, annual_turnover,
            country_id, state_id, city_id, pin_code, address,
            demo_done_authority, probing_discussion_authority, direct_visit_authority,
            post_demo_feedback_sent, post_demo_feedback_received,
            pilot_given, mgmt_call_completed, utilized_mgmt_urgency, utilized_presales_timeline,
            follow_up_activity_id, follow_up_datetime, follow_up_notes,
            vertical_id, project_name
        } = req.body;

        const updateData: any = {};
        if (company_name !== undefined) updateData.company_name = company_name;
        if (website !== undefined) updateData.website = website;
        if (industry_id !== undefined && industry_id !== '') updateData.industry_id = parseInt(industry_id);
        if (annual_turnover !== undefined) updateData.annual_turnover = annual_turnover;
        if (country_id !== undefined && country_id !== '') updateData.country_id = parseInt(country_id);
        if (state_id !== undefined && state_id !== '') updateData.state_id = parseInt(state_id);
        if (city_id !== undefined && city_id !== '') updateData.city_id = parseInt(city_id);
        if (pin_code !== undefined) updateData.pin_code = pin_code;
        if (address !== undefined) updateData.address = address;
        if (vertical_id !== undefined) updateData.vertical_id = vertical_id ? parseInt(vertical_id) : null;

        // Project Name is editable from the Order Won lead page. Trimmed, and an empty
        // value clears it rather than storing a blank string, so the Cashflow Tracker /
        // Report keep treating "no project" as a single case.
        if (project_name !== undefined) {
            const trimmed = String(project_name ?? '').trim();
            if (trimmed.length > 255) {
                return res.status(400).json({ message: 'Project Name cannot exceed 255 characters.' });
            }
            updateData.project_name = trimmed || null;
        }

        const toBool = (v: any) => v === true || v === 'true' || v === '1' || v === 1;
        if (demo_done_authority !== undefined) updateData.demo_done_authority = toBool(demo_done_authority);
        if (probing_discussion_authority !== undefined) updateData.probing_discussion_authority = toBool(probing_discussion_authority);
        if (direct_visit_authority !== undefined) updateData.direct_visit_authority = toBool(direct_visit_authority);
        if (post_demo_feedback_sent !== undefined) updateData.post_demo_feedback_sent = toBool(post_demo_feedback_sent);
        if (post_demo_feedback_received !== undefined) updateData.post_demo_feedback_received = toBool(post_demo_feedback_received);
        if (pilot_given !== undefined) updateData.pilot_given = toBool(pilot_given);
        if (mgmt_call_completed !== undefined) updateData.mgmt_call_completed = toBool(mgmt_call_completed);
        if (utilized_mgmt_urgency !== undefined) updateData.utilized_mgmt_urgency = toBool(utilized_mgmt_urgency);
        if (utilized_presales_timeline !== undefined) updateData.utilized_presales_timeline = toBool(utilized_presales_timeline);

        if (company_name) {
            const clientCompanyId = await findOrCreateClientCompany(company_name);
            if (clientCompanyId) updateData.client_company_id = clientCompanyId;
        }

        await prisma.lead.update({ where: { id }, data: updateData });

        const hasActivity = follow_up_activity_id && follow_up_activity_id !== '';
        const hasDate = follow_up_datetime && follow_up_datetime !== '';
        const hasNotes = follow_up_notes && follow_up_notes !== '';

        if (hasActivity || hasDate || hasNotes) {
            await prisma.followUpLog.create({
                data: {
                    lead_id: id,
                    activity_id: hasActivity ? parseInt(follow_up_activity_id) : null,
                    date: hasDate ? new Date(follow_up_datetime) : null,
                    notes: hasNotes ? follow_up_notes : null,
                    created_by_id: user.id
                }
            });
        }

        const updated = await prisma.lead.findUnique({
            where: { id },
            include: {
                industry: true, country: true, state: true, city: true,
                follow_up_logs: {
                    orderBy: { date: 'desc' },
                    include: { activity: true, creator: { select: { first_name: true, last_name: true } } }
                }
            }
        });
        res.json(updated);
    } catch (error) {
        console.error('Error in cashFlowUpdateLead:', error);
        res.status(500).json({ message: 'Error updating lead' });
    }
};

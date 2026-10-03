import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { findOrCreateClientCompany } from '../utils/companyHelper';
import { createCallTrackerFromEnquiry } from './callTrackerController';
import { resolveLeadQuadrantFromSalesStage, getQuadrantStageId, logQuadrantMovement } from '../utils/leadHelper';

const QUADRANT_STAGES = ['Q1', 'Q2', 'Q3', 'Q4'];

const parseSafeInt = (val: any) => {
    const parsed = parseInt(val);
    return isNaN(parsed) ? null : parsed;
};

export const getEnquiries = async (req: Request, res: Response) => {
    try {
        const {
            isConverted, is_converted,
            product_id, productId,
            company_id, companyId,
            search,
            startDate, endDate,
            lead_source_id, company_name, contact_name, created_by_id, sales_stage_id,
            lead_qualification,
            view  // 'allocated' → scope by enquiry_allocated_to instead of created_by_id
        } = req.query;
        const user = (req as any).user;

        // Base where object — is_converted only applied for the Converted Lead tab
        const where: any = {};
        if (isConverted === 'true' || is_converted === 'true') {
            where.is_converted = true;
        }

        // 1. Product Context Filtering
        const pid = parseSafeInt(product_id || productId);
        if (pid !== null) {
            where.product_id = pid;
        }

        // SEAL global Company filter — the product's BU company (product.company_id).
        const cid = parseSafeInt(company_id || companyId);
        if (cid !== null) {
            where.product = { ...(where.product || {}), company_id: cid };
        }

        // 2. RBAC Scoping
        if (view === 'allocated') {
            // Allocated Enquiry tab: show enquiries where enquiry_allocated_to = logged-in user
            where.enquiry_allocated_to = user.id;
        }
        // All Enquiry / Converted Lead tabs: no created_by scoping — show all for product

        // 3. Search Filter (General text search)
        if (search && typeof search === 'string' && search.trim() !== '') {
            const searchStr = search.trim();
            const searchOr = {
                OR: [
                    { company_name: { contains: searchStr } },
                    { contact_name: { contains: searchStr } },
                    { email: { contains: searchStr } },
                    { mobile_number: { contains: searchStr } },
                    { requirement: { contains: searchStr } }
                ]
            };
            
            if (where.OR) {
                // If RBAC already added an OR, combine them with AND
                where.AND = [ { OR: where.OR }, searchOr ];
                delete where.OR;
            } else {
                where.OR = searchOr.OR;
            }
        }

        // 4. Advanced Filters
        if (startDate && typeof startDate === 'string') {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                where.date = where.date || {};
                where.date.gte = start;
            }
        }
        if (endDate && typeof endDate === 'string') {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (!isNaN(end.getTime())) {
                where.date = where.date || {};
                where.date.lte = end;
            }
        } else if (startDate && typeof startDate === 'string' && !isNaN(new Date(startDate).getTime())) {
            // From Date given without a To Date — default the upper bound to today
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            where.date = where.date || {};
            where.date.lte = today;
        }
        if (lead_source_id && lead_source_id !== '') {
            const lsId = parseSafeInt(lead_source_id);
            if (lsId !== null) where.lead_source_id = lsId;
        }
        if (company_name && typeof company_name === 'string' && company_name.trim() !== '') {
            where.company_name = { contains: company_name.trim() };
        }
        if (contact_name && typeof contact_name === 'string' && contact_name.trim() !== '') {
            where.contact_name = { contains: contact_name.trim() };
        }
        // BDE filter (Enquiry Tracker "BDE Filter" dropdown) — scoped to who
        // originated the Enquiry, not who it's currently allocated to.
        if (created_by_id && created_by_id !== '') {
            const creatorId = parseSafeInt(created_by_id);
            if (creatorId !== null) where.created_by_id = creatorId;
        }
        if (sales_stage_id && sales_stage_id !== '') {
            const ssId = parseSafeInt(sales_stage_id);
            if (ssId !== null) where.sales_stage_id = ssId;
        }
        if (lead_qualification && typeof lead_qualification === 'string' && lead_qualification.trim() !== '') {
            where.lead_qualification = lead_qualification.trim();
        }

        const enquiries = await prisma.enquiry.findMany({
            where,
            include: {
                lead_source: true,
                country: true,
                state: true,
                city: true,
                created_by:  { select: { id: true, first_name: true, last_name: true } },
                validated_by: { select: { id: true, first_name: true, last_name: true } },
                allocated_to: { select: { id: true, first_name: true, last_name: true } },
                enquiry_allocated_to_user: { select: { id: true, first_name: true, last_name: true } },
                product: { select: { id: true, name: true } },
                sales_stage: { select: { id: true, name: true } },
            },
            orderBy: { id: 'desc' }
        });

        res.json(enquiries);
    } catch (error: any) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({ message: 'Error fetching enquiries', details: error.message });
    }
};

export const getEnquiryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const enquiry = await prisma.enquiry.findUnique({
            where: { id: parseInt(id) },
            include: {
                lead_source: true,
                country: true,
                state: true,
                city: true,
                created_by:  { select: { id: true, first_name: true, last_name: true } },
                validated_by: { select: { id: true, first_name: true, last_name: true } },
                allocated_to: { select: { id: true, first_name: true, last_name: true } },
                enquiry_allocated_to_user: { select: { id: true, first_name: true, last_name: true } },
                product: { select: { id: true, name: true } },
                sales_stage: { select: { id: true, name: true } }
            }
        });
        if (!enquiry) {
            return res.status(404).json({ message: 'Enquiry not found' });
        }
        res.json(enquiry);
    } catch (error) {
        console.error('Error fetching enquiry:', error);
        res.status(500).json({ message: 'Error fetching enquiry' });
    }
};

export const createEnquiry = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const user = (req as any).user;
        
        console.log('DEBUG: Received Enquiry Create Request:', JSON.stringify(data, null, 2));

        // Robust Date Parsing
        let enquiryDate = new Date();
        if (data.date) {
            const d = new Date(data.date);
            if (!isNaN(d.getTime())) enquiryDate = d;
        }

        // "Enquiry Converted To" dropdown: 'Lead' | 'CallTracker' (null = not converted)
        const convertedTo = data.converted_to === 'CallTracker' || data.converted_to === 'Call Tracker'
            ? 'CallTracker'
            : (data.converted_to === 'Lead' || data.is_converted === true || data.is_converted === 'Yes' || data.is_converted === 'true')
                ? 'Lead'
                : null;
        const isConverted = convertedTo !== null;

        // Map primitive data
        const createData: any = {
            date: enquiryDate,
            created_by_id: user.id,  // auto-set owner to logged-in user
            company_name: data.company_name || null,
            contact_name: data.contact_name || null,
            mobile_number: data.mobile_number || null,
            email: data.email || null,
            requirement: data.requirement || null,
            lead_qualification: data.lead_qualification || null,
            linkedin_status: data.linkedin_status || null,
            remarks: data.remarks || null,
            frequency: data.frequency || null,
            name: data.name || null,
            mktg_effectiveness: data.mktg_effectiveness || null,
            is_converted: isConverted,
            converted_to: convertedTo,
            converted_at: isConverted ? new Date() : null
        };

        // Map relation IDs directly
        const idFields = [
            { field: 'lead_source_id', id: parseSafeInt(data.lead_source_id) },
            { field: 'country_id', id: parseSafeInt(data.country_id) },
            { field: 'state_id', id: parseSafeInt(data.state_id) },
            { field: 'city_id', id: parseSafeInt(data.city_id) },
            { field: 'validated_by_id', id: parseSafeInt(data.validated_by_id) },
            { field: 'allocated_to_id', id: parseSafeInt(data.allocated_to_id) },
            { field: 'product_id', id: parseSafeInt(data.product_id) },
            { field: 'sales_stage_id', id: parseSafeInt(data.sales_stage_id) },
            { field: 'enquiry_allocated_to', id: parseSafeInt(data.enquiry_allocated_to) }
        ];

        for (const f of idFields) {
            if (f.id !== null) {
                createData[f.field] = f.id;
            }
        }

        console.log('DEBUG: Prepared Prisma createData:', JSON.stringify(createData, null, 2));

        const enquiry = await prisma.enquiry.create({
            data: createData,
            include: {
                lead_source: true,
                country: true,
                state: true,
                city: true,
                created_by:  { select: { id: true, first_name: true, last_name: true } },
                validated_by: { select: { id: true, first_name: true, last_name: true } },
                allocated_to: { select: { id: true, first_name: true, last_name: true } },
                enquiry_allocated_to_user: { select: { id: true, first_name: true, last_name: true } },
                product: { select: { id: true, name: true } },
                sales_stage: { select: { id: true, name: true } }
            }
        });

        console.log('DEBUG: Enquiry created successfully:', enquiry.id);

        // Conversion Logic: route to Lead or Call Tracker based on "Enquiry Converted To"
        if (enquiry.converted_to === 'CallTracker') {
            console.log('Attempting to create Call Tracker entry from new Enquiry...');
            try {
                const call = await createCallTrackerFromEnquiry(enquiry, user.id);
                console.log('Successfully created Call Tracker from Enquiry:', call.id);
            } catch (callError: any) {
                console.error('FAILED to create Call Tracker during Enquiry creation:', callError.message);
            }
        } else if (enquiry.is_converted) {
            console.log('Attempting to create Lead from new Enquiry...');
            const names = (enquiry.contact_name || '').split(' ');
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';

            try {
                const clientCompanyId = await findOrCreateClientCompany(enquiry.company_name);

                // Quadrant is derived from the Enquiry's Sales Stage (Order Won -> 'Order Won',
                // Order Lost -> 'Order Lost', Nurturing -> 'Nurturing', anything else -> 'Q1').
                const { quadrant, extra: quadrantExtra } = await resolveLeadQuadrantFromSalesStage(enquiry.sales_stage_id);
                let salesStageIdForLead = enquiry.sales_stage_id;
                if (QUADRANT_STAGES.includes(quadrant)) {
                    const quadrantStageId = await getQuadrantStageId();
                    if (quadrantStageId) salesStageIdForLead = quadrantStageId;
                }

                const leadData = {
                    created_by_id: parseInt(String(user?.id || 1)), // Ensure Int type
                    company_name: enquiry.company_name,
                    client_company_id: clientCompanyId,
                    first_name: firstName,
                    last_name: lastName,
                    mobile_number: enquiry.mobile_number,
                    email: enquiry.email,
                    requirement_desc: enquiry.requirement,
                    lead_owner_id: enquiry.allocated_to_id,
                    lead_source_id: enquiry.lead_source_id,
                    where_find_them_id: enquiry.lead_source_id,
                    country_id: enquiry.country_id,
                    state_id: enquiry.state_id,
                    city_id: enquiry.city_id,
                    sales_stage_id: salesStageIdForLead,
                    product_id: enquiry.product_id,
                    product_or_service: enquiry.product_id ? 'Product' : null,
                    // Carries the Enquiry's own `date` over as the Lead's enquiry_date —
                    // without this, a Lead created via Enquiry conversion never gets
                    // enquiry_date set, so it's excluded from every Lead Gen Summary
                    // range filter (Lead Achievement / Sales Pipeline are enquiry_date-based).
                    enquiry_date: enquiry.date,
                    quadrant,
                    quadrant_updated_at: new Date(),
                    ...quadrantExtra,
                };
                console.log('DEBUG: Prepared Lead createData:', JSON.stringify(leadData, null, 2));
                const lead = await prisma.lead.create({ data: leadData });
                // Traces this Enquiry to the Lead it created — lets a future backfill
                // (or any other lookup) reliably find conversion-created Leads instead
                // of guessing from other fields.
                await prisma.enquiry.update({ where: { id: enquiry.id }, data: { converted_lead_id: lead.id } });
                await logQuadrantMovement({
                    leadId: lead.id,
                    userId: user.id,
                    oldQuadrant: null,
                    newQuadrant: lead.quadrant,
                    movementType: 'AUTO'
                });
            } catch (leadError: any) {
                console.error('FAILED to create Lead during Enquiry creation:', leadError.message);
            }
        }

        res.status(201).json(enquiry);
    } catch (error: any) {
        console.error('CRITICAL: Error creating enquiry:', error);
        res.status(400).json({ 
            message: 'Error creating enquiry', 
            details: error.message,
            code: error.code,
            stack: error.stack
        });
    }
};

export const updateEnquiry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const user = (req as any).user;

        // Get current state to check for transition
        const currentEnquiry = await prisma.enquiry.findUnique({ where: { id: parseInt(id) } });
        if (!currentEnquiry) return res.status(404).json({ message: 'Enquiry not found' });
        
        // Robust Date Parsing
        let enquiryDate = undefined;
        if (data.date) {
            const d = new Date(data.date);
            if (!isNaN(d.getTime())) enquiryDate = d;
        }

        // "Enquiry Converted To" dropdown: 'Lead' | 'CallTracker' (null = not converted)
        const convertedToProvided = data.converted_to !== undefined || data.is_converted !== undefined;
        const convertedTo = data.converted_to === 'CallTracker' || data.converted_to === 'Call Tracker'
            ? 'CallTracker'
            : (data.converted_to === 'Lead' || data.is_converted === true || data.is_converted === 'Yes' || data.is_converted === 'true')
                ? 'Lead'
                : null;
        const isConverted = convertedTo !== null;

        // Map primitive data
        const updateData: any = {
            date: enquiryDate !== undefined ? enquiryDate : undefined,
            company_name: data.company_name !== undefined ? (data.company_name || null) : undefined,
            contact_name: data.contact_name !== undefined ? (data.contact_name || null) : undefined,
            mobile_number: data.mobile_number !== undefined ? (data.mobile_number || null) : undefined,
            email: data.email !== undefined ? (data.email || null) : undefined,
            requirement: data.requirement !== undefined ? (data.requirement || null) : undefined,
            lead_qualification: data.lead_qualification !== undefined ? (data.lead_qualification || null) : undefined,
            linkedin_status: data.linkedin_status !== undefined ? (data.linkedin_status || null) : undefined,
            remarks: data.remarks !== undefined ? (data.remarks || null) : undefined,
            frequency: data.frequency !== undefined ? (data.frequency || null) : undefined,
            name: data.name !== undefined ? (data.name || null) : undefined,
            mktg_effectiveness: data.mktg_effectiveness !== undefined ? (data.mktg_effectiveness || null) : undefined,
            is_converted: convertedToProvided ? isConverted : undefined,
            converted_to: convertedToProvided ? convertedTo : undefined,
            converted_at: convertedToProvided ? ((!currentEnquiry.is_converted && isConverted) ? new Date() : currentEnquiry.converted_at) : undefined
        };

        // Map relation IDs directly
        const idFields = [
            { field: 'lead_source_id', id: data.lead_source_id !== undefined ? parseSafeInt(data.lead_source_id) : undefined },
            { field: 'country_id', id: data.country_id !== undefined ? parseSafeInt(data.country_id) : undefined },
            { field: 'state_id', id: data.state_id !== undefined ? parseSafeInt(data.state_id) : undefined },
            { field: 'city_id', id: data.city_id !== undefined ? parseSafeInt(data.city_id) : undefined },
            { field: 'validated_by_id', id: data.validated_by_id !== undefined ? parseSafeInt(data.validated_by_id) : undefined },
            { field: 'allocated_to_id', id: data.allocated_to_id !== undefined ? parseSafeInt(data.allocated_to_id) : undefined },
            { field: 'product_id', id: data.product_id !== undefined ? parseSafeInt(data.product_id) : undefined },
            { field: 'sales_stage_id', id: data.sales_stage_id !== undefined ? parseSafeInt(data.sales_stage_id) : undefined },
            { field: 'enquiry_allocated_to', id: data.enquiry_allocated_to !== undefined ? parseSafeInt(data.enquiry_allocated_to) : undefined }
        ];

        for (const f of idFields) {
            if (f.id !== undefined) {
                updateData[f.field] = f.id;
            }
        }

        const enquiry = await prisma.enquiry.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                lead_source: true,
                country: true,
                state: true,
                city: true,
                created_by:  { select: { id: true, first_name: true, last_name: true } },
                validated_by: { select: { id: true, first_name: true, last_name: true } },
                allocated_to: { select: { id: true, first_name: true, last_name: true } },
                enquiry_allocated_to_user: { select: { id: true, first_name: true, last_name: true } },
                product: { select: { id: true, name: true } },
                sales_stage: { select: { id: true, name: true } }
            }
        });

        // Conversion Logic: route to Lead or Call Tracker if newly converted
        if (!currentEnquiry.is_converted && enquiry.is_converted && enquiry.converted_to === 'CallTracker') {
            console.log(`Converting Enquiry ${id} to Call Tracker...`);
            try {
                const call = await createCallTrackerFromEnquiry(enquiry, user.id);
                console.log('Successfully created Call Tracker from Enquiry:', call.id);
            } catch (callError: any) {
                console.error('FAILED to create Call Tracker during Enquiry update:', callError.message);
            }
        } else if (!currentEnquiry.is_converted && enquiry.is_converted) {
            console.log(`Converting Enquiry ${id} to Lead...`);
            const names = (enquiry.contact_name || '').split(' ');
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';

            try {
                const clientCompanyId = await findOrCreateClientCompany(enquiry.company_name);

                // Quadrant is derived from the Enquiry's Sales Stage (Order Won -> 'Order Won',
                // Order Lost -> 'Order Lost', Nurturing -> 'Nurturing', anything else -> 'Q1').
                const { quadrant, extra: quadrantExtra } = await resolveLeadQuadrantFromSalesStage(enquiry.sales_stage_id);
                let salesStageIdForLead = enquiry.sales_stage_id;
                if (QUADRANT_STAGES.includes(quadrant)) {
                    const quadrantStageId = await getQuadrantStageId();
                    if (quadrantStageId) salesStageIdForLead = quadrantStageId;
                }

                const lead = await prisma.lead.create({
                    data: {
                        created_by_id: parseInt(String(user?.id || 1)),
                        company_name: enquiry.company_name,
                        client_company_id: clientCompanyId,
                        first_name: firstName,
                        last_name: lastName,
                        mobile_number: enquiry.mobile_number,
                        email: enquiry.email,
                        requirement_desc: enquiry.requirement,
                        lead_owner_id: enquiry.allocated_to_id,
                        lead_source_id: enquiry.lead_source_id,
                        where_find_them_id: enquiry.lead_source_id,
                        country_id: enquiry.country_id,
                        state_id: enquiry.state_id,
                        city_id: enquiry.city_id,
                        sales_stage_id: salesStageIdForLead,
                        product_id: enquiry.product_id,
                        product_or_service: enquiry.product_id ? 'Product' : null,
                        // See createEnquiry's leadData comment — carries the Enquiry's own
                        // `date` over so this Lead isn't excluded from enquiry_date-based
                        // Lead Gen Summary ranges (Lead Achievement / Sales Pipeline).
                        enquiry_date: enquiry.date,
                        quadrant,
                        quadrant_updated_at: new Date(),
                        ...quadrantExtra,
                    }
                });
                console.log('Successfully created Lead from Enquiry:', lead.id);
                // See createEnquiry's comment — traces this Enquiry to the Lead it created.
                await prisma.enquiry.update({ where: { id: parseInt(id) }, data: { converted_lead_id: lead.id } });
                await logQuadrantMovement({
                    leadId: lead.id,
                    userId: user.id,
                    oldQuadrant: null,
                    newQuadrant: lead.quadrant,
                    movementType: 'AUTO'
                });
            } catch (leadError: any) {
                console.error('FAILED to create Lead during Enquiry update:', leadError);
            }
        }

        res.json(enquiry);
    } catch (error: any) {
        console.error('CRITICAL: Error updating enquiry:', error);
        res.status(400).json({ 
            message: 'Error updating enquiry', 
            details: error.message,
            code: error.code
        });
    }
};

export const deleteEnquiry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.enquiry.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Enquiry deleted successfully' });
    } catch (error) {
        console.error('Error deleting enquiry:', error);
        res.status(500).json({ message: 'Error deleting enquiry' });
    }
};

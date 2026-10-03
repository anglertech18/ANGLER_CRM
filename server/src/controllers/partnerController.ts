import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import dayjs from 'dayjs';

/**
 * GET /api/seal/partners
 * Fetches all partners based on role
 */
export const getPartners = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const { product_id } = req.query;
        const role = String(authUser.role || '').toUpperCase();

        let where: any = {};
        if (role === 'SALESPERSON') {
            where = { user_id: authUser.id };
        } else if (role === 'SALESMANAGER') {
            where = { OR: [{ user_id: authUser.id }, { user: { reporting_manager_id: authUser.id } }] };
        }

        if (product_id) {
            const pid = parseInt(product_id as string);
            if (!isNaN(pid)) where = { ...where, product_id: pid };
        }

        const partners = await prisma.partner.findMany({
            where,
            include: {
                user: { select: { id: true, first_name: true, last_name: true } },
                lead_source: true
            },
            orderBy: { id: 'desc' }
        });
        res.json(partners);
    } catch (error) {
        console.error('[getPartners]', (error as any)?.message || error);
        res.status(500).json({ message: 'Error fetching partners', detail: (error as any)?.message });
    }
};

/**
 * GET /api/seal/partners/:id
 * Fetches a single partner including product_id via raw SQL
 */
export const getPartnerById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authUser = (req as any).user;
        const pid = parseInt(id);
        if (isNaN(pid)) return res.status(400).json({ message: 'Invalid partner id' });

        const partner = await prisma.partner.findUnique({
            where: { id: pid },
            include: {
                user: { select: { id: true, first_name: true, last_name: true } },
                lead_source: true
            }
        });
        if (!partner) return res.status(404).json({ message: 'Partner not found' });

        const role = String(authUser.role || '').toUpperCase();
        if (role === 'SALESPERSON' && partner.user_id !== authUser.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(partner);
    } catch (error) {
        console.error('[getPartnerById]', (error as any)?.message || error);
        res.status(500).json({ message: 'Error fetching partner', detail: (error as any)?.message });
    }
};

/**
 * POST /api/seal/partners
 * Creates a new partner onboarding record
 */
export const createPartner = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const {
            reg_date,
            partner_company,
            name,
            region,
            enquiry_interest_date,
            quadrant_allotted_date,
            current_lead_score,
            quadrant,
            partner_type,
            current_end_client_opportunity,
            source_id,
            is_rfi_received,
            is_business_plan_submitted,
            is_business_plan_target_agreed,
            business_plan_target_value,
            is_training_provided,
            is_monthly_engagement_started,
            partner_action_poa,
            edc,
            active_leads_moved_to_quadrant,
            status,
            signed_date,
            product_id,
        } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Partner Name is required' });
        }

        // Helper to parse integers safely
        const safeParseInt = (val: any, fallback: number = 0) => {
            const parsed = parseInt(val);
            return isNaN(parsed) ? fallback : parsed;
        };

        // Determine Owner (User ID)
        const role = String(authUser.role || '').toUpperCase();
        const isCEO = role === 'CEO' || role === 'ADMIN';
        const isManager = role === 'SALESMANAGER';
        const { user_id } = req.body;

        let finalOwnerId = authUser.id;
        if (user_id && isCEO) {
            finalOwnerId = safeParseInt(user_id, authUser.id);
        } else if (user_id && isManager) {
            const targetUser = await prisma.user.findUnique({ where: { id: safeParseInt(user_id) } });
            if (targetUser && (targetUser.id === authUser.id || targetUser.reporting_manager_id === authUser.id)) {
                finalOwnerId = targetUser.id;
            }
        }

        const toBool = (v: any) => v === true || v === 'true' || v === 'Yes';

        const partner = await prisma.partner.create({
            data: {
                user_id: finalOwnerId,
                reg_date: reg_date ? new Date(reg_date) : undefined,
                partner_company: partner_company || null,
                name,
                region: region || null,
                enquiry_interest_date: enquiry_interest_date ? new Date(enquiry_interest_date) : null,
                quadrant_allotted_date: quadrant_allotted_date ? new Date(quadrant_allotted_date) : null,
                current_lead_score: safeParseInt(current_lead_score),
                quadrant: quadrant || 'Q1',
                partner_type: partner_type || null,
                current_end_client_opportunity: current_end_client_opportunity || 'No',
                source_id: source_id ? safeParseInt(source_id) : null,
                product_id: product_id ? safeParseInt(product_id) : null,
                is_rfi_received: toBool(is_rfi_received),
                is_business_plan_submitted: toBool(is_business_plan_submitted),
                is_business_plan_target_agreed: toBool(is_business_plan_target_agreed),
                business_plan_target_value: safeParseInt(business_plan_target_value),
                is_training_provided: toBool(is_training_provided),
                is_monthly_engagement_started: toBool(is_monthly_engagement_started),
                partner_action_poa: partner_action_poa || null,
                edc: edc ? new Date(edc) : null,
                active_leads_moved_to_quadrant: safeParseInt(active_leads_moved_to_quadrant),
                status: status || 'Active',
                signed_date: signed_date ? new Date(signed_date) : null,
            }
        });

        res.status(201).json(partner);
    } catch (error) {
        console.error('[createPartner]', (error as any)?.message || error);
        res.status(500).json({ message: 'Error creating partner', detail: (error as any)?.message });
    }
};

/**
 * PUT /api/seal/partners/:id
 * Updates an existing partner record
 */
export const updatePartner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authUser = (req as any).user;
        
        // Check permissions
        const existingPartner = await prisma.partner.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        });

        if (!existingPartner) return res.status(404).json({ message: 'Partner not found' });

        const role = String(authUser.role || '').toUpperCase();
        const isCEO = role === 'CEO' || role === 'ADMIN';
        const isManager = role === 'SALESMANAGER';

        if (role === 'SALESPERSON' && existingPartner.user_id !== authUser.id) {
            return res.status(403).json({ message: 'Access denied: You can only edit your own partners' });
        }
        if (isManager && 
            existingPartner.user_id !== authUser.id && 
            existingPartner.user?.reporting_manager_id !== authUser.id) {
            return res.status(403).json({ message: 'Access denied: You can only edit your own or subordinates partners' });
        }

        const {
            user_id, // Allow reassignment
            reg_date,
            partner_company,
            name,
            region,
            enquiry_interest_date,
            quadrant_allotted_date,
            current_lead_score,
            quadrant,
            partner_type,
            current_end_client_opportunity,
            source_id,
            is_rfi_received,
            is_business_plan_submitted,
            is_business_plan_target_agreed,
            business_plan_target_value,
            is_training_provided,
            is_monthly_engagement_started,
            partner_action_poa,
            edc,
            active_leads_moved_to_quadrant,
            status,
            signed_date,
            product_id,
        } = req.body;

        const safeParseIntUpdate = (val: any) => {
            if (val === undefined) return undefined;
            const parsed = parseInt(val);
            return isNaN(parsed) ? 0 : parsed;
        };
        const toBool = (v: any) => v === true || v === 'true' || v === 'Yes';

        // Validate reassignment: SalesManager can only reassign to team members
        let finalUserId = undefined;
        if (user_id && isCEO) {
            finalUserId = safeParseIntUpdate(user_id);
        } else if (user_id && isManager) {
            const targetUser = await prisma.user.findUnique({ where: { id: safeParseIntUpdate(user_id) } });
            if (targetUser && (targetUser.id === authUser.id || targetUser.reporting_manager_id === authUser.id)) {
                finalUserId = targetUser.id;
            } else {
                return res.status(403).json({ message: 'Access denied: You can only reassign to team members' });
            }
        }

        const partner = await prisma.partner.update({
            where: { id: parseInt(id) },
            data: {
                user_id: finalUserId,
                reg_date: reg_date ? new Date(reg_date) : undefined,
                partner_company,
                name,
                region,
                enquiry_interest_date: enquiry_interest_date ? new Date(enquiry_interest_date) : (enquiry_interest_date === null ? null : undefined),
                quadrant_allotted_date: quadrant_allotted_date ? new Date(quadrant_allotted_date) : (quadrant_allotted_date === null ? null : undefined),
                current_lead_score: safeParseIntUpdate(current_lead_score),
                quadrant,
                partner_type,
                current_end_client_opportunity,
                source_id: source_id ? safeParseIntUpdate(source_id) : (source_id === null ? null : undefined),
                product_id: product_id !== undefined ? (product_id ? safeParseIntUpdate(product_id) : null) : undefined,
                is_rfi_received: is_rfi_received !== undefined ? toBool(is_rfi_received) : undefined,
                is_business_plan_submitted: is_business_plan_submitted !== undefined ? toBool(is_business_plan_submitted) : undefined,
                is_business_plan_target_agreed: is_business_plan_target_agreed !== undefined ? toBool(is_business_plan_target_agreed) : undefined,
                business_plan_target_value: safeParseIntUpdate(business_plan_target_value),
                is_training_provided: is_training_provided !== undefined ? toBool(is_training_provided) : undefined,
                is_monthly_engagement_started: is_monthly_engagement_started !== undefined ? toBool(is_monthly_engagement_started) : undefined,
                partner_action_poa,
                edc: edc ? new Date(edc) : (edc === null ? null : undefined),
                active_leads_moved_to_quadrant: safeParseIntUpdate(active_leads_moved_to_quadrant),
                status,
                signed_date: signed_date ? new Date(signed_date) : (signed_date === null ? null : undefined),
            }
        });

        res.json(partner);
    } catch (error) {
        console.error('[updatePartner]', (error as any)?.message || error);
        res.status(500).json({ message: 'Error updating partner', detail: (error as any)?.message });
    }
};

/**
 * DELETE /api/seal/partners/:id
 */
export const deletePartner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authUser = (req as any).user;

        // Check permissions
        const existingPartner = await prisma.partner.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        });

        if (!existingPartner) return res.status(404).json({ message: 'Partner not found' });

        const role = String(authUser.role || '').toUpperCase();
        const isCEO = role === 'CEO' || role === 'ADMIN';

        if (!isCEO) {
            return res.status(403).json({ message: 'Access denied: Only CEOs can delete partner records' });
        }

        await prisma.partner.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Partner deleted successfully' });
    } catch (error) {
        console.error('Error deleting partner:', error);
        res.status(500).json({ message: 'Error deleting partner' });
    }
};

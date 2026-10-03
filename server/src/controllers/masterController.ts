import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fields to strip from data before saving (relations that cause Prisma errors if sent as objects/arrays)
const RELATION_FIELDS = [
    'company', 'client_company', 'country', 'state', 'product', 'persona',
    'leads', 'personas', 'call_trackers', 'subordinates', 'managed_companies', 'cashflow_managers', 'cashflow_management_companies',
    'privileges', 'kra_entries', 'pomodoro_sessions', 'pricing_negotiations',
    'follow_up_logs', 'swat_performances', 'created_leads', 'avatar',
    'company_master', 'sbu', 'job_title', 'lead_source', 'lead_source_type', 'industry', 'next_activity', 'sales_stage'
];

export const createMasterController = (modelName: string) => {
    const model = (prisma as any)[modelName];

    return {
        getAll: async (req: Request, res: Response) => {
            try {
                let includeOptions = {};
                const where: any = { is_active: true };

                if (modelName === 'sBU') {
                    includeOptions = { include: { company: true } };
                } else if (modelName === 'state') {
                    includeOptions = { include: { country: true } };
                    if (req.query.country_id) {
                        const cid = parseInt(req.query.country_id as string);
                        if (!isNaN(cid)) where.country_id = cid;
                    }
                } else if (modelName === 'city') {
                    includeOptions = { include: { state: true } };
                    if (req.query.state_id) {
                        const sid = parseInt(req.query.state_id as string);
                        if (!isNaN(sid)) where.state_id = sid;
                    }
                } else if (modelName === 'persona') {
                    includeOptions = { include: { product: true } };
                } else if (modelName === 'product') {
                    includeOptions = { include: { company: true } };
                    if (req.query.company_id) {
                        const raw = String(req.query.company_id).split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                        if (raw.length === 1) where.company_id = raw[0];
                        else if (raw.length > 1) where.company_id = { in: raw };
                    }
                } else if (modelName === 'leadSource') {
                    includeOptions = { include: { lead_source_type: true } };
                }

                const items = await model.findMany({ where, ...includeOptions, orderBy: { id: 'desc' } });
                res.json(items);
            } catch (error: any) {
                console.error(`[MASTER] getAll error for ${modelName}:`, error);
                res.status(500).json({ message: 'Error fetching data', detail: error?.message });
            }
        },

        getById: async (req: Request, res: Response) => {
            try {
                const item = await model.findUnique({ where: { id: parseInt(req.params.id) } });
                if (!item) return res.status(404).json({ message: 'Not found' });
                res.json(item);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching data' });
            }
        },

        create: async (req: Request, res: Response) => {
            try {
                const data = req.body;
                console.log(`[MASTER] Creating ${modelName} with data:`, JSON.stringify(data, null, 2));

                // Strip relation fields and metadata
                RELATION_FIELDS.forEach(f => delete data[f]);
                delete data.id;
                delete data.created_at;
                delete data.updated_at;

                // Type casting for Product numeric fields
                if (modelName === 'product') {
                    const intFields = ['q4_to_q3_days', 'q3_to_q2_days', 'q2_to_q1_days', 'q1_to_nurturing_days'];
                    const floatFields = [
                        'device_q4_multiplier', 'device_q3_multiplier', 'device_q2_multiplier', 'device_q1_multiplier',
                        'lead_q4_multiplier', 'lead_q3_multiplier', 'lead_q2_multiplier', 'lead_q1_multiplier'
                    ];

                    intFields.forEach(f => {
                        if (data[f] !== undefined && data[f] !== "") data[f] = parseInt(data[f]) || 0;
                        else if (data[f] === "") data[f] = 0;
                    });
                    floatFields.forEach(f => {
                        if (data[f] !== undefined && data[f] !== "") data[f] = parseFloat(data[f]) || 1.0;
                        else if (data[f] === "") data[f] = 1.0;
                    });

                    if (data.company_id !== undefined && data.company_id !== "" && data.company_id !== null) {
                        data.company_id = parseInt(data.company_id) || null;
                    } else {
                        data.company_id = null;
                    }
                }

                // Type casting for Lead Source's Lead Source Type mapping
                if (modelName === 'leadSource') {
                    if (data.lead_source_type_id !== undefined && data.lead_source_type_id !== "" && data.lead_source_type_id !== null) {
                        data.lead_source_type_id = parseInt(data.lead_source_type_id) || null;
                    } else {
                        data.lead_source_type_id = null;
                    }
                }

                const item = await model.create({ data: data });
                res.status(201).json(item);
            } catch (error: any) {
                console.error(`[MASTER] Error creating ${modelName}:`, error);
                if (error.code === 'P2002') {
                    const field = error.meta?.target?.[0] || 'name';
                    return res.status(400).json({ message: `A ${modelName} with this ${field} already exists.` });
                }
                res.status(400).json({ message: 'Error creating data', error: error.message || error });
            }
        },

        update: async (req: Request, res: Response) => {
            try {
                const data = req.body;
                console.log(`[MASTER] Updating ${modelName} ID ${req.params.id} with data:`, JSON.stringify(data, null, 2));

                // Strip relation fields and metadata
                RELATION_FIELDS.forEach(f => delete data[f]);
                delete data.id;
                delete data.created_at;
                delete data.updated_at;

                // Type casting for Product numeric fields
                if (modelName === 'product') {
                    const intFields = ['q4_to_q3_days', 'q3_to_q2_days', 'q2_to_q1_days', 'q1_to_nurturing_days'];
                    const floatFields = [
                        'device_q4_multiplier', 'device_q3_multiplier', 'device_q2_multiplier', 'device_q1_multiplier',
                        'lead_q4_multiplier', 'lead_q3_multiplier', 'lead_q2_multiplier', 'lead_q1_multiplier'
                    ];

                    intFields.forEach(f => {
                        if (data[f] !== undefined) data[f] = parseInt(data[f]) || 0;
                    });
                    floatFields.forEach(f => {
                        if (data[f] !== undefined) data[f] = parseFloat(data[f]) || 1.0;
                    });

                    if (data.company_id !== undefined && data.company_id !== "" && data.company_id !== null) {
                        data.company_id = parseInt(data.company_id) || null;
                    } else {
                        data.company_id = null;
                    }
                }

                // Type casting for Lead Source's Lead Source Type mapping
                if (modelName === 'leadSource') {
                    if (data.lead_source_type_id !== undefined && data.lead_source_type_id !== "" && data.lead_source_type_id !== null) {
                        data.lead_source_type_id = parseInt(data.lead_source_type_id) || null;
                    } else {
                        data.lead_source_type_id = null;
                    }
                }

                const item = await model.update({
                    where: { id: parseInt(req.params.id) },
                    data: data,
                });
                res.json(item);
            } catch (error: any) {
                console.error(`[MASTER] Error updating ${modelName}:`, error);
                if (error.code === 'P2002') {
                    const field = error.meta?.target?.[0] || 'name';
                    return res.status(400).json({ message: `A ${modelName} with this ${field} already exists.` });
                }
                res.status(400).json({ message: 'Error updating data', error: error.message || error });
            }
        },

        delete: async (req: Request, res: Response) => {
            try {
                // Soft delete
                await model.update({
                    where: { id: parseInt(req.params.id) },
                    data: { is_active: false },
                });
                res.json({ message: 'Deleted successfully' });
            } catch (error) {
                res.status(400).json({ message: 'Error deleting data', error });
            }
        },
    };
};

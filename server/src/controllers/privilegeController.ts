import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPrivileges = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const privileges = await prisma.privilege.findMany({
            where: { user_id: userId }
        });
        res.json(privileges);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching privileges' });
    }
};

export const updatePrivileges = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const { modules } = req.body; // Array of { module_name, can_add, ... }

        // Transaction to update/upsert all
        await prisma.$transaction(
            modules.map((p: any) =>
                prisma.privilege.upsert({
                    where: {
                        user_id_module_name: {
                            user_id: userId,
                            module_name: p.module_name
                        }
                    },
                    update: {
                        can_add: p.can_add,
                        can_edit: p.can_edit,
                        can_delete: p.can_delete,
                        can_view: p.can_view
                    },
                    create: {
                        user_id: userId,
                        module_name: p.module_name,
                        can_add: p.can_add,
                        can_edit: p.can_edit,
                        can_delete: p.can_delete,
                        can_view: p.can_view
                    }
                })
            )
        );

        res.json({ message: 'Privileges updated' });
    } catch (error) {
        res.status(400).json({ message: 'Error updating privileges', error });
    }
};

export const getCashflowAccess = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { cashflow_management_access: true }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const companies = await prisma.cashflowManagementCompany.findMany({
            where: { user_id: userId },
            select: { company_id: true }
        });

        res.json({
            is_enabled: user.cashflow_management_access,
            company_ids: companies.map(c => c.company_id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cashflow access' });
    }
};

export const getBillingForecastAccess = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { billing_forecast_management_access: true }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const companies = await prisma.billingForecastManagementCompany.findMany({
            where: { user_id: userId },
            select: { company_id: true }
        });

        res.json({
            is_enabled: user.billing_forecast_management_access,
            company_ids: companies.map(c => c.company_id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching billing forecast access' });
    }
};

export const updateBillingForecastAccess = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const { is_enabled, company_ids } = req.body; // { is_enabled: boolean, company_ids: number[] }
        const companyIds: number[] = Array.isArray(company_ids) ? company_ids : [];

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { billing_forecast_management_access: !!is_enabled }
            }),
            prisma.billingForecastManagementCompany.deleteMany({ where: { user_id: userId } }),
            ...(companyIds.length
                ? [prisma.billingForecastManagementCompany.createMany({
                    data: companyIds.map(company_id => ({ user_id: userId, company_id }))
                })]
                : [])
        ]);

        res.json({ message: 'Billing forecast access updated' });
    } catch (error) {
        res.status(400).json({ message: 'Error updating billing forecast access', error });
    }
};

// Lead Gen Summary — per-BDE Lead Source Type restriction. No rows for a user
// means unrestricted (Lead Gen Summary shows every active Lead Source Type),
// matching prior behavior; rows present restrict the report to just those types.
export const getLeadSourceTypeAccess = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const rows = await prisma.userLeadSourceType.findMany({
            where: { user_id: userId },
            select: { lead_source_type_id: true }
        });
        res.json({ lead_source_type_ids: rows.map(r => r.lead_source_type_id) });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lead source type access' });
    }
};

export const updateLeadSourceTypeAccess = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const { lead_source_type_ids } = req.body; // number[] — empty/omitted = unrestricted
        const typeIds: number[] = Array.isArray(lead_source_type_ids) ? lead_source_type_ids : [];

        await prisma.$transaction([
            prisma.userLeadSourceType.deleteMany({ where: { user_id: userId } }),
            ...(typeIds.length
                ? [prisma.userLeadSourceType.createMany({
                    data: typeIds.map(lead_source_type_id => ({ user_id: userId, lead_source_type_id }))
                })]
                : [])
        ]);

        res.json({ message: 'Lead source type access updated' });
    } catch (error) {
        res.status(400).json({ message: 'Error updating lead source type access', error });
    }
};

export const updateCashflowAccess = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const { is_enabled, company_ids } = req.body; // { is_enabled: boolean, company_ids: number[] }
        const companyIds: number[] = Array.isArray(company_ids) ? company_ids : [];

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { cashflow_management_access: !!is_enabled }
            }),
            prisma.cashflowManagementCompany.deleteMany({ where: { user_id: userId } }),
            ...(companyIds.length
                ? [prisma.cashflowManagementCompany.createMany({
                    data: companyIds.map(company_id => ({ user_id: userId, company_id }))
                })]
                : [])
        ]);

        res.json({ message: 'Cashflow access updated' });
    } catch (error) {
        res.status(400).json({ message: 'Error updating cashflow access', error });
    }
};

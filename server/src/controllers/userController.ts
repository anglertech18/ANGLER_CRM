import { Request, Response } from 'express';
import { PrismaClient, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sendActivationEmail } from '../utils/emailService';
import { getTeamIds, isInTeam } from '../utils/teamScope';

const prisma = new PrismaClient();

export const getUsers = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        const { status, all } = req.query;
        let where: any = {};
        const isCEO = currentUser.role === 'CEO';
        const shouldShowAll = all === 'true';

        if (status) {
            where.status = status as UserStatus;
        }

        // Apply role-based visibility ONLY if not CEO and not requesting 'all'
        if (!isCEO && !shouldShowAll) {
            if (currentUser.role === 'SalesManager') {
                // Self + entire downward reporting tree
                where.id = { in: await getTeamIds(currentUser) };
            } else if (currentUser.role === 'SalesPerson') {
                where.id = currentUser.id;
            }
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                company: true,
                sbu: true,
                reporting_manager: { select: { id: true, first_name: true, last_name: true } },
                privileges: true,
                managed_companies: true
            },
            orderBy: {
                id: 'desc'
            }
        });
        const safeUsers = users.map(({ password_hash, ...user }) => user);
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        const { password, managed_company_ids, ...data } = req.body;

        // 1. Role-Based Activation Gating
        if (currentUser.role === 'SalesManager') {
            if (data.role !== 'SalesPerson') {
                return res.status(403).json({ message: 'Managers can only invite Sales Persons' });
            }
            // Check if manager is mapped to the selected company
            const manager = await prisma.user.findUnique({
                where: { id: currentUser.id },
                include: { managed_companies: true }
            });
            const isMapped = manager?.managed_companies.some(c => c.id === parseInt(data.company_id));
            if (!isMapped && manager?.role !== 'CEO') {
                return res.status(403).json({ message: 'You can only invite users to companies you are mapped to' });
            }
            // Department check: Manager can only assign their own department to new sales person
            if (data.department !== manager?.department) {
                return res.status(403).json({ message: `You can only invite users for the ${manager?.department} department` });
            }
        }

        // 2. Email Uniqueness (Users + Pending)
        const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Generate a random temporary password
        const randomPassword = require('crypto').randomBytes(16).toString('hex');
        const password_hash = await bcrypt.hash(randomPassword, 10);

        // Generate activation token
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // 3. Create User with Department and Managed Companies
        const createData: any = {
            ...data,
            company_id: data.company_id ? parseInt(data.company_id) : null,
            sbu_id: data.sbu_id ? parseInt(data.sbu_id) : null,
            reporting_manager_id: data.reporting_manager_id ? parseInt(data.reporting_manager_id) : null,
            department_id: data.department_id ? parseInt(data.department_id) : null,
            status: 'INVITED',
            password_hash,
            reset_token: resetToken,
            reset_token_expiry: resetTokenExpiry,
            joining_date: new Date()
        };

        if (data.role === 'SalesManager' && managed_company_ids) {
            createData.managed_companies = {
                connect: managed_company_ids.map((id: number) => ({ id }))
            };
        }

        const user = await prisma.user.create({ data: createData });

        // Send activation email
        try {
            await sendActivationEmail(user.email, resetToken);
        } catch (emailError) {
            console.error('Failed to send activation email:', emailError);
            // Continue, but maybe warn? User is created.
        }

        const { password_hash: _, ...safeUser } = user;
        res.status(201).json(safeUser);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(400).json({ message: 'Error creating user', error });
    }
};

export const resendInvite = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.status !== 'INVITED') {
            return res.status(400).json({ message: 'User is already active or inactive' });
        }

        // Generate new token
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                reset_token: resetToken,
                reset_token_expiry: resetTokenExpiry
            }
        });

        await sendActivationEmail(user.email, resetToken);
        res.json({ message: 'Invitation resent successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Error resending invite', error });
    }
};

export const updateUserStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Expect 'ACTIVE' or 'INACTIVE'

        if (!['ACTIVE', 'INACTIVE', 'INVITED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        const { password_hash: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(400).json({ message: 'Error updating user status', error });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                company: true,
                sbu: true,
                reporting_manager: { select: { id: true, first_name: true, last_name: true, email: true } },
                privileges: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[USER_DEBUG] Data for user ${id}:`, {
            calls: user.calls_target,
            activities: user.activities_target,
            q1: user.q1_target,
            all: JSON.stringify(user)
        });

        const { password_hash: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        console.error(`[USER_DEBUG] Error fetching user ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching user', error });
    }
};

export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const currentUser = (req as any).user;
        console.log(`[USER_DEBUG] Update profile for user ${id} by ${currentUser.email}:`, req.body);

        const {
            reporting_manager_id,
            calls_target,
            activities_target,
            q1_target,
            linkedin_target,
            demo_target,
            proposal_target,
            direct_visit_target,
            revenue_target,
            device_target,
            leads_target,
            role,
            company_id,
            sbu_id,
            managed_company_ids,
            ...otherData
        } = req.body;

        // Fetch target user to check reporting relationship
        const targetUser = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: { reporting_manager_id: true }
        });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Role-based access control for achievements and targets
        const isAdmin = currentUser.role === 'CEO';
        // True anywhere the target sits below the caller in the reporting tree
        const isReportingManager = parseInt(id) !== currentUser.id
            && await isInTeam(currentUser.id, parseInt(id));

        if (!isAdmin && !isReportingManager) {
            // Check if trying to edit targets
            const targetFields = [
                'calls_target', 'activities_target', 'q1_target',
                'linkedin_target', 'demo_target', 'proposal_target', 'direct_visit_target',
                'revenue_target', 'device_target', 'leads_target'
            ];
            const isEditingTargets = targetFields.some(field => req.body[field] !== undefined);

            if (isEditingTargets) {
                return res.status(403).json({
                    message: 'Only Admin or Reporting Manager can edit targets'
                });
            }
        }

        const updateData: any = { ...otherData };
        if (calls_target !== undefined) updateData.calls_target = calls_target;
        if (activities_target !== undefined) updateData.activities_target = activities_target;
        if (q1_target !== undefined) updateData.q1_target = q1_target;
        if (linkedin_target !== undefined) updateData.linkedin_target = linkedin_target;
        if (demo_target !== undefined) updateData.demo_target = demo_target;
        if (proposal_target !== undefined) updateData.proposal_target = proposal_target;
        if (direct_visit_target !== undefined) updateData.direct_visit_target = direct_visit_target;
        if (revenue_target !== undefined) updateData.revenue_target = revenue_target;
        if (device_target !== undefined) updateData.device_target = device_target;
        if (leads_target !== undefined) updateData.leads_target = leads_target;
        if (role) updateData.role = role;
        if (company_id) updateData.company_id = parseInt(company_id);
        if (sbu_id) updateData.sbu_id = parseInt(sbu_id);
        if (reporting_manager_id) updateData.reporting_manager_id = parseInt(reporting_manager_id);
        if (req.body.department) updateData.department = req.body.department;
        if (req.body.department_id) updateData.department_id = parseInt(req.body.department_id);
        if (req.body.managed_company_ids) {
            updateData.managed_companies = {
                set: req.body.managed_company_ids.map((id: number) => ({ id }))
            };
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        const { password_hash: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(400).json({ message: 'Error updating user profile', error });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { password, ...data } = req.body;
        let updateData = { ...data };

        // Remove relation fields that shouldn't be updated directly
        const fieldsToRemove = [
            'company', 'sbu', 'reporting_manager', 'subordinates',
            'leads', 'created_leads', 'calls', 'activities',
            'privileges', 'kra_entries', 'pomodoro_sessions',
            'pricing_negotiations', 'managed_companies', 'managed_company_ids',
            'cashflow_management_access', 'cashflow_management_companies',
            'billing_forecast_management_access', 'billing_forecast_management_companies'
        ];

        fieldsToRemove.forEach(field => delete updateData[field]);

        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        if (req.body.managed_company_ids) {
            updateData.managed_companies = {
                set: req.body.managed_company_ids.map((id: number) => ({ id }))
            };
        }

        if (req.body.department_id) {
            updateData.department_id = parseInt(req.body.department_id);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        const { password_hash: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(400).json({ message: 'Error updating user', error });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        await prisma.user.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ message: 'User permanently deleted' });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return res.status(400).json({
                message: 'Cannot delete user because they have associated records (leads, calls, etc.). Please deactivate them instead.'
            });
        }
        res.status(400).json({ message: 'Error deleting user', error });
    }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { status: newStatus, is_active: newStatus === 'ACTIVE' }
        });

        res.json({ message: `User status updated to ${newStatus}` });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling status', error });
    }
};

export const toggleDailyReportEnabled = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { daily_report_enabled: !user.daily_report_enabled }
        });

        res.json({ message: `Daily Report ${updatedUser.daily_report_enabled ? 'enabled' : 'disabled'}`, daily_report_enabled: updatedUser.daily_report_enabled });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling Daily Report setting', error });
    }
};

export const getAllUserTargets = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        const productTargets = await prisma.userProductTarget.findMany({
            where: { user_id: userId },
            include: { product: { select: { id: true, name: true, is_active: true, count_type: true } } },
            orderBy: { product: { name: 'asc' } }
        });

        res.json({ productTargets });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user targets', error });
    }
};

export const getUserProductTargets = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { productId } = req.query;

        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        const target = await prisma.userProductTarget.findUnique({
            where: {
                user_id_product_id: {
                    user_id: parseInt(id),
                    product_id: parseInt(productId as string)
                }
            }
        });

        res.json(target || {});
    } catch (error) {
        console.error(`[USER_DEBUG] Error fetching product targets for user ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching product targets', error });
    }
};

export const updateUserProductTargets = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const currentUser = (req as any).user;
        
        const safeParse = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            const p = parseInt(val);
            return isNaN(p) ? 0 : p;
        };

        const { product_id, sales_target, revenue_target, device_target, partner_target, leads_target, calls_target, digital_leads_target, linkedin_target, direct_visit_target, email_target, linkedin_connection_target, proposals_target, demos_target, activities_target, days } = req.body;

        if (!product_id) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Fetch target user to check reporting relationship
        const targetUser = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: { reporting_manager_id: true }
        });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Role-based access control for achievements and targets
        const isAdmin = currentUser.role === 'CEO';
        // True anywhere the target sits below the caller in the reporting tree
        const isReportingManager = parseInt(id) !== currentUser.id
            && await isInTeam(currentUser.id, parseInt(id));

        if (!isAdmin && !isReportingManager) {
            return res.status(403).json({
                message: 'Only Admin or Reporting Manager can edit targets'
            });
        }

        const upsertData = {
            sales_target: safeParse(sales_target),
            revenue_target: safeParse(revenue_target),
            device_target: safeParse(device_target),
            partner_target: safeParse(partner_target),
            leads_target: safeParse(leads_target),
            calls_target: safeParse(calls_target),
            digital_leads_target: safeParse(digital_leads_target),
            linkedin_target: safeParse(linkedin_target),
            direct_visit_target: safeParse(direct_visit_target),
            email_target: safeParse(email_target),
            linkedin_connection_target: safeParse(linkedin_connection_target),
            proposals_target: safeParse(proposals_target),
            demos_target: safeParse(demos_target),
            activities_target: safeParse(activities_target),
            days: safeParse(days),
        };

        const target = await prisma.userProductTarget.upsert({
            where: {
                user_id_product_id: {
                    user_id: parseInt(id),
                    product_id: parseInt(product_id)
                }
            },
            update: upsertData,
            create: {
                user_id: parseInt(id),
                product_id: parseInt(product_id),
                ...upsertData
            }
        });

        res.json(target);
    } catch (error) {
        console.error(`[USER_DEBUG] Error updating product targets for user ${req.params.id}:`, error);
        res.status(400).json({ message: 'Error updating product targets', error });
    }
};



import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  resolvePrice, createServicePriceVersion, upsertCustomerPrice,
  getMappingPricingHistory, getInstanceAlertSteps, upsertInstanceAlertSteps,
  getMappingHoverData,
} from '../services/renewalPricingService';
import { Decimal } from '@prisma/client/runtime/library';

const uid = (req: Request) => (req as any).user?.id as number;

// ── Service Default Prices ────────────────────────────────────────────────────

// GET /api/renewal-pricing/service/:serviceId/prices
export const listServicePrices = async (req: Request, res: Response) => {
  try {
    const prices = await (prisma as any).renewalServicePrice.findMany({
      where: { service_master_id: parseInt(req.params.serviceId) },
      orderBy: { effective_from: 'desc' },
    });
    res.json({ success: true, data: prices });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-pricing/service/:serviceId/prices
export const createServicePrice = async (req: Request, res: Response) => {
  try {
    const { base_price, billing_unit, currency, effective_from, effective_to, notes } = req.body;
    if (!base_price || !effective_from) {
      return res.status(400).json({ success: false, message: 'base_price and effective_from are required' });
    }
    const created = await createServicePriceVersion(
      parseInt(req.params.serviceId),
      { base_price, billing_unit, currency, effective_from, effective_to, notes },
      uid(req),
    );
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Customer Price Overrides ──────────────────────────────────────────────────

// GET /api/renewal-pricing/customer/:clientId/service/:serviceId
export const getCustomerPrice = async (req: Request, res: Response) => {
  try {
    const active = await (prisma as any).renewalCustomerPrice.findFirst({
      where: {
        client_company_id: parseInt(req.params.clientId),
        service_master_id: parseInt(req.params.serviceId),
        is_active: true,
      },
      orderBy: { effective_from: 'desc' },
    });
    res.json({ success: true, data: active ?? null });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-pricing/customer-prices
export const createCustomerPrice = async (req: Request, res: Response) => {
  try {
    const { client_company_id, service_master_id, override_price, billing_unit, currency, effective_from, effective_to, notes } = req.body;
    if (!client_company_id || !service_master_id || !override_price || !effective_from) {
      return res.status(400).json({ success: false, message: 'client_company_id, service_master_id, override_price, effective_from required' });
    }
    const created = await upsertCustomerPrice(client_company_id, service_master_id, { override_price, billing_unit, currency, effective_from, effective_to, notes }, uid(req));
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/renewal-pricing/customer-prices/:id/deactivate
export const deactivateCustomerPrice = async (req: Request, res: Response) => {
  try {
    const updated = await (prisma as any).renewalCustomerPrice.update({
      where: { id: parseInt(req.params.id) },
      data: { is_active: false },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/renewal-pricing/resolve?instanceId=X
export const resolveInstancePrice = async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.query.instanceId as string);
    if (!instanceId) return res.status(400).json({ success: false, message: 'instanceId required' });

    const instance = await (prisma as any).renewalServiceInstance.findUnique({
      where: { id: instanceId },
      include: { renewal_account: { include: { client_company: true } } },
    });
    if (!instance) return res.status(404).json({ success: false, message: 'Instance not found' });

    const resolved = await resolvePrice(
      instance.renewal_account.client_company_id,
      instance.service_master_id,
      instance.amount_due,
    );
    res.json({ success: true, data: resolved });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/renewal-pricing/history?clientId=X&serviceId=Y
export const getPricingHistory = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.query.clientId as string);
    const serviceId = parseInt(req.query.serviceId as string);
    if (!clientId || !serviceId) return res.status(400).json({ success: false, message: 'clientId and serviceId required' });
    const history = await getMappingPricingHistory(clientId, serviceId);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Alert Steps ───────────────────────────────────────────────────────────────

// GET /api/renewal-pricing/mappings/:instanceId/alert-steps
export const listAlertSteps = async (req: Request, res: Response) => {
  try {
    const steps = await getInstanceAlertSteps(parseInt(req.params.instanceId));
    res.json({ success: true, data: steps });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/renewal-pricing/mappings/:instanceId/alert-steps
export const saveAlertSteps = async (req: Request, res: Response) => {
  try {
    const { steps } = req.body;
    if (!Array.isArray(steps)) return res.status(400).json({ success: false, message: 'steps array required' });
    const saved = await upsertInstanceAlertSteps(parseInt(req.params.instanceId), steps);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Mapping list with hover data ──────────────────────────────────────────────

// GET /api/renewal-pricing/mappings  (enriched service instance list)
export const listMappings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      search, status, category, clientId, page = 1, limit = 25,
      assignedUserId, startDate, endDate,
      sortBy = 'expiry_date', sortOrder = 'asc',
    } = req.query as Record<string, any>;

    const where: any = { is_active: true };
    if (status) where.status = status;
    if (clientId) where.renewal_account = { client_company_id: parseInt(clientId) };
    if (category) where.service_master = { category_id: parseInt(category) };
    if (assignedUserId) {
      if (assignedUserId === 'UNASSIGNED') {
        where.AND = [
          ...(where.AND || []),
          { assigned_user_id: null },
          { renewal_account: { renewal_executive_id: null } },
        ];
      } else {
        const uid = parseInt(assignedUserId);
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { assigned_user_id: uid },
              { AND: [{ assigned_user_id: null }, { renewal_account: { renewal_executive_id: uid } }] },
            ],
          },
        ];
      }
    }
    if (startDate || endDate) {
      where.expiry_date = {};
      if (startDate) where.expiry_date.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.expiry_date.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    if (search) {
      where.OR = [
        { identifier: { contains: search } },
        { renewal_account: { client_company: { name: { contains: search } } } },
        { service_master: { name: { contains: search } } },
      ];
    }
    if (user.role === 'SalesPerson') where.assigned_user_id = user.id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const direction = sortOrder === 'desc' ? 'desc' : 'asc';
    const orderFields: Record<string, any> = {
      expiry_date: { expiry_date: direction },
      created_at: { created_at: direction },
      identifier: { identifier: direction },
      status: { status: direction },
      assigned_user: { assigned_user_id: direction },
      client: { renewal_account: { client_company: { name: direction } } },
      category: { service_master: { category: { name: direction } } },
      service: { service_master: { name: direction } },
      customer_contact: { customer_contact: { name: direction } },
    };
    const orderField = orderFields[sortBy] || orderFields.expiry_date;

    const [rows, total, customAlertSteps, missingContactLinks, overrideAggregate] = await Promise.all([
      (prisma as any).renewalServiceInstance.findMany({
        where,
        skip,
        take,
        orderBy: orderField,
        include: {
          renewal_account: {
            include: {
              client_company: { select: { id: true, name: true } },
            },
          },
          service_master: {
            include: {
              category: { select: { id: true, name: true, code: true, color: true } },
            },
          },
          customer_contact: { select: { id: true, name: true, email: true, mobile: true, designation: true } },
          instance_alert_steps: {
            where: { is_active: true },
            orderBy: { step_number: 'asc' },
            select: { id: true, days_before: true, channel: true, step_number: true },
          },
          _count: { select: { instance_alert_steps: true } },
        },
      }),
      (prisma as any).renewalServiceInstance.count({ where }),
      (prisma as any).renewalInstanceAlertStep.count({
        where: { is_active: true, service_instance: { is: where } },
      }),
      (prisma as any).renewalServiceInstance.count({
        where: { ...where, customer_contact_id: null },
      }),
      (prisma as any).renewalCustomerPrice.aggregate({
        where: { is_active: true },
        _sum: { override_price: true },
      }),
    ]);

    // Lightweight resolved price for list (no extra DB call — uses legacy instance value for speed)
    const assignedUserIds = Array.from(new Set(rows.map((row: any) => row.assigned_user_id).filter(Boolean)));
    const assignedUsers = assignedUserIds.length > 0
      ? await (prisma as any).user.findMany({
          where: { id: { in: assignedUserIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];
    const assignedUserMap = new Map<number, any>(assignedUsers.map((user: any) => [user.id, user]));

    const enriched = rows.map((r: any) => {
      const assignedUser = assignedUserMap.get(r.assigned_user_id) || r.renewal_account?.renewal_executive || null;
      const assignedName = assignedUser
        ? `${assignedUser.first_name} ${assignedUser.last_name ?? ''}`.trim()
        : null;
      return {
        ...r,
        alert_steps: r.instance_alert_steps,
        assigned_user: assignedUser
          ? {
              id: assignedUser.id,
              first_name: assignedUser.first_name,
              last_name: assignedUser.last_name,
              name: assignedName,
            }
          : null,
        has_custom_alert: r.instance_alert_steps.length > 0,
      };
    });

    res.json({
      success: true,
      data: enriched,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      stats: {
        customAlertSteps,
        missingContactLinks,
        priceOverrideTotal: Number(overrideAggregate?._sum?.override_price || 0),
      },
    });
  } catch (err: any) {
    console.error('[listMappings]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/renewal-pricing/mappings/:id/hover
export const getMappingHover = async (req: Request, res: Response) => {
  try {
    const data = await getMappingHoverData(parseInt(req.params.id));
    if (!data) return res.status(404).json({ success: false, message: 'Mapping not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/renewal-pricing/mappings/:id  (full detail)
export const getMappingDetail = async (req: Request, res: Response) => {
  try {
    const instance = await (prisma as any).renewalServiceInstance.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        renewal_account: {
          include: {
            client_company: true,
            account_manager: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        service_master: { include: { category: true } },
        provider: true,
        customer_contact: true,
        reminder_policy: { include: { steps: true } },
        instance_alert_steps: {
          where: { is_active: true },
          orderBy: { step_number: 'asc' },
        },
        cycles: {
          orderBy: { cycle_number: 'desc' },
          take: 3,
          include: {
            payments: {
              orderBy: { payment_date: 'desc' },
              include: { collected_by: { select: { id: true, first_name: true, last_name: true } } },
            },
            reminders: { where: { status: { not: 'SKIPPED' } } },
          },
        },
        follow_up_logs: {
          orderBy: { logged_at: 'desc' },
          take: 10,
          include: { logged_by: { select: { id: true, first_name: true, last_name: true } } },
        },
      },
    });

    if (!instance) return res.status(404).json({ success: false, message: 'Mapping not found' });
    (instance as any).alert_steps = instance.instance_alert_steps || [];

    // Format User names dynamically for frontend compatibility
    if (instance.renewal_account.account_manager) {
      const am = instance.renewal_account.account_manager;
      (instance.renewal_account.account_manager as any).name = `${am.first_name} ${am.last_name ?? ''}`.trim();
    }
    const assignedUser = instance.assigned_user_id
      ? await (prisma as any).user.findUnique({
          where: { id: instance.assigned_user_id },
          select: { id: true, first_name: true, last_name: true },
        })
      : null;
    (instance as any).assigned_user = assignedUser
      ? { ...assignedUser, name: `${assignedUser.first_name} ${assignedUser.last_name ?? ''}`.trim() }
      : null;
    if (instance.follow_up_logs) {
      instance.follow_up_logs.forEach((log: any) => {
        if (log.logged_by) {
          log.logged_by.name = `${log.logged_by.first_name} ${log.logged_by.last_name ?? ''}`.trim();
        }
      });
    }

    const [pricingHistory, resolvedPrice] = await Promise.all([
      getMappingPricingHistory(
        instance.renewal_account.client_company_id,
        instance.service_master_id,
      ),
      resolvePrice(
        instance.renewal_account.client_company_id,
        instance.service_master_id,
        instance.amount_due,
      ),
    ]);

    res.json({ success: true, data: { ...instance, pricing_history: pricingHistory, resolved_price: resolvedPrice } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Draft Queue ───────────────────────────────────────────────────────────────

// GET /api/renewal-pricing/drafts
export const listDrafts = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20, mappingId, search } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { requires_approval: true };
    if (status) where.status = status;
    if (mappingId) {
      where.mapping_context = { contains: `"instance_id":${parseInt(mappingId)}` };
    }
    if (search) {
      where.OR = [
        { recipient: { contains: String(search) } },
        { subject:   { contains: String(search) } },
        { body:      { contains: String(search) } },
      ];
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [rows, total, pendingCount, approvedToday, queuedCount, skippedCount] = await Promise.all([
      (prisma as any).notificationOutbox.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' },
        include: { approved_by: { select: { id: true, first_name: true, last_name: true } } },
      }),
      (prisma as any).notificationOutbox.count({ where }),
      (prisma as any).notificationOutbox.count({ where: { requires_approval: true, status: 'PENDING_APPROVAL' } }),
      (prisma as any).notificationOutbox.count({ where: { requires_approval: true, status: 'QUEUED', approved_at: { gte: todayStart } } }),
      (prisma as any).notificationOutbox.count({ where: { requires_approval: true, status: 'QUEUED' } }),
      (prisma as any).notificationOutbox.count({ where: { requires_approval: true, status: 'SKIPPED' } }),
    ]);

    // Map status → approval_status for frontend compatibility
    const data = rows.map((r: any) => ({
      ...r,
      approval_status: r.status === 'QUEUED' ? 'APPROVED' : r.status === 'SKIPPED' ? 'SKIPPED' : 'PENDING',
    }));

    res.json({
      success: true,
      data,
      total,
      pending_count: pendingCount,
      counts: { pending: pendingCount, approved: approvedToday, queued: queuedCount, skipped: skippedCount },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// POST /api/renewal-pricing/drafts/:id/approve
export const approveDraft = async (req: Request, res: Response) => {
  try {
    const updated = await (prisma as any).notificationOutbox.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'QUEUED', approved_by_id: uid(req), approved_at: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-pricing/drafts/:id/skip
export const skipDraft = async (req: Request, res: Response) => {
  try {
    const updated = await (prisma as any).notificationOutbox.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'SKIPPED' },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-pricing/drafts/approve-bulk
export const approveDraftsBulk = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: 'ids array required' });
    await (prisma as any).notificationOutbox.updateMany({
      where: { id: { in: ids }, requires_approval: true, status: 'PENDING_APPROVAL' },
      data: { status: 'QUEUED', approved_by_id: uid(req), approved_at: new Date() },
    });
    res.json({ success: true, message: `${ids.length} drafts approved` });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Brand Profiles ────────────────────────────────────────────────────────────

// GET /api/renewal-pricing/brand-profiles
export const listBrandProfiles = async (_req: Request, res: Response) => {
  try {
    const profiles = await (prisma as any).renewalBrandProfile.findMany({
      where: { is_active: true },
      orderBy: [{ is_default: 'desc' }, { profile_name: 'asc' }],
    });
    res.json({ success: true, data: profiles });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-pricing/brand-profiles
export const createBrandProfile = async (req: Request, res: Response) => {
  try {
    const { profile_name, company_name, primary_color, secondary_color, sender_name, sender_email, reply_to_email, phone, website_url, email_footer } = req.body;
    if (!sender_email) return res.status(400).json({ success: false, message: 'sender_email required' });
    const created = await (prisma as any).renewalBrandProfile.create({
      data: {
        profile_name: profile_name || company_name || 'Default',
        company_name, primary_color, secondary_color,
        sender_name, sender_email, reply_to_email, phone, website_url, email_footer,
      },
    });
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/renewal-pricing/brand-profiles/:id
export const updateBrandProfile = async (req: Request, res: Response) => {
  try {
    const { profile_name, company_name, primary_color, secondary_color, sender_name, sender_email, reply_to_email, phone, website_url, email_footer } = req.body;
    const data: Record<string, any> = { primary_color, secondary_color, sender_name, sender_email, reply_to_email, phone, website_url, email_footer };
    if (company_name !== undefined) data.company_name = company_name;
    if (profile_name !== undefined) data.profile_name = profile_name;
    else if (company_name) data.profile_name = company_name;
    const updated = await (prisma as any).renewalBrandProfile.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-pricing/brand-profiles/:id/logo  (Multer handles file)
export const uploadBrandLogo = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/${file.filename}`;
    const updated = await (prisma as any).renewalBrandProfile.update({
      where: { id: parseInt(req.params.id) },
      data: { logo_url: url },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-pricing/trigger-alerts
export const triggerAlertsManual = async (_req: Request, res: Response) => {
  try {
    const { processInstanceAlertSteps } = require('../cron/renewalReminderCron');
    const { processOutbox } = require('../services/notificationOutboxService');
    await processInstanceAlertSteps();
    await processOutbox();
    res.json({ success: true, message: 'Alert step checking triggered, and email outbox processor execution finished.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

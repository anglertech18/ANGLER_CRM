import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createRenewalAccount,
  activateRenewalAccount,
  getRenewalAccounts,
  getRenewalAccountById,
  updateRenewalAccount,
} from '../services/renewalService';
import { logAudit } from '../utils/renewalAudit';
import { upload } from '../utils/upload';
import { generateRemindersForCycle } from '../services/reminderGeneratorService';
import { renewCycle } from '../services/renewalCycleService';
import { getFollowUpTasksByServiceInstance } from '../services/renewalFollowUpTaskService';
import { getCommunicationTimeline } from '../services/renewalCommunicationEventService';

const ip = (req: Request) => req.ip ?? req.socket.remoteAddress ?? '';

// GET /api/renewals
export const listRenewals = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await getRenewalAccounts(req.query, user.id, user.role);
    res.json(result);
  } catch (err: any) {
    console.error('[renewalController.listRenewals]', err);
    res.status(500).json({ message: 'Error fetching renewals', detail: err.message });
  }
};

// GET /api/renewals/:id
export const getRenewal = async (req: Request, res: Response) => {
  try {
    const account = await getRenewalAccountById(parseInt(req.params.id));
    if (!account) return res.status(404).json({ message: 'Renewal not found' });
    res.json(account);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching renewal', detail: err.message });
  }
};

// POST /api/renewals
export const createRenewal = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const account = await createRenewalAccount(req.body, user.id, ip(req));
    res.status(201).json(account);
  } catch (err: any) {
    console.error('[renewalController.createRenewal]', err);
    res.status(400).json({ message: 'Error creating renewal', detail: err.message });
  }
};

// PUT /api/renewals/:id
export const updateRenewal = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const updated = await updateRenewalAccount(id, req.body, user.id, ip(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating renewal', detail: err.message });
  }
};

// POST /api/renewals/:id/activate
export const activateRenewal = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const results = await activateRenewalAccount(id, user.id, ip(req));
    if (results.failed > 0 && results.activated === 0) {
      return res.status(400).json({ message: 'Activation failed for all services', errors: results.errors });
    }
    res.json({
      message: results.failed > 0
        ? `Activated ${results.activated} service(s), ${results.failed} failed`
        : 'Renewal activated successfully',
      results,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/renewals/:id  (soft delete)
export const deleteRenewal = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.renewalAccount.update({ where: { id }, data: { is_active: false } });
      await tx.renewalServiceInstance.updateMany({ where: { renewal_account_id: id }, data: { is_active: false } });
    });
    await logAudit({ accountId: id, entityType: 'ACCOUNT', entityId: id, action: 'DELETED', performedById: user.id, ip: ip(req) });
    res.json({ message: 'Renewal deleted' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error deleting renewal', detail: err.message });
  }
};

// ── Service Instances ─────────────────────────────────────────────────────────

// POST /api/renewals/:id/services
export const addService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accountId = parseInt(req.params.id);
    const svc = await (prisma as any).renewalServiceInstance.create({
      data: { ...req.body, renewal_account_id: accountId },
      include: { service_master: { include: { category: true } }, provider: true },
    });
    await logAudit({ accountId, entityType: 'SERVICE', entityId: svc.id, action: 'CREATED', newValue: JSON.stringify(req.body), performedById: user.id, ip: ip(req) });
    res.status(201).json(svc);
  } catch (err: any) {
    res.status(400).json({ message: 'Error adding service', detail: err.message });
  }
};

// PUT /api/renewals/:id/services/:svcId
export const updateService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accountId = parseInt(req.params.id);
    const svcId = parseInt(req.params.svcId);
    const old = await (prisma as any).renewalServiceInstance.findUnique({ where: { id: svcId } });
    const updated = await (prisma as any).renewalServiceInstance.update({
      where: { id: svcId },
      data: req.body,
      include: { service_master: { include: { category: true } }, provider: true },
    });
    await logAudit({ accountId, entityType: 'SERVICE', entityId: svcId, action: 'UPDATED', oldValue: JSON.stringify(old), newValue: JSON.stringify(req.body), performedById: user.id, ip: ip(req) });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating service', detail: err.message });
  }
};

// POST /api/renewals/:id/services/:svcId/renew
export const renewService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accountId = parseInt(req.params.id);
    const svcId = parseInt(req.params.svcId);
    const { cycle_id, new_amount } = req.body;

    if (!cycle_id || new_amount === undefined) {
      return res.status(400).json({ message: 'cycle_id and new_amount are required' });
    }

    const nextCycle = await renewCycle(parseInt(cycle_id), user.id, parseFloat(new_amount));
    await logAudit({ accountId, entityType: 'SERVICE', entityId: svcId, action: 'RENEWED', newValue: JSON.stringify({ cycle_id, new_amount }), performedById: user.id, ip: ip(req) });
    res.json(nextCycle);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/renewals/:id/services/:svcId/mark-not-renewing
export const markNotRenewing = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accountId = parseInt(req.params.id);
    const svcId = parseInt(req.params.svcId);
    const { reason, cycle_id } = req.body;

    await (prisma as any).renewalServiceInstance.update({ where: { id: svcId }, data: { status: 'NOT_RENEWING' } });
    if (cycle_id) {
      await (prisma as any).renewalCycle.update({ where: { id: parseInt(cycle_id) }, data: { status: 'NOT_RENEWING', not_renewing_reason: reason ?? null } });
      await (prisma as any).renewalReminder.updateMany({ where: { cycle_id: parseInt(cycle_id), status: { in: ['PENDING', 'DUE'] } }, data: { status: 'CANCELLED' } });
    }
    await logAudit({ accountId, entityType: 'SERVICE', entityId: svcId, action: 'STATUS_CHANGED', newValue: JSON.stringify({ status: 'NOT_RENEWING', reason }), performedById: user.id, ip: ip(req) });
    res.json({ message: 'Service marked as not renewing' });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ── Payments ──────────────────────────────────────────────────────────────────

// POST /api/renewals/:id/payments
export const addPayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accountId = parseInt(req.params.id);
    const { cycle_id, amount, payment_date, payment_mode, reference, remarks } = req.body;

    if (!cycle_id || !amount || !payment_date) {
      return res.status(400).json({ message: 'cycle_id, amount and payment_date are required' });
    }

    const payment = await (prisma as any).renewalPayment.create({
      data: {
        cycle_id: parseInt(cycle_id),
        amount: parseFloat(amount),
        payment_date: new Date(payment_date),
        collected_by_id: user.id,
        payment_mode: payment_mode ?? null,
        reference: reference ?? null,
        remarks: remarks ?? null,
      },
    });

    // Use aggregate _sum instead of findMany+reduce to avoid loading all payment rows
    const [paymentAgg, cycle] = await Promise.all([
      (prisma as any).renewalPayment.aggregate({ where: { cycle_id: parseInt(cycle_id) }, _sum: { amount: true } }),
      (prisma as any).renewalCycle.findUnique({ where: { id: parseInt(cycle_id) }, select: { amount_due: true } }),
    ]);
    const totalCollected = parseFloat(paymentAgg._sum?.amount ?? 0);
    const outstanding = parseFloat(cycle.amount_due) - totalCollected;
    await (prisma as any).renewalCycle.update({ where: { id: parseInt(cycle_id) }, data: { amount_collected: totalCollected, outstanding: Math.max(0, outstanding) } });

    await logAudit({ accountId, entityType: 'PAYMENT', entityId: payment.id, action: 'PAYMENT_ADDED', newValue: JSON.stringify({ amount, payment_date }), performedById: user.id, ip: ip(req) });
    res.status(201).json(payment);
  } catch (err: any) {
    res.status(400).json({ message: 'Error adding payment', detail: err.message });
  }
};

// ── Documents ─────────────────────────────────────────────────────────────────

// POST /api/renewals/:id/documents
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accountId = parseInt(req.params.id);
    const file = (req as any).file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const doc = await (prisma as any).renewalDocument.create({
      data: {
        renewal_account_id: accountId,
        document_type: req.body.document_type ?? 'OTHER',
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        uploaded_by_id: user.id,
      },
    });
    res.status(201).json(doc);
  } catch (err: any) {
    res.status(400).json({ message: 'Error uploading document', detail: err.message });
  }
};

// POST /api/renewals/:id/generate-pdf
export const generatePdfDocument = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accountId = parseInt(req.params.id);
    const { generateOrderFormPDF } = await import('../utils/orderFormPdfGenerator');
    const pdfResult = await generateOrderFormPDF(accountId);

    const doc = await (prisma as any).renewalDocument.create({
      data: {
        renewal_account_id: accountId,
        document_type: 'ORDER_FORM',
        name: `ANGLER Order Form #${accountId}`,
        url: pdfResult.relativeUrl,
        uploaded_by_id: user.id,
      },
    });

    res.status(201).json({ message: 'Order Form PDF generated successfully', document: doc, pdfResult });
  } catch (err: any) {
    console.error('[renewalController.generatePdfDocument]', err);
    res.status(400).json({ message: 'Error generating PDF document', detail: err.message });
  }
};

// POST /api/renewals/:id/generate-proforma-invoice
export const generateProformaInvoicePdf = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accountId = parseInt(req.params.id);
    const { generateProformaInvoicePDF } = await import('../utils/proformaInvoicePdfGenerator');
    const pdfResult = await generateProformaInvoicePDF(accountId);

    const doc = await (prisma as any).renewalDocument.create({
      data: {
        renewal_account_id: accountId,
        document_type: 'PROFORMA_INVOICE',
        name: `${pdfResult.companyName.split(' ')[0].toUpperCase()} Proforma Invoice ${pdfResult.invoiceNo}`,
        url: pdfResult.relativeUrl,
        uploaded_by_id: user.id,
      },
    });

    res.status(201).json({ message: 'Proforma Invoice PDF generated successfully', document: doc, pdfResult });
  } catch (err: any) {
    console.error('[renewalController.generateProformaInvoicePdf]', err);
    res.status(400).json({ message: 'Error generating Proforma Invoice PDF', detail: err.message });
  }
};

// POST /api/renewals/preview-pdf
export const previewPdfDocument = async (req: Request, res: Response) => {
  try {
    const { client_company_id, company_id, client_name, services = [], order_number, order_date, po_reference } = req.body;
    let clientCompany: any = null;
    let company: any = null;

    if (client_company_id) {
      clientCompany = await (prisma as any).clientCompany.findUnique({
        where: { id: parseInt(String(client_company_id)) },
        include: { renewal_contacts: { where: { is_active: true } } }
      });
    }

    if (company_id && !isNaN(Number(company_id))) {
      company = await (prisma as any).company.findUnique({
        where: { id: parseInt(String(company_id)) }
      });
    }

    if (!company) {
      company = await (prisma as any).company.findFirst({
        where: { is_active: true }
      });
    }

    const serviceMasters = await (prisma as any).renewalServiceMaster.findMany({
      where: { id: { in: services.map((s: any) => parseInt(String(s.service_master_id))).filter(Boolean) } }
    });
    const masterMap = new Map(serviceMasters.map((m: any) => [m.id, m]));

    const cleanServices = services.map((svc: any) => ({
      ...svc,
      amount_due: parseFloat(String(svc.amount_due)) || 0,
      activation_date: svc.activation_date ? new Date(svc.activation_date) : null,
      expiry_date: svc.expiry_date ? new Date(svc.expiry_date) : null,
      service_master: masterMap.get(parseInt(String(svc.service_master_id))) || { name: svc.service_name || 'Service' },
    }));

    const draftAccount = {
      id: 0,
      order_number: order_number || 'DRAFT-PREVIEW',
      order_date: order_date ? new Date(order_date) : new Date(),
      po_reference: po_reference || null,
      created_at: new Date(),
      client_company: clientCompany || { name: client_name || 'Draft Client' },
      company: company || { name: 'ANGLER Technologies India Pvt Ltd.,' },
      services: cleanServices,
    };

    const { generateOrderFormPDF } = await import('../utils/orderFormPdfGenerator');
    const pdfResult = await generateOrderFormPDF(draftAccount);

    res.json({ success: true, pdfResult });
  } catch (err: any) {
    console.error('[renewalController.previewPdfDocument]', err);
    res.status(400).json({ message: 'Error generating PDF preview', detail: err.message });
  }
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

// GET /api/renewals/dashboard
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { month, companyId, categoryId, userId: filterUserId } = req.query;

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (month) {
      const [year, m] = String(month).split('-').map(Number);
      periodStart = new Date(year, m - 1, 1);
      periodEnd = new Date(year, m, 0, 23, 59, 59);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const baseWhere: any = { expiry_date: { gte: periodStart, lte: periodEnd } };
    if (companyId) baseWhere.renewal_account = { company_id: parseInt(String(companyId)) };
    if (categoryId) baseWhere.service_master = { category_id: parseInt(String(categoryId)) };
    if (filterUserId) baseWhere.assigned_user_id = parseInt(String(filterUserId));

    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [
      dueCycles, renewedCycles, amountAgg, paymentAgg,
      expiringIn7, overdue,
      todayReminders,
    ] = await Promise.all([
      (prisma as any).renewalCycle.count({ where: { ...baseWhere, is_active: true } }),
      (prisma as any).renewalCycle.count({ where: { ...baseWhere, status: 'RENEWED' } }),
      // Aggregate instead of fetching entire cycles list
      (prisma as any).renewalCycle.aggregate({ where: baseWhere, _sum: { amount_due: true } }),
      // Aggregate instead of findMany payments + JS reduce
      (prisma as any).renewalPayment.aggregate({ where: { cycle: baseWhere }, _sum: { amount: true } }),
      (prisma as any).renewalServiceInstance.count({
        where: { expiry_date: { gte: now, lte: new Date(Date.now() + 7 * 86400000) }, is_active: true },
      }),
      (prisma as any).renewalServiceInstance.count({
        where: { expiry_date: { lt: now }, status: { notIn: ['RENEWED', 'NOT_RENEWING', 'CANCELLED'] }, is_active: true },
      }),
      (prisma as any).renewalReminder.count({
        where: { status: { in: ['DUE', 'PENDING'] }, due_date: { gte: todayStart, lte: todayEnd } },
      }),
    ]);

    const totalDue = parseFloat(amountAgg._sum?.amount_due ?? 0);
    const totalCollected = parseFloat(paymentAgg._sum?.amount ?? 0);

    res.json({
      due_this_period: dueCycles,
      renewed: renewedCycles,
      renewal_pct: dueCycles > 0 ? Math.round((renewedCycles / dueCycles) * 100) : 0,
      amount_due: totalDue,
      amount_collected: totalCollected,
      collection_pct: totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0,
      expiring_in_7_days: expiringIn7,
      overdue,
      today_followups: todayReminders,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching dashboard', detail: err.message });
  }
};

// GET /api/renewals/preview-reminders
export const previewReminders = async (req: Request, res: Response) => {
  try {
    const { expiry_date, policy_id } = req.query;
    if (!expiry_date || !policy_id) {
      return res.status(400).json({ message: 'expiry_date and policy_id are required' });
    }

    const policy = await (prisma as any).renewalReminderPolicy.findUnique({
      where: { id: parseInt(String(policy_id)) },
      include: { steps: { orderBy: { step_number: 'asc' } } },
    });
    if (!policy) return res.status(404).json({ message: 'Policy not found' });

    const expiry = new Date(String(expiry_date));
    const preview = policy.steps
      .filter((s: any) => s.is_enabled)
      .map((s: any) => {
        const dueDate = new Date(expiry.getTime() + s.offset_days * 86400000);
        return {
          step_number: s.step_number,
          offset_days: s.offset_days,
          due_date: dueDate.toISOString().split('T')[0],
          action_type: s.action_type,
          channel: s.channel,
          recipient_type: s.recipient_type,
          is_mandatory: s.is_mandatory,
        };
      });

    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ message: 'Error previewing reminders', detail: err.message });
  }
};

// GET /api/renewals/:id/follow-up-tasks
// Get grouped follow-up tasks for a renewal account
export const getRenewalFollowUpTasks = async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    const { service_instance_id, cycle_id, status } = req.query;

    // Get all services for the account
    const services = await (prisma as any).renewalServiceInstance.findMany({
      where: {
        renewal_account_id: accountId,
        is_active: true,
        ...(service_instance_id && { id: parseInt(String(service_instance_id)) }),
      },
      include: {
        cycles: {
          where: {
            is_active: true,
            ...(cycle_id && { id: parseInt(String(cycle_id)) }),
          },
          orderBy: { cycle_number: 'desc' },
        },
      },
    });

    const allTasks = [];

    for (const service of services) {
      for (const cycle of service.cycles) {
        const tasks = await getFollowUpTasksByServiceInstance(service.id, cycle.id, {
          status: status as string,
        });
        allTasks.push(...tasks);
      }
    }

    res.json(allTasks);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching follow-up tasks', detail: err.message });
  }
};

// GET /api/renewals/:id/communication-timeline
// Get communication timeline for a renewal account
export const getRenewalCommunicationTimeline = async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    const { from, to, channel, limit } = req.query;

    const events = await getCommunicationTimeline(accountId, {
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      channel: channel as string,
      limit: limit ? parseInt(String(limit)) : undefined,
    });

    res.json(events);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching communication timeline', detail: err.message });
  }
};

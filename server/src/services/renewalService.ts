import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';
import { openFirstCycle } from './renewalCycleService';
import { logAudit } from '../utils/renewalAudit';
import { resolveServiceFieldRules } from './renewalFieldRuleResolver';

export async function createRenewalAccount(data: any, userId: number, ip?: string): Promise<any> {
  const { services = [], contact_ids = [], ...accountData } = data;

  if (!accountData.client_company_id && accountData.client_name) {
    const normalized = String(accountData.client_name).trim();
    let company = await (prisma as any).clientCompany.findFirst({
      where: { name: { equals: normalized } }
    });
    if (!company) {
      company = await (prisma as any).clientCompany.create({ data: { name: normalized } });
    }
    accountData.client_company_id = company.id;
  }

  if (!accountData.client_company_id) {
    throw new Error('Client company selection or name is required');
  }

  const cleanAccountData: any = {
    company_id: accountData.company_id ? parseInt(String(accountData.company_id)) : null,
    client_company_id: parseInt(String(accountData.client_company_id)),
    account_manager_id: accountData.account_manager_id ? parseInt(String(accountData.account_manager_id)) : null,
    renewal_executive_id: (accountData.renewal_executive_id || accountData.assigned_executive_id)
      ? parseInt(String(accountData.renewal_executive_id || accountData.assigned_executive_id))
      : null,
    source_lead_id: accountData.source_lead_id ? parseInt(String(accountData.source_lead_id)) : null,
    order_number: accountData.order_number || null,
    order_date: accountData.order_date ? new Date(accountData.order_date) : null,
    po_reference: accountData.po_reference || null,
    invoice_number: accountData.invoice_number || null,
    invoice_date: accountData.invoice_date ? new Date(accountData.invoice_date) : null,
    notes: accountData.notes || null,
    status: accountData.status || 'DRAFT',
    created_by_id: userId,
  };

  const errors: string[] = [];
  const cleanServices: any[] = [];

  for (let i = 0; i < services.length; i++) {
    const svc = services[i];
    if (!svc.service_master_id) errors.push(`Service #${i + 1}: service_master_id is required`);

    const cleanSvc = {
      service_master_id: parseInt(String(svc.service_master_id)),
      identifier: svc.identifier || null,
      provider_id: svc.provider_id ? parseInt(String(svc.provider_id)) : null,
      email_count: svc.email_count ? parseInt(String(svc.email_count)) : null,
      provider_type: svc.provider_type || null,
      server_name: svc.server_name || null,
      plan_name: svc.plan_name || null,
      quantity: parseInt(String(svc.quantity)) || 1,
      activation_date: svc.activation_date ? new Date(svc.activation_date) : null,
      expiry_date: svc.expiry_date ? new Date(svc.expiry_date) : null,
      duration_value: parseInt(String(svc.duration_value)) || parseInt(String(svc.duration)) || 12,
      duration_unit: svc.duration_unit || 'months',
      amount_due: parseFloat(String(svc.amount_due)) || 0,
      amc_amount: parseFloat(String(svc.amc_amount)) || 0,
      support_amount: parseFloat(String(svc.support_amount)) || 0,
      assigned_user_id: svc.assigned_user_id ? parseInt(String(svc.assigned_user_id)) : null,
      customer_contact_id: svc.customer_contact_id ? parseInt(String(svc.customer_contact_id)) : null,
      reminder_policy_id: svc.reminder_policy_id ? parseInt(String(svc.reminder_policy_id)) : null,
      status: svc.status || 'ACTIVE',
      remarks: svc.remarks || null,
      order_number: svc.order_number || accountData.order_number || null,
      order_date: svc.order_date ? new Date(svc.order_date) : (accountData.order_date ? new Date(accountData.order_date) : null),
      po_reference: svc.po_reference || accountData.po_reference || null,
      invoice_number: svc.invoice_number || accountData.invoice_number || null,
      invoice_date: svc.invoice_date ? new Date(svc.invoice_date) : (accountData.invoice_date ? new Date(accountData.invoice_date) : null),
    };

    if (cleanSvc.customer_contact_id && !contact_ids.includes(cleanSvc.customer_contact_id)) {
      contact_ids.push(cleanSvc.customer_contact_id);
    }

    try {
      const fieldRules = await resolveServiceFieldRules(cleanSvc.service_master_id, cleanAccountData.company_id);
      if (fieldRules.identifier.required && !cleanSvc.identifier) {
        errors.push(`Service #${i + 1}: ${fieldRules.identifier.label} is required`);
      }
      if (fieldRules.provider.required && !cleanSvc.provider_id) {
        errors.push(`Service #${i + 1}: Service Provider is required`);
      }
      if (fieldRules.serverName.required && !cleanSvc.server_name) {
        errors.push(`Service #${i + 1}: Server Name is required`);
      }
      if (fieldRules.planName.required && !cleanSvc.plan_name) {
        errors.push(`Service #${i + 1}: Service Plan is required`);
      }
      if (fieldRules.loginUsername.required && !(cleanSvc as any).login_username) {
        errors.push(`Service #${i + 1}: Login Username is required`);
      }
      if (fieldRules.quantity.required && (!cleanSvc.quantity || cleanSvc.quantity < 1)) {
        errors.push(`Service #${i + 1}: ${fieldRules.quantity.label} is required`);
      }
    } catch (ruleErr: any) {
      console.warn(`[createRenewalAccount] Could not resolve field rules for service master #${cleanSvc.service_master_id}:`, ruleErr.message);
    }

    cleanServices.push(cleanSvc);
  }
  if (errors.length > 0) throw new Error(errors.join('; '));

  const account = await (prisma as any).$transaction(async (tx: any) => {
    const acct = await tx.renewalAccount.create({ data: cleanAccountData });

    if (contact_ids.length > 0) {
      await tx.renewalAccountContact.createMany({
        data: contact_ids.map((cid: number) => ({ renewal_account_id: acct.id, contact_id: cid })),
        skipDuplicates: true,
      });
    }

    for (const svc of cleanServices) {
      await tx.renewalServiceInstance.create({
        data: { ...svc, renewal_account_id: acct.id },
      });
    }

    return acct;
  });

  await logAudit({ accountId: account.id, entityType: 'ACCOUNT', entityId: account.id, action: 'CREATED', newValue: JSON.stringify(cleanAccountData), performedById: userId, ip });

  // Note: Creation/activation prepares records and cycle reminders.
  // Zero customer emails or PDF dispatches are triggered on creation.
  // All dispatches occur strictly via configured follow-up/reminder policy steps when due.
  return account;
}

export async function activateRenewalAccount(accountId: number, userId: number, ip?: string): Promise<{ activated: number; failed: number; errors: string[] }> {
  const account = await (prisma as any).renewalAccount.findUnique({
    where: { id: accountId },
    include: { services: true },
  });
  if (!account) throw new Error('Renewal account not found');

  const results = { activated: 0, failed: 0, errors: [] as string[] };

  for (const svc of account.services) {
    if (svc.status === 'ACTIVE' && svc.expiry_date) {
      try {
        await openFirstCycle(svc.id);
        results.activated++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Service #${svc.id} (${svc.identifier || svc.service_master_id || 'unknown'}): ${err.message}`);
      }
    }
  }

  if (results.activated > 0) {
    await (prisma as any).renewalAccount.update({
      where: { id: accountId },
      data: { status: 'ACTIVE' },
    });
  }

  await logAudit({ accountId, entityType: 'ACCOUNT', entityId: accountId, action: 'STATUS_CHANGED', newValue: JSON.stringify({ status: 'ACTIVE', activation_results: results }), performedById: userId, ip });

  return results;
}

export async function getRenewalAccounts(filters: any, userId: number, userRole: string) {
  const {
    search, status, category, assignedUser, companyId,
    clientCompanyId, expiryFrom, expiryTo,
    page = 1, limit = 25, sortBy = 'created_at', sortOrder = 'desc',
  } = filters;

  const where: any = { is_active: true, AND: [] };

  // Row-level access — SalesPerson only sees assigned records
  if (userRole === 'SalesPerson') {
    where.AND.push({
      OR: [
        { created_by_id: userId },
        { account_manager_id: userId },
        { renewal_executive_id: userId },
        { services: { some: { assigned_user_id: userId } } },
      ],
    });
  }

  if (search) {
    where.AND.push({
      OR: [
        { client_company: { name: { contains: search } } },
        { order_number: { contains: search } },
        { services: { some: { identifier: { contains: search } } } },
      ],
    });
  }
  if (status) where.AND.push({ status });
  if (companyId) where.AND.push({ company_id: parseInt(companyId) });
  if (clientCompanyId) where.AND.push({ client_company_id: parseInt(clientCompanyId) });
  if (assignedUser === 'UNASSIGNED') {
    where.AND.push({
      AND: [
        { renewal_executive_id: null },
        { services: { some: { assigned_user_id: null, is_active: true } } },
      ],
    });
  } else if (assignedUser) {
    const uid = parseInt(assignedUser);
    where.AND.push({
      OR: [
        { renewal_executive_id: uid },
        { services: { some: { assigned_user_id: uid } } },
      ],
    });
  }
  if (category) where.AND.push({ services: { some: { service_master: { category_id: parseInt(category) } } } });
  if (expiryFrom || expiryTo) {
    const expiryFilter: any = {};
    if (expiryFrom) expiryFilter.gte = dayjs(String(expiryFrom)).startOf('day').toDate();
    if (expiryTo) expiryFilter.lte = dayjs(String(expiryTo)).endOf('day').toDate();
    where.AND.push({ services: { some: { expiry_date: expiryFilter } } });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [total, accounts] = await Promise.all([
    (prisma as any).renewalAccount.count({ where }),
    (prisma as any).renewalAccount.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        client_company: { select: { id: true, name: true } },
        account_manager: { select: { id: true, first_name: true, last_name: true } },
        services: {
          where: { is_active: true },
          include: {
            service_master: { include: { category: true } },
            provider: { select: { id: true, name: true } },
            cycles: {
              where: { is_active: true },
              orderBy: { cycle_number: 'desc' },
              take: 1,
              select: {
                id: true, cycle_number: true, status: true,
                activation_date: true, expiry_date: true,
                amount_due: true, amount_collected: true, outstanding: true,
              },
            },
          },
        },
        _count: { select: { services: true, documents: true } },
      },
    }),
  ]);

  return { data: accounts, total, page: parseInt(page), limit: parseInt(limit) };
}

export async function getRenewalAccountById(id: number) {
  const account = await (prisma as any).renewalAccount.findUnique({
    where: { id },
    include: {
      client_company: true,
      company: { select: { id: true, name: true } },
      account_manager: { select: { id: true, first_name: true, last_name: true } },
      renewal_executive: { select: { id: true, first_name: true, last_name: true } },
      contacts: { include: { contact: true } },
      services: {
        where: { is_active: true },
        include: {
          service_master: { include: { category: true } },
          provider: true,
          customer_contact: true,
          reminder_policy: { include: { steps: { orderBy: { step_number: 'asc' } } } },
          cycles: {
            orderBy: { cycle_number: 'desc' },
            include: {
              reminders: { orderBy: { due_date: 'asc' } },
              payments: { orderBy: { payment_date: 'desc' } },
            },
          },
          follow_up_logs: {
            orderBy: { logged_at: 'desc' },
            take: 10,
          },
        },
      },
      documents: { orderBy: { uploaded_at: 'desc' } },
    },
  });
  if (!account) return null;

  const auditLogs = await (prisma as any).renewalAuditLog.findMany({
    where: { renewal_account_id: id },
    orderBy: { performed_at: 'desc' },
    take: 50,
  });

  const userIds = new Set<number>();
  if (account.created_by_id) userIds.add(account.created_by_id);
  for (const service of account.services || []) {
    if (service.assigned_user_id) userIds.add(service.assigned_user_id);
    for (const log of service.follow_up_logs || []) {
      if (log.logged_by_id) userIds.add(log.logged_by_id);
    }
    for (const cycle of service.cycles || []) {
      for (const payment of cycle.payments || []) {
        if (payment.collected_by_id) userIds.add(payment.collected_by_id);
      }
    }
  }
  for (const auditLog of auditLogs) {
    if (auditLog.performed_by_id) userIds.add(auditLog.performed_by_id);
  }

  const users = userIds.size > 0
    ? await (prisma as any).user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, first_name: true, last_name: true },
      })
    : [];
  const userById = new Map(users.map((user: any) => [user.id, user]));

  return {
    ...account,
    created_by: account.created_by_id ? userById.get(account.created_by_id) ?? null : null,
    services: (account.services || []).map((service: any) => ({
      ...service,
      assigned_user: service.assigned_user_id ? userById.get(service.assigned_user_id) ?? null : null,
      cycles: (service.cycles || []).map((cycle: any) => ({
        ...cycle,
        payments: (cycle.payments || []).map((payment: any) => ({
          ...payment,
          collected_by: payment.collected_by_id ? userById.get(payment.collected_by_id) ?? null : null,
        })),
      })),
      follow_up_logs: (service.follow_up_logs || []).map((log: any) => ({
        ...log,
        logged_by: log.logged_by_id ? userById.get(log.logged_by_id) ?? null : null,
      })),
    })),
    audit_logs: auditLogs.map((auditLog: any) => ({
      ...auditLog,
      performed_by: auditLog.performed_by_id ? userById.get(auditLog.performed_by_id) ?? null : null,
    })),
  };
}

export async function updateRenewalAccount(id: number, data: any, userId: number, ip?: string): Promise<any> {
  const { contact_ids, services, deleted_service_ids, ...rawUpdateData } = data;
  const old = await (prisma as any).renewalAccount.findUnique({ where: { id } });

  const cleanUpdateData: any = {};
  if (rawUpdateData.company_id !== undefined) cleanUpdateData.company_id = rawUpdateData.company_id ? parseInt(String(rawUpdateData.company_id)) : null;
  if (rawUpdateData.client_company_id !== undefined) cleanUpdateData.client_company_id = parseInt(String(rawUpdateData.client_company_id));
  if (rawUpdateData.account_manager_id !== undefined) cleanUpdateData.account_manager_id = rawUpdateData.account_manager_id ? parseInt(String(rawUpdateData.account_manager_id)) : null;
  if (rawUpdateData.renewal_executive_id !== undefined) cleanUpdateData.renewal_executive_id = rawUpdateData.renewal_executive_id ? parseInt(String(rawUpdateData.renewal_executive_id)) : null;
  if (rawUpdateData.source_lead_id !== undefined) cleanUpdateData.source_lead_id = rawUpdateData.source_lead_id ? parseInt(String(rawUpdateData.source_lead_id)) : null;
  if (rawUpdateData.order_number !== undefined) cleanUpdateData.order_number = rawUpdateData.order_number || null;
  if (rawUpdateData.order_date !== undefined) cleanUpdateData.order_date = rawUpdateData.order_date ? new Date(rawUpdateData.order_date) : null;
  if (rawUpdateData.po_reference !== undefined) cleanUpdateData.po_reference = rawUpdateData.po_reference || null;
  if (rawUpdateData.invoice_number !== undefined) cleanUpdateData.invoice_number = rawUpdateData.invoice_number || null;
  if (rawUpdateData.invoice_date !== undefined) cleanUpdateData.invoice_date = rawUpdateData.invoice_date ? new Date(rawUpdateData.invoice_date) : null;
  if (rawUpdateData.notes !== undefined) cleanUpdateData.notes = rawUpdateData.notes || null;
  if (rawUpdateData.status !== undefined) cleanUpdateData.status = rawUpdateData.status;

  const updated = await (prisma as any).$transaction(async (tx: any) => {
    const acct = await tx.renewalAccount.update({
      where: { id },
      data: cleanUpdateData,
    });

    // Handle explicitly requested deleted service IDs
    if (Array.isArray(deleted_service_ids) && deleted_service_ids.length > 0) {
      const idsToDeactivate = deleted_service_ids.map((sid: any) => parseInt(String(sid))).filter(Boolean);
      if (idsToDeactivate.length > 0) {
        await tx.renewalServiceInstance.updateMany({
          where: { id: { in: idsToDeactivate }, renewal_account_id: id },
          data: { is_active: false, status: 'CANCELLED' },
        });
        // Safely deactivate active cycles belonging ONLY to this account's removed services
        await tx.renewalCycle.updateMany({
          where: {
            service_instance_id: { in: idsToDeactivate },
            service_instance: { renewal_account_id: id },
          },
          data: { is_active: false, status: 'CANCELLED' },
        });
      }
    }

    if (Array.isArray(services)) {
      for (const svc of services) {
        const cleanSvc = {
          service_master_id: parseInt(String(svc.service_master_id)),
          identifier: svc.identifier || null,
          provider_id: svc.provider_id ? parseInt(String(svc.provider_id)) : null,
          email_count: svc.email_count ? parseInt(String(svc.email_count)) : null,
          provider_type: svc.provider_type || null,
          server_name: svc.server_name || null,
          quantity: parseInt(String(svc.quantity)) || 1,
          activation_date: svc.activation_date ? new Date(svc.activation_date) : null,
          expiry_date: svc.expiry_date ? new Date(svc.expiry_date) : null,
          duration_value: parseInt(String(svc.duration_value)) || 12,
          duration_unit: svc.duration_unit || 'months',
          amount_due: parseFloat(String(svc.amount_due)) || 0,
          amc_amount: parseFloat(String(svc.amc_amount)) || 0,
          support_amount: parseFloat(String(svc.support_amount)) || 0,
          assigned_user_id: svc.assigned_user_id ? parseInt(String(svc.assigned_user_id)) : null,
          customer_contact_id: svc.customer_contact_id ? parseInt(String(svc.customer_contact_id)) : null,
          reminder_policy_id: svc.reminder_policy_id ? parseInt(String(svc.reminder_policy_id)) : null,
          status: svc.status || 'ACTIVE',
          remarks: svc.remarks || null,
          order_number: svc.order_number || null,
          order_date: svc.order_date ? new Date(svc.order_date) : null,
          po_reference: svc.po_reference || null,
          invoice_number: svc.invoice_number || null,
          invoice_date: svc.invoice_date ? new Date(svc.invoice_date) : null,
          is_active: true,
        };

        if (svc.id && typeof svc.id === 'number') {
          await tx.renewalServiceInstance.update({
            where: { id: svc.id },
            data: cleanSvc,
          });
        } else {
          await tx.renewalServiceInstance.create({
            data: { ...cleanSvc, renewal_account_id: id },
          });
        }
      }
    }

    if (contact_ids !== undefined) {
      await tx.renewalAccountContact.deleteMany({ where: { renewal_account_id: id } });
      if (contact_ids.length > 0) {
        await tx.renewalAccountContact.createMany({
          data: contact_ids.map((cid: number) => ({ renewal_account_id: id, contact_id: cid })),
          skipDuplicates: true,
        });
      }
    }

    return acct;
  });

  await logAudit({ accountId: id, entityType: 'ACCOUNT', entityId: id, action: 'UPDATED', oldValue: JSON.stringify(old), newValue: JSON.stringify(cleanUpdateData), performedById: userId, ip });
  return updated;
}

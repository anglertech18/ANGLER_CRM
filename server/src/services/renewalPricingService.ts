import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

type PriceSource = 'customer_override' | 'service_default' | 'instance_legacy' | 'zero';

export interface ResolvedPrice {
  price: Decimal;
  source: PriceSource;
  billing_unit: string;
  currency: string;
  price_record_id?: number;
}

/** Four-level pricing resolution chain. Called at cycle activation. */
export async function resolvePrice(
  clientCompanyId: number,
  serviceMasterId: number,
  instanceAmountDue: Decimal,
  asOfDate: Date = new Date(),
): Promise<ResolvedPrice> {
  const today = asOfDate;

  // Level 1: Active customer override
  const customerPrice = await (prisma as any).renewalCustomerPrice.findFirst({
    where: {
      client_company_id: clientCompanyId,
      service_master_id: serviceMasterId,
      is_active: true,
      effective_from: { lte: today },
      OR: [{ effective_to: null }, { effective_to: { gte: today } }],
    },
    orderBy: { effective_from: 'desc' },
  });

  if (customerPrice) {
    return {
      price: customerPrice.override_price,
      source: 'customer_override',
      billing_unit: customerPrice.billing_unit,
      currency: customerPrice.currency,
      price_record_id: customerPrice.id,
    };
  }

  // Level 2: Current default version for this service
  const defaultPrice = await (prisma as any).renewalServicePrice.findFirst({
    where: {
      service_master_id: serviceMasterId,
      is_current: true,
      effective_from: { lte: today },
      OR: [{ effective_to: null }, { effective_to: { gte: today } }],
    },
    orderBy: { effective_from: 'desc' },
  });

  if (defaultPrice) {
    return {
      price: defaultPrice.base_price,
      source: 'service_default',
      billing_unit: defaultPrice.billing_unit,
      currency: defaultPrice.currency,
      price_record_id: defaultPrice.id,
    };
  }

  // Level 3: Legacy instance amount_due
  if (instanceAmountDue && instanceAmountDue.greaterThan(0)) {
    return { price: instanceAmountDue, source: 'instance_legacy', billing_unit: 'year', currency: 'INR' };
  }

  return { price: new Decimal(0), source: 'zero', billing_unit: 'year', currency: 'INR' };
}

/** Deactivate previous default version and create new one */
export async function createServicePriceVersion(
  serviceMasterId: number,
  data: { base_price: number; billing_unit: string; currency?: string; effective_from: string; effective_to?: string; notes?: string },
  createdById: number,
) {
  // Mark all previous current versions as non-current if effective_from >= new one
  await (prisma as any).renewalServicePrice.updateMany({
    where: { service_master_id: serviceMasterId, is_current: true },
    data: { is_current: false },
  });

  return (prisma as any).renewalServicePrice.create({
    data: {
      service_master_id: serviceMasterId,
      base_price: data.base_price,
      billing_unit: data.billing_unit ?? 'year',
      currency: data.currency ?? 'INR',
      effective_from: new Date(data.effective_from),
      effective_to: data.effective_to ? new Date(data.effective_to) : null,
      is_current: true,
      notes: data.notes ?? null,
      created_by_id: createdById,
    },
  });
}

/** Upsert a customer price override (deactivates previous active override for same combo) */
export async function upsertCustomerPrice(
  clientCompanyId: number,
  serviceMasterId: number,
  data: { override_price: number; billing_unit: string; currency?: string; effective_from: string; effective_to?: string; notes?: string },
  createdById: number,
) {
  // Soft-close any currently active override
  await (prisma as any).renewalCustomerPrice.updateMany({
    where: { client_company_id: clientCompanyId, service_master_id: serviceMasterId, is_active: true },
    data: { is_active: false, effective_to: new Date(data.effective_from) },
  });

  return (prisma as any).renewalCustomerPrice.create({
    data: {
      client_company_id: clientCompanyId,
      service_master_id: serviceMasterId,
      override_price: data.override_price,
      billing_unit: data.billing_unit ?? 'year',
      currency: data.currency ?? 'INR',
      effective_from: new Date(data.effective_from),
      effective_to: data.effective_to ? new Date(data.effective_to) : null,
      is_active: true,
      notes: data.notes ?? null,
      created_by_id: createdById,
    },
  });
}

/** Get full pricing history for a mapping (instance) */
export async function getMappingPricingHistory(
  clientCompanyId: number,
  serviceMasterId: number,
) {
  const [defaultVersions, customerOverrides] = await Promise.all([
    (prisma as any).renewalServicePrice.findMany({
      where: { service_master_id: serviceMasterId },
      orderBy: { effective_from: 'desc' },
    }),
    (prisma as any).renewalCustomerPrice.findMany({
      where: { client_company_id: clientCompanyId, service_master_id: serviceMasterId },
      orderBy: { effective_from: 'desc' },
    }),
  ]);

  return { default_versions: defaultVersions, customer_overrides: customerOverrides };
}

/** Get per-mapping alert steps */
export async function getInstanceAlertSteps(serviceInstanceId: number) {
  return (prisma as any).renewalInstanceAlertStep.findMany({
    where: { service_instance_id: serviceInstanceId, is_active: true },
    include: { email_template: { select: { id: true, name: true, subject: true } } },
    orderBy: { step_number: 'asc' },
  });
}

/** Upsert full set of alert steps for an instance (replaces existing) */
export async function upsertInstanceAlertSteps(
  serviceInstanceId: number,
  steps: Array<{ step_number: number; days_before: number; channel: string; email_template_id?: number | null }>,
) {
  // Delete existing steps
  await (prisma as any).renewalInstanceAlertStep.deleteMany({ where: { service_instance_id: serviceInstanceId } });

  if (!steps.length) return [];

  await (prisma as any).renewalInstanceAlertStep.createMany({
    data: steps.map(s => ({
      service_instance_id: serviceInstanceId,
      step_number: s.step_number,
      days_before: s.days_before,
      channel: s.channel,
      email_template_id: s.email_template_id ?? null,
      is_active: true,
    })),
  });

  return getInstanceAlertSteps(serviceInstanceId);
}

/** Hover card data for a service instance */
export async function getMappingHoverData(serviceInstanceId: number) {
  const instance = await (prisma as any).renewalServiceInstance.findUnique({
    where: { id: serviceInstanceId },
    select: {
      id: true,
      identifier: true,
      amount_due: true,
      expiry_date: true,
      status: true,
      assigned_user_id: true,
      email_count: true,
      provider_type: true,
      server_name: true,
      renewal_account: {
        select: {
          client_company: { select: { id: true, name: true } },
        },
      },
      service_master: { select: { id: true, name: true, category_id: true, category: { select: { name: true, color: true, code: true } } } },
      customer_contact: { select: { id: true, name: true, email: true, mobile: true } },
      instance_alert_steps: {
        where: { is_active: true },
        orderBy: { step_number: 'asc' },
        select: { id: true, days_before: true, channel: true, step_number: true },
      },
    },
  });

  if (!instance) return null;

  // Pending draft count from outbox
  const draftCount = await (prisma as any).notificationOutbox.count({
    where: { requires_approval: true, status: 'PENDING_APPROVAL' },
  });

  // Resolved price
  const resolved = await resolvePrice(
    instance.renewal_account.client_company.id,
    instance.service_master.id,
    instance.amount_due,
  );

  const assignedUser = instance.assigned_user_id
    ? await (prisma as any).user.findUnique({
        where: { id: instance.assigned_user_id },
        select: { id: true, first_name: true, last_name: true },
      })
    : null;

  const assignedName = assignedUser
    ? `${assignedUser.first_name} ${assignedUser.last_name ?? ''}`.trim()
    : null;

  return {
    ...instance,
    alert_steps: instance.instance_alert_steps,
    assigned_user: assignedUser
      ? { id: assignedUser.id, name: assignedName }
      : null,
    resolved_price: resolved,
    draft_count: draftCount,
  };
}

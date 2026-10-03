import { prisma } from '../lib/prisma';

/**
 * Resolves the applicable reminder policy for a service instance.
 * Priority order (highest to lowest):
 *  1. Service-instance override policy (instance.reminder_policy_id + override_policy=true)
 *  2. Service-master default policy
 *  3. Service-category + company policy
 *  4. Service-category policy (no company)
 *  5. Company-level default policy
 *  6. Global default policy (no company, no category)
 */
export async function resolveReminderPolicy(
  serviceInstanceId: number
): Promise<any | null> {
  const instance = await (prisma as any).renewalServiceInstance.findUnique({
    where: { id: serviceInstanceId },
    include: {
      service_master: {
        include: {
          category: true,
          default_policy: { include: { steps: { orderBy: { step_number: 'asc' } } } },
        },
      },
      renewal_account: true,
      reminder_policy: { include: { steps: { orderBy: { step_number: 'asc' } } } },
    },
  });

  if (!instance) return null;

  // 1. Instance override
  if (instance.override_policy && instance.reminder_policy_id && instance.reminder_policy) {
    return instance.reminder_policy;
  }

  // 2. Service master default policy
  if (instance.service_master?.default_policy) {
    return instance.service_master.default_policy;
  }

  const categoryId = instance.service_master?.category_id;
  const companyId = instance.renewal_account?.company_id;

  // 3. Category + company policy
  if (categoryId && companyId) {
    const p = await (prisma as any).renewalReminderPolicy.findFirst({
      where: { service_category_id: categoryId, company_id: companyId, is_active: true },
      include: { steps: { orderBy: { step_number: 'asc' } } },
      orderBy: { is_default: 'desc' },
    });
    if (p) return p;
  }

  // 4. Category policy only
  if (categoryId) {
    const p = await (prisma as any).renewalReminderPolicy.findFirst({
      where: { service_category_id: categoryId, company_id: null, is_active: true },
      include: { steps: { orderBy: { step_number: 'asc' } } },
      orderBy: { is_default: 'desc' },
    });
    if (p) return p;
  }

  // 5. Company default policy
  if (companyId) {
    const p = await (prisma as any).renewalReminderPolicy.findFirst({
      where: { company_id: companyId, service_category_id: null, is_default: true, is_active: true },
      include: { steps: { orderBy: { step_number: 'asc' } } },
    });
    if (p) return p;
  }

  // 6. Global default
  const global = await (prisma as any).renewalReminderPolicy.findFirst({
    where: { company_id: null, service_category_id: null, is_default: true, is_active: true },
    include: { steps: { orderBy: { step_number: 'asc' } } },
  });
  return global ?? null;
}

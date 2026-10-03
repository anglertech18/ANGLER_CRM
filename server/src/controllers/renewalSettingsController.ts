import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { regenerateRemindersForInstance } from '../services/reminderGeneratorService';

const POLICY_FIELDS = [
  'name', 'company_id', 'service_category_id', 'service_master_id', 'is_default',
  'use_business_days', 'skip_weekends', 'timezone', 'is_active',
] as const;

function sanitizePolicyData(input: any) {
  const data: any = {};
  for (const field of POLICY_FIELDS) {
    if (input[field] !== undefined) data[field] = input[field];
  }
  return data;
}

function sanitizeSteps(steps: any[]) {
  return steps.map((step: any, index: number) => {
    const offsetDays = Number(step.offset_days);
    if (!Number.isInteger(offsetDays) || offsetDays < -3650 || offsetDays > 3650) {
      throw new Error(`Step ${index + 1}: offset_days must be a whole number between -3650 and 3650`);
    }
    if (!String(step.action_type || '').trim()) throw new Error(`Step ${index + 1}: action_type is required`);
    if (!String(step.channel || '').trim()) throw new Error(`Step ${index + 1}: channel is required`);
    if (!String(step.recipient_type || '').trim()) throw new Error(`Step ${index + 1}: recipient_type is required`);

    return {
      step_number: index + 1,
      offset_days: offsetDays,
      relative_to: String(step.relative_to || 'EXPIRY_DATE'),
      action_type: String(step.action_type),
      channel: String(step.channel),
      recipient_type: String(step.recipient_type),
      template_id: step.template_id ? Number(step.template_id) : null,
      escalate_after_days: step.escalate_after_days === '' || step.escalate_after_days == null
        ? null
        : Number(step.escalate_after_days),
      escalate_to: step.escalate_to ? String(step.escalate_to) : null,
      is_mandatory: Boolean(step.is_mandatory),
      is_enabled: step.is_enabled !== false,
      attach_order_form: Boolean(step.attach_order_form),
    };
  });
}

async function withPolicyCompatibilityAliases(policies: any[]) {
  const companyIds = Array.from(new Set(
    policies
      .map((policy: any) => policy.company_id)
      .filter((companyId: any) => companyId != null)
      .map((companyId: any) => Number(companyId))
  ));

  const companies = companyIds.length > 0
    ? await (prisma as any).company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      })
    : [];
  const companiesById = new Map(companies.map((company: any) => [company.id, company]));

  return policies.map((policy: any) => ({
    ...policy,
    service_category: policy.category ?? null,
    service_master: policy.default_for_services?.[0] ?? (
      policy.service_master_id ? { id: policy.service_master_id } : null
    ),
    company: policy.company_id ? companiesById.get(policy.company_id) ?? null : null,
    _count: {
      ...(policy._count ?? {}),
      instances: policy._count?.service_instances ?? 0,
    },
  }));
}

// ── Reminder Policies ─────────────────────────────────────────────────────────

export const getPolicies = async (req: Request, res: Response) => {
  try {
    const { companyId, categoryId, serviceMasterId } = req.query;
    const where: any = { is_active: true, AND: [] };
    if (companyId) {
      const id = parseInt(String(companyId));
      where.AND.push({ OR: [{ company_id: id }, { company_id: null }] });
    }
    if (categoryId) {
      const id = parseInt(String(categoryId));
      where.AND.push({ OR: [{ service_category_id: id }, { service_category_id: null }] });
    }
    if (serviceMasterId) {
      const id = parseInt(String(serviceMasterId));
      where.AND.push({ OR: [{ service_master_id: id }, { service_master_id: null }] });
    }
    if (where.AND.length === 0) delete where.AND;

    const policies = await (prisma as any).renewalReminderPolicy.findMany({
      where,
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
      include: {
        category: { select: { id: true, name: true, code: true } },
        default_for_services: { select: { id: true, name: true }, take: 1 },
        steps: { orderBy: { step_number: 'asc' } },
        _count: { select: { service_instances: true } },
      },
    });
    res.json(await withPolicyCompatibilityAliases(policies));
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching policies', detail: err.message });
  }
};

export const getPolicyById = async (req: Request, res: Response) => {
  try {
    const policy = await (prisma as any).renewalReminderPolicy.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        steps: { orderBy: { step_number: 'asc' } },
        category: true,
        default_for_services: { select: { id: true, name: true }, take: 1 },
      },
    });
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    const versions = await (prisma as any).renewalPolicyVersion.findMany({
      where: { policy_id: policy.id },
      orderBy: { version: 'desc' },
      take: 10,
    });
    const [result] = await withPolicyCompatibilityAliases([{ ...policy, versions }]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching policy', detail: err.message });
  }
};

export const getPolicyVersions = async (req: Request, res: Response) => {
  try {
    const policyId = parseInt(req.params.id);
    const versions = await (prisma as any).renewalPolicyVersion.findMany({
      where: { policy_id: policyId },
      orderBy: { version: 'desc' },
    });
    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching policy versions', detail: err.message });
  }
};

export const createPolicy = async (req: Request, res: Response) => {
  try {
    const { steps = [], ...policyData } = req.body;
    const cleanSteps = sanitizeSteps(steps);

    const policy = await (prisma as any).renewalReminderPolicy.create({
      data: {
        ...sanitizePolicyData(policyData),
        steps: {
          create: cleanSteps,
        },
      },
      include: { steps: { orderBy: { step_number: 'asc' } } },
    });
    res.status(201).json(policy);
  } catch (err: any) {
    res.status(400).json({ message: 'Error creating policy', detail: err.message });
  }
};

export const updatePolicy = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { steps, apply_to_pending, change_reason, ...policyData } = req.body;

    // Increment version on update
    const current = await (prisma as any).renewalReminderPolicy.findUnique({
      where: { id },
      include: { steps: { orderBy: { step_number: 'asc' } } },
    });
    if (!current) return res.status(404).json({ message: 'Policy not found' });
    const cleanSteps = steps ? sanitizeSteps(steps) : null;
    const nextVersion = current.version + 1;

    const updated = await (prisma as any).$transaction(async (tx: any) => {
      await tx.renewalPolicyVersion.upsert({
        where: { policy_id_version: { policy_id: id, version: current.version } },
        create: {
          policy_id: id,
          version: current.version,
          name_snapshot: current.name,
          steps_snapshot: JSON.stringify(current.steps),
          change_summary: change_reason || 'Policy details updated',
          change_reason: change_reason || null,
          affected_services_count: 0,
        },
        update: {},
      });

      const saved = await tx.renewalReminderPolicy.update({
        where: { id },
        data: { ...sanitizePolicyData(policyData), version: nextVersion },
      });

      if (cleanSteps) {
        await tx.renewalReminderStep.deleteMany({ where: { policy_id: id } });
        await tx.renewalReminderStep.createMany({
          data: cleanSteps.map((step: any) => ({ ...step, policy_id: id })),
        });
      }
      return saved;
    });

    // Optionally regenerate pending reminders for all instances using this policy
    if (apply_to_pending) {
      const instances = await (prisma as any).renewalServiceInstance.findMany({
        where: { reminder_policy_id: id, is_active: true },
        select: { id: true },
      });
      for (const inst of instances) {
        await regenerateRemindersForInstance(inst.id);
      }
    }

    const result = await (prisma as any).renewalReminderPolicy.findUnique({
      where: { id: updated.id },
      include: { steps: { orderBy: { step_number: 'asc' } } },
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating policy', detail: err.message });
  }
};

export const deletePolicy = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const inUse = await (prisma as any).renewalServiceInstance.count({ where: { reminder_policy_id: id } });
    if (inUse > 0) {
      return res.status(400).json({ message: `Policy is in use by ${inUse} service(s). Deactivate instead.` });
    }
    await (prisma as any).renewalReminderPolicy.update({ where: { id }, data: { is_active: false } });
    res.json({ message: 'Policy deactivated' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error deleting policy', detail: err.message });
  }
};

// ── Notification Templates ────────────────────────────────────────────────────

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await (prisma as any).renewalNotificationTemplate.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching templates', detail: err.message });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const template = await (prisma as any).renewalNotificationTemplate.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        brand_profile: { select: { id: true, name: true } },
        versions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching template', detail: err.message });
  }
};

export const getTemplateVersions = async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const versions = await (prisma as any).renewalTemplateVersion.findMany({
      where: { template_id: templateId },
      orderBy: { version: 'desc' },
      include: {
        changed_by: { select: { id: true, first_name: true, last_name: true } },
      },
    });
    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching template versions', detail: err.message });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const t = await (prisma as any).renewalNotificationTemplate.create({ data: req.body });
    res.status(201).json(t);
  } catch (err: any) {
    res.status(400).json({ message: 'Error creating template', detail: err.message });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const t = await (prisma as any).renewalNotificationTemplate.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(t);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating template', detail: err.message });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    await (prisma as any).renewalNotificationTemplate.update({ where: { id: parseInt(req.params.id) }, data: { is_active: false } });
    res.json({ message: 'Template deactivated' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error deleting template', detail: err.message });
  }
};

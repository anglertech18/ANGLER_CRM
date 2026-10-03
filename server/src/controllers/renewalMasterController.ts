import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

function optionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = parseInt(String(value));
  if (Number.isNaN(parsed)) throw new Error(`Invalid numeric value: ${value}`);
  return parsed;
}

function optionalBool(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

function normalizeCategoryPayload(body: any, partial = false) {
  const data: any = {};
  for (const field of ['name', 'code', 'color']) {
    if (body[field] !== undefined) data[field] = String(body[field]).trim();
  }
  for (const field of ['company_id', 'parent_id', 'sort_order']) {
    const parsed = optionalInt(body[field]);
    if (parsed !== undefined) data[field] = parsed;
  }
  const isActive = optionalBool(body.is_active);
  if (isActive !== undefined) data.is_active = isActive;
  if (!partial && !data.name) throw new Error('Category name is required');
  if (!partial && !data.code) {
    data.code = data.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
  }
  return data;
}

async function assertCategoryUnique(data: any, excludeId?: number) {
  if (!data.name && !data.code) return;
  const conflicts = await (prisma as any).renewalServiceCategory.findMany({
    where: {
      is_active: true,
      company_id: data.company_id ?? null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        ...(data.name ? [{ name: data.name }] : []),
        ...(data.code ? [{ code: data.code }] : []),
      ],
    },
    select: { id: true },
    take: 1,
  });
  if (conflicts.length > 0) throw new Error('Category name or code already exists for this parent company');
}

function normalizeServiceMasterPayload(body: any, partial = false) {
  const data: any = {};
  for (const field of ['name', 'description', 'identifier_label', 'quantity_label', 'duration_unit', 'billing_term', 'color', 'icon']) {
    if (body[field] !== undefined) data[field] = body[field] === null ? null : String(body[field]).trim();
  }
  for (const field of ['company_id', 'category_id', 'sub_category_id', 'default_duration_value', 'default_reminder_policy_id', 'sort_order']) {
    const parsed = optionalInt(body[field]);
    if (parsed !== undefined) data[field] = parsed;
  }
  for (const field of [
    'requires_identifier', 'supports_provider', 'requires_provider',
    'supports_server_name', 'requires_server_name', 'supports_plan_name',
    'requires_plan_name', 'supports_login_username', 'requires_login_username',
    'supports_quantity', 'requires_quantity', 'is_active',
  ]) {
    const parsed = optionalBool(body[field]);
    if (parsed !== undefined) data[field] = parsed;
  }
  if (!partial && !data.name) throw new Error('Service name is required');
  if (!partial && !data.category_id) throw new Error('Service category is required');
  return data;
}

async function assertServiceMasterScope(data: any, existingServiceId?: number) {
  let merged = data;
  if (existingServiceId) {
    const existing = await (prisma as any).renewalServiceMaster.findUnique({
      where: { id: existingServiceId },
      select: { company_id: true, category_id: true, sub_category_id: true },
    });
    if (!existing) throw new Error('Service master not found');
    merged = { ...existing, ...data };
  }

  if (!merged.company_id) throw new Error('Parent company is required for service master');
  if (!merged.category_id) throw new Error('Service category is required');

  const category = await (prisma as any).renewalServiceCategory.findUnique({
    where: { id: merged.category_id },
    select: { id: true, company_id: true, is_active: true },
  });
  if (!category || !category.is_active) throw new Error('Service category is invalid or inactive');
  if (category.company_id !== null && category.company_id !== merged.company_id) {
    throw new Error('Service category belongs to a different parent company');
  }

  if (merged.sub_category_id) {
    const subCategory = await (prisma as any).renewalServiceCategory.findUnique({
      where: { id: merged.sub_category_id },
      select: { id: true, company_id: true, is_active: true },
    });
    if (!subCategory || !subCategory.is_active) throw new Error('Service sub-category is invalid or inactive');
    if (subCategory.company_id !== null && subCategory.company_id !== merged.company_id) {
      throw new Error('Service sub-category belongs to a different parent company');
    }
  }
}

// ── Service Categories ────────────────────────────────────────────────────────

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { parentId, companyId, parentCompanyId } = req.query;
    const where: any = { is_active: true };
    const scopedCompanyId = companyId || parentCompanyId;
    if (parentId) {
      where.parent_id = parseInt(String(parentId));
    } else {
      where.parent_id = null;
    }
    if (scopedCompanyId) {
      const companyIdNum = parseInt(String(scopedCompanyId));
      const scopedCount = await (prisma as any).renewalServiceCategory.count({
        where: { is_active: true, company_id: companyIdNum },
      });
      where.company_id = scopedCount > 0 ? companyIdNum : null;
    }
    const cats = await (prisma as any).renewalServiceCategory.findMany({
      where,
      include: { children: { where: { is_active: true }, orderBy: [{ sort_order: 'asc' }, { name: 'asc' }] } },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching categories', detail: err.message });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { companyId, parentCompanyId } = req.query;
    const scopedCompanyId = companyId || parentCompanyId;
    const where: any = { is_active: true };
    if (scopedCompanyId) {
      const companyIdNum = parseInt(String(scopedCompanyId));
      const scopedCount = await (prisma as any).renewalServiceCategory.count({
        where: { is_active: true, company_id: companyIdNum },
      });
      where.company_id = scopedCount > 0 ? companyIdNum : null;
    }
    const cats = await (prisma as any).renewalServiceCategory.findMany({
      where,
      include: { children: { where: { is_active: true }, orderBy: [{ sort_order: 'asc' }, { name: 'asc' }] } },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching all categories', detail: err.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const data = normalizeCategoryPayload(req.body);
    await assertCategoryUnique(data);
    const cat = await (prisma as any).renewalServiceCategory.create({ data });
    res.status(201).json(cat);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Category name or code already exists for this parent company' });
    res.status(400).json({ message: 'Error creating category', detail: err.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const data = normalizeCategoryPayload(req.body, true);
    if (Object.keys(data).length > 0) {
      await assertCategoryUnique(data, parseInt(req.params.id));
    }
    const cat = await (prisma as any).renewalServiceCategory.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(cat);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating category', detail: err.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    await (prisma as any).renewalServiceCategory.update({ where: { id: parseInt(req.params.id) }, data: { is_active: false } });
    res.json({ message: 'Category deactivated' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error deactivating category', detail: err.message });
  }
};

// ── Service Master ────────────────────────────────────────────────────────────

export const getServiceMasters = async (req: Request, res: Response) => {
  try {
    const { categoryId, category_id, subCategoryId, sub_category_id, companyId, parentCompanyId } = req.query;
    const where: any = { is_active: true };
    const scopedCompanyId = companyId || parentCompanyId;

    const targetSub = subCategoryId || sub_category_id;
    const targetCat = categoryId || category_id;

    let scopedCompanyIdNum: number | null = null;
    if (scopedCompanyId) {
      scopedCompanyIdNum = parseInt(String(scopedCompanyId));
      const scopedCount = await (prisma as any).renewalServiceMaster.count({
        where: { is_active: true, company_id: scopedCompanyIdNum },
      });
      where.company_id = scopedCount > 0 ? scopedCompanyIdNum : null;
    }

    if (targetSub) {
      where.sub_category_id = parseInt(String(targetSub));
    } else if (targetCat) {
      const catIdNum = parseInt(String(targetCat));
      where.AND = [{
        OR: [
        { category_id: catIdNum },
        { sub_category_id: catIdNum }
        ]
      }];
    }

    const services = await (prisma as any).renewalServiceMaster.findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: {
        category: { select: { id: true, name: true, code: true, color: true } },
        sub_category: { select: { id: true, name: true, code: true, color: true } },
        default_policy: { include: { steps: { orderBy: { step_number: 'asc' } } } },
      },
    });
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching service masters', detail: err.message });
  }
};

export const getServiceMasterById = async (req: Request, res: Response) => {
  try {
    const svc = await (prisma as any).renewalServiceMaster.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true, sub_category: true, default_policy: { include: { steps: { orderBy: { step_number: 'asc' } } } } },
    });
    if (!svc) return res.status(404).json({ message: 'Service not found' });
    res.json(svc);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching service', detail: err.message });
  }
};

export const createServiceMaster = async (req: Request, res: Response) => {
  try {
    const data = normalizeServiceMasterPayload(req.body);
    await assertServiceMasterScope(data);
    const svc = await (prisma as any).renewalServiceMaster.create({
      data,
      include: { sub_category: true },
    });
    res.status(201).json(svc);
  } catch (err: any) {
    res.status(400).json({ message: 'Error creating service', detail: err.message });
  }
};

export const updateServiceMaster = async (req: Request, res: Response) => {
  try {
    const data = normalizeServiceMasterPayload(req.body, true);
    if (Object.keys(data).length > 0) {
      await assertServiceMasterScope(data, parseInt(req.params.id));
    }
    const svc = await (prisma as any).renewalServiceMaster.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { category: true },
    });
    res.json(svc);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating service', detail: err.message });
  }
};

export const deleteServiceMaster = async (req: Request, res: Response) => {
  try {
    await (prisma as any).renewalServiceMaster.update({ where: { id: parseInt(req.params.id) }, data: { is_active: false } });
    res.json({ message: 'Service deactivated' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error deactivating service', detail: err.message });
  }
};

// ── Providers ─────────────────────────────────────────────────────────────────

export const getProviders = async (_req: Request, res: Response) => {
  try {
    const providers = await (prisma as any).renewalProvider.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching providers', detail: err.message });
  }
};

export const createProvider = async (req: Request, res: Response) => {
  try {
    const p = await (prisma as any).renewalProvider.create({ data: req.body });
    res.status(201).json(p);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Provider name already exists' });
    res.status(400).json({ message: 'Error creating provider', detail: err.message });
  }
};

export const updateProvider = async (req: Request, res: Response) => {
  try {
    const p = await (prisma as any).renewalProvider.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(p);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating provider', detail: err.message });
  }
};

export const deleteProvider = async (req: Request, res: Response) => {
  try {
    await (prisma as any).renewalProvider.update({ where: { id: parseInt(req.params.id) }, data: { is_active: false } });
    res.json({ message: 'Provider deactivated' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error deactivating provider', detail: err.message });
  }
};

export const getProviderSubItems = async (req: Request, res: Response) => {
  try {
    const { providerId, type } = req.query;
    const where: any = { is_active: true };
    if (providerId) where.provider_id = parseInt(String(providerId));
    if (type) where.type = String(type);

    const items = await (prisma as any).renewalProviderSubItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching provider sub-items', detail: err.message });
  }
};

export const getServicePlans = async (_req: Request, res: Response) => {
  try {
    const plans = await (prisma as any).renewalServicePlanMaster.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: plans });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching service plans', detail: err.message });
  }
};

// ── Contacts ──────────────────────────────────────────────────────────────────

export const getContactsByCompany = async (req: Request, res: Response) => {
  try {
    const { clientId, clientCompanyId, search, role, page = 1, limit = 25 } = req.query;
    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
    const take = parseInt(String(limit));

    const where: any = { is_active: true };
    const companyId = clientId || clientCompanyId;
    if (companyId) {
      where.client_company_id = parseInt(String(companyId));
    } else {
      const validClientCompanies = await (prisma as any).clientCompany.findMany({
        where: { is_active: true },
        select: { id: true },
      });
      where.client_company_id = {
        in: validClientCompanies.map((company: any) => company.id),
      };
    }
    if (role) {
      where.role = String(role);
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
        { mobile: { contains: String(search) } },
        { designation: { contains: String(search) } },
        { client_company: { name: { contains: String(search) } } },
      ];
    }

    const [rows, total] = await Promise.all([
      (prisma as any).renewalContact.findMany({
        where,
        skip: companyId ? undefined : skip,
        take: companyId ? undefined : take,
        include: { client_company: { select: { id: true, name: true } } },
        orderBy: [{ is_primary: 'desc' }, { name: 'asc' }],
      }),
      (prisma as any).renewalContact.count({ where }),
    ]);

    res.json({ success: true, data: rows, total });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching contacts', detail: err.message });
  }
};

export const createContact = async (req: Request, res: Response) => {
  try {
    const {
      client_company_id, company_name, name, email, mobile, whatsapp, designation, department, role,
      address, city_pincode, state, gstin, is_primary, email_consent, phone_consent, whatsapp_consent
    } = req.body;
    let finalCompanyId = client_company_id ? parseInt(String(client_company_id)) : undefined;

    if (!finalCompanyId && company_name) {
      const normalized = String(company_name).trim();
      let company = await (prisma as any).clientCompany.findFirst({
        where: { name: { equals: normalized } }
      });
      if (!company) {
        company = await (prisma as any).clientCompany.create({ data: { name: normalized } });
      }
      finalCompanyId = company.id;
    }

    if (!finalCompanyId) {
      return res.status(400).json({ message: 'Client company is required to create a contact' });
    }

    const contact = await (prisma as any).renewalContact.create({
      data: {
        name: String(name || '').trim(),
        email: email && String(email).trim() ? String(email).trim() : null,
        mobile: mobile && String(mobile).trim() ? String(mobile).trim() : null,
        whatsapp: whatsapp && String(whatsapp).trim() ? String(whatsapp).trim() : null,
        designation: designation && String(designation).trim() ? String(designation).trim() : null,
        department: department && String(department).trim() ? String(department).trim() : null,
        address: address && String(address).trim() ? String(address).trim() : null,
        city_pincode: city_pincode && String(city_pincode).trim() ? String(city_pincode).trim() : null,
        state: state && String(state).trim() ? String(state).trim() : null,
        gstin: gstin && String(gstin).trim() ? String(gstin).trim() : null,
        role: role || 'PRIMARY',
        is_primary: is_primary === true || is_primary === 'true',
        email_consent: email_consent !== false && email_consent !== 'false',
        phone_consent: phone_consent !== false && phone_consent !== 'false',
        whatsapp_consent: whatsapp_consent === true || whatsapp_consent === 'true',
        client_company_id: finalCompanyId,
        is_active: true,
      }
    });
    res.status(201).json(contact);
  } catch (err: any) {
    console.error('[createContact Error]:', err);
    res.status(400).json({ message: 'Error creating contact', detail: err.message });
  }
};

export const updateContact = async (req: Request, res: Response) => {
  try {
    const { client_company_id, ...data } = req.body;
    const contact = await (prisma as any).renewalContact.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...data,
        ...(client_company_id !== undefined && {
          client_company_id: client_company_id ? parseInt(String(client_company_id)) : undefined
        })
      }
    });
    res.json(contact);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating contact', detail: err.message });
  }
};

export const deleteContact = async (req: Request, res: Response) => {
  try {
    await (prisma as any).renewalContact.update({ where: { id: parseInt(req.params.id) }, data: { is_active: false } });
    res.json({ message: 'Contact deactivated' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error deactivating contact', detail: err.message });
  }
};

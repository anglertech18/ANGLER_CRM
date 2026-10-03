import { prisma } from '../lib/prisma';
import { seedBrandProfiles } from './seedBrandProfiles';

type CategorySeed = {
  name: string;
  code: string;
  color: string;
};

type ServiceSeed = {
  name: string;
  category: string;
  identifierLabel: string;
  requiresIdentifier: boolean;
  supportsProvider: boolean;
  supportsServerName: boolean;
  supportsPlanName: boolean;
  supportsLoginUsername: boolean;
  supportsQuantity: boolean;
  requiresQuantity: boolean;
  quantityLabel?: string;
};

type ProviderSeed = {
  name: string;
  categoryCode?: string;
};

type ProviderSubItemSeed = {
  provider: string;
  name: string;
  type: string;
};

const anglerCategories: CategorySeed[] = [
  { name: 'Domain Services', code: 'ANG_DOMAIN', color: '#0f766e' },
  { name: 'Hosting & Server', code: 'ANG_SERVER', color: '#2563eb' },
  { name: 'Email Services', code: 'ANG_EMAIL', color: '#7c3aed' },
  { name: 'SSL Certificates', code: 'ANG_SSL', color: '#dc2626' },
  { name: 'Annual Maintenance (AMC)', code: 'ANG_AMC', color: '#ea580c' },
  { name: 'Technical Support & Security', code: 'ANG_SUPPORT', color: '#475569' },
];

const trinetraCategories: CategorySeed[] = [
  { name: 'FMS', code: 'TRN_FMS', color: '#2563eb' },
  { name: '4G Dome Camera', code: 'TRN_4G_DOME', color: '#0891b2' },
  { name: 'iWay', code: 'TRN_IWAY', color: '#16a34a' },
  { name: 'IoT', code: 'TRN_IOT', color: '#9333ea' },
];

const anglerServices: ServiceSeed[] = [
  { name: 'Domain Renewal', category: 'Domain Services', identifierLabel: 'Domain Name', requiresIdentifier: true, supportsProvider: true, supportsServerName: false, supportsPlanName: false, supportsLoginUsername: true, supportsQuantity: false, requiresQuantity: false },
  { name: 'Server Renewal', category: 'Hosting & Server', identifierLabel: 'Domain / Server Identifier', requiresIdentifier: true, supportsProvider: true, supportsServerName: true, supportsPlanName: true, supportsLoginUsername: true, supportsQuantity: false, requiresQuantity: false },
  { name: 'G Suite Email Server Renewal', category: 'Email Services', identifierLabel: 'Domain Name', requiresIdentifier: true, supportsProvider: true, supportsServerName: true, supportsPlanName: true, supportsLoginUsername: true, supportsQuantity: true, requiresQuantity: false, quantityLabel: 'No. of Email IDs' },
  { name: 'Office 365 Email Server Renewal', category: 'Email Services', identifierLabel: 'Domain Name', requiresIdentifier: true, supportsProvider: true, supportsServerName: true, supportsPlanName: true, supportsLoginUsername: true, supportsQuantity: true, requiresQuantity: false, quantityLabel: 'No. of Email IDs' },
  { name: 'SSL Renewal', category: 'SSL Certificates', identifierLabel: 'Domain Name', requiresIdentifier: true, supportsProvider: false, supportsServerName: false, supportsPlanName: false, supportsLoginUsername: true, supportsQuantity: true, requiresQuantity: false, quantityLabel: 'No. of Certificates' },
  { name: 'CMS Website AMC Renewal', category: 'Annual Maintenance (AMC)', identifierLabel: 'Website URL', requiresIdentifier: true, supportsProvider: false, supportsServerName: false, supportsPlanName: false, supportsLoginUsername: true, supportsQuantity: false, requiresQuantity: false },
  { name: 'Website Optimization and Security Services', category: 'Technical Support & Security', identifierLabel: 'Website URL', requiresIdentifier: true, supportsProvider: false, supportsServerName: false, supportsPlanName: false, supportsLoginUsername: true, supportsQuantity: false, requiresQuantity: false },
];

const trinetraServices: ServiceSeed[] = [
  { name: 'Trinetra Software Renewal for Vehicle Tracking Device', category: 'FMS', identifierLabel: 'Vehicle / Device ID', requiresIdentifier: false, supportsProvider: false, supportsServerName: false, supportsPlanName: false, supportsLoginUsername: false, supportsQuantity: true, requiresQuantity: true, quantityLabel: 'Quantity' },
  { name: 'Trinetra Software Renewal for 4G Dome Camera', category: '4G Dome Camera', identifierLabel: 'Camera / Device ID', requiresIdentifier: false, supportsProvider: false, supportsServerName: false, supportsPlanName: false, supportsLoginUsername: false, supportsQuantity: true, requiresQuantity: true, quantityLabel: 'Quantity' },
  { name: 'Trinetra Software Renewal for iWay License', category: 'iWay', identifierLabel: 'License / Device ID', requiresIdentifier: false, supportsProvider: false, supportsServerName: false, supportsPlanName: false, supportsLoginUsername: false, supportsQuantity: true, requiresQuantity: true, quantityLabel: 'Quantity' },
  { name: 'Trinetra Software Renewal for IoT Device', category: 'IoT', identifierLabel: 'IoT Device ID', requiresIdentifier: false, supportsProvider: false, supportsServerName: false, supportsPlanName: false, supportsLoginUsername: false, supportsQuantity: true, requiresQuantity: true, quantityLabel: 'Quantity' },
];

const anglerProviders: ProviderSeed[] = [
  { name: 'Bigrock', categoryCode: 'DOMAIN' },
  { name: 'Domgys', categoryCode: 'DOMAIN' },
  { name: 'Godaddy', categoryCode: 'DOMAIN' },
  { name: 'Godaddy (Server)', categoryCode: 'SERVER' },
  { name: 'Google', categoryCode: 'EMAIL' },
  { name: 'Hostinger', categoryCode: 'SERVER' },
  { name: 'Lease Packet', categoryCode: 'EMAIL' },
  { name: 'Network Solutions', categoryCode: 'DOMAIN' },
  { name: 'Only Domains', categoryCode: 'DOMAIN' },
  { name: 'Pair', categoryCode: 'SERVER' },
  { name: 'Pair Domains', categoryCode: 'DOMAIN' },
  { name: 'Shiviom', categoryCode: 'EMAIL' },
  { name: 'Verio', categoryCode: 'SERVER' },
  { name: 'Zoho', categoryCode: 'EMAIL' },
];

const anglerProviderSubItems: ProviderSubItemSeed[] = [
  { provider: 'Bigrock', name: 'accounts@angleritech.com', type: 'DOMAIN' },
  { provider: 'Bigrock', name: 'aet_ashwin@yahoo.com', type: 'DOMAIN' },
  { provider: 'Bigrock', name: 'domain@angleritech.com', type: 'DOMAIN' },
  { provider: 'Domgys', name: 'domain@angleritech.com', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'AndDomTrf9', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'AngDom11', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'AngDom12', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'Angjandom9', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'chakradivers', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'cumar9', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'duinkop', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'it@lgbforge.com', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'kalpakachemicals', type: 'DOMAIN' },
  { provider: 'Godaddy', name: 'skyfast', type: 'DOMAIN' },
  { provider: 'Google', name: 'anglerdomain@gmail.com', type: 'DOMAIN' },
  { provider: 'Network Solutions', name: 'ANGLERITECH', type: 'DOMAIN' },
  { provider: 'Network Solutions', name: 'lmwsclcn', type: 'DOMAIN' },
  { provider: 'Only Domains', name: 'Angler', type: 'DOMAIN' },
  { provider: 'Pair Domains', name: 'cumar9', type: 'DOMAIN' },
  { provider: 'Pair Domains', name: 'jantang9', type: 'DOMAIN' },

  { provider: 'Pair', name: 'Angler02', type: 'SERVER' },
  { provider: 'Pair', name: 'Angler99', type: 'SERVER' },
  { provider: 'Pair', name: 'Anglerdr', type: 'SERVER' },
  { provider: 'Pair', name: 'rasivqs3', type: 'SERVER' },
  { provider: 'Pair', name: 'ANGVPS11', type: 'SERVER' },
  { provider: 'Pair', name: 'ANGVPS12', type: 'SERVER' },
  { provider: 'Pair', name: 'ANGVPS13', type: 'SERVER' },
  { provider: 'Pair', name: 'ANGVPS14', type: 'SERVER' },
  { provider: 'Pair', name: 'ANGVPS15', type: 'SERVER' },
  { provider: 'Pair', name: 'Pravang', type: 'SERVER' },
  { provider: 'Pair', name: 'Injectoplast', type: 'SERVER' },
  { provider: 'Pair', name: 'Revathi', type: 'SERVER' },
  { provider: 'Pair', name: 'djmpc2', type: 'SERVER' },
  { provider: 'Pair', name: 'turbods1', type: 'SERVER' },
  { provider: 'Pair', name: 'angdedvmand97', type: 'SERVER' },
  { provider: 'Pair', name: 'angwpp1', type: 'SERVER' },
  { provider: 'Pair', name: 'vktpr9', type: 'SERVER' },
  { provider: 'Hostinger', name: 'Single Web Hosting', type: 'SERVER' },
  { provider: 'Hostinger', name: 'Business Web Hosting', type: 'SERVER' },
  { provider: 'Hostinger', name: 'Cloud Startup', type: 'SERVER' },
  { provider: 'Hostinger', name: 'KVM 1', type: 'SERVER' },
  { provider: 'Hostinger', name: 'KVM 2', type: 'SERVER' },
  { provider: 'Hostinger', name: 'KVM 4', type: 'SERVER' },
  { provider: 'Hostinger', name: 'KVM 8', type: 'SERVER' },
  { provider: 'Verio', name: 'Verio', type: 'SERVER' },
  { provider: 'Godaddy (Server)', name: 'Ultimate Managed Wordpress', type: 'SERVER' },
  { provider: 'Godaddy (Server)', name: 'Basic Managed Wordpress', type: 'SERVER' },
  { provider: 'Godaddy (Server)', name: 'Web Hosting Deluxe', type: 'SERVER' },

  { provider: 'Shiviom', name: 'G Suite', type: 'EMAIL' },
  { provider: 'Shiviom', name: 'Office 365', type: 'EMAIL' },
  { provider: 'Lease Packet', name: 'G Suite', type: 'EMAIL' },
  { provider: 'Lease Packet', name: 'Office 365', type: 'EMAIL' },
  { provider: 'Zoho', name: 'Zoho', type: 'EMAIL' },
];

const anglerServicePlans = [
  'Budget Starter Server',
  'Basic Server',
  'Basic Managed Wordpress Server',
  'Value Starter Server',
  'Value Special Server',
  'Business Server',
  'Cloud Startup Server',
  'Corporate Server',
  'Dedicated Server',
  'VPS Server',
  'VPS Windows Server',
  'Economy Server',
];

async function findCompany(namePart: string) {
  const company = await (prisma as any).company.findFirst({
    where: { name: { contains: namePart }, is_active: true },
    orderBy: { id: 'desc' },
  });
  if (!company) throw new Error(`Parent company not found: ${namePart}`);
  return company;
}

async function upsertCategory(seed: CategorySeed, companyId: number) {
  const existing = await (prisma as any).renewalServiceCategory.findFirst({
    where: { name: seed.name, company_id: companyId },
  });
  const data = { ...seed, company_id: companyId, is_active: true };
  if (existing) {
    return (prisma as any).renewalServiceCategory.update({ where: { id: existing.id }, data });
  }
  return (prisma as any).renewalServiceCategory.create({ data });
}

async function upsertService(seed: ServiceSeed, companyId: number, categoryId: number) {
  const existing = await (prisma as any).renewalServiceMaster.findFirst({
    where: { name: seed.name, company_id: companyId },
  });
  const data = {
    name: seed.name,
    category_id: categoryId,
    company_id: companyId,
    identifier_label: seed.identifierLabel,
    requires_identifier: seed.requiresIdentifier,
    supports_provider: seed.supportsProvider,
    requires_provider: false,
    supports_server_name: seed.supportsServerName,
    requires_server_name: false,
    supports_plan_name: seed.supportsPlanName,
    requires_plan_name: false,
    supports_login_username: seed.supportsLoginUsername,
    requires_login_username: false,
    supports_quantity: seed.supportsQuantity,
    requires_quantity: seed.requiresQuantity,
    quantity_label: seed.quantityLabel || null,
    default_duration_value: 12,
    default_duration_unit: 'months',
    is_active: true,
  };
  if (existing) {
    return (prisma as any).renewalServiceMaster.update({ where: { id: existing.id }, data });
  }
  return (prisma as any).renewalServiceMaster.create({ data });
}

async function upsertProvider(seed: ProviderSeed) {
  const existing = await (prisma as any).renewalProvider.findFirst({
    where: { name: seed.name },
  });
  const data = {
    name: seed.name,
    category_code: seed.categoryCode || null,
    is_active: true,
  };
  if (existing) {
    return (prisma as any).renewalProvider.update({ where: { id: existing.id }, data });
  }
  return (prisma as any).renewalProvider.create({ data });
}

async function upsertProviderSubItem(seed: ProviderSubItemSeed, providerId: number) {
  const existing = await (prisma as any).renewalProviderSubItem.findFirst({
    where: { provider_id: providerId, name: seed.name },
  });
  const data = {
    provider_id: providerId,
    name: seed.name,
    type: seed.type,
    is_active: true,
  };
  if (existing) {
    return (prisma as any).renewalProviderSubItem.update({ where: { id: existing.id }, data });
  }
  return (prisma as any).renewalProviderSubItem.create({ data });
}

async function upsertServicePlan(name: string) {
  const existing = await (prisma as any).renewalServicePlanMaster.findFirst({
    where: { name },
  });
  const data = {
    name,
    category_code: 'SERVER',
    is_active: true,
  };
  if (existing) {
    return (prisma as any).renewalServicePlanMaster.update({ where: { id: existing.id }, data });
  }
  return (prisma as any).renewalServicePlanMaster.create({ data });
}

async function seedCompany(companyId: number, categories: CategorySeed[], services: ServiceSeed[]) {
  const categoryMap = new Map<string, any>();
  for (const categorySeed of categories) {
    const category = await upsertCategory(categorySeed, companyId);
    categoryMap.set(category.name, category);
  }
  for (const serviceSeed of services) {
    const category = categoryMap.get(serviceSeed.category);
    if (!category) throw new Error(`Missing category ${serviceSeed.category} for ${serviceSeed.name}`);
    await upsertService(serviceSeed, companyId, category.id);
  }
}

async function seedAnglerProviderMasters() {
  const providerMap = new Map<string, any>();
  for (const seed of anglerProviders) {
    const provider = await upsertProvider(seed);
    providerMap.set(provider.name, provider);
  }
  for (const seed of anglerProviderSubItems) {
    const provider = providerMap.get(seed.provider);
    if (!provider) throw new Error(`Missing provider ${seed.provider}`);
    await upsertProviderSubItem(seed, provider.id);
  }
  for (const planName of anglerServicePlans) {
    await upsertServicePlan(planName);
  }
}

export async function seedRenewalCompanyMasters() {
  await seedBrandProfiles();
  const angler = await findCompany('ANGLER');
  const trinetra = await findCompany('Trinetra');
  await seedCompany(angler.id, anglerCategories, anglerServices);
  await seedCompany(trinetra.id, trinetraCategories, trinetraServices);
  await seedAnglerProviderMasters();
  console.log('[seedRenewalCompanyMasters] Seeded company-scoped renewal masters', {
    angler: {
      id: angler.id,
      categories: anglerCategories.length,
      services: anglerServices.length,
      providers: anglerProviders.length,
      providerSubItems: anglerProviderSubItems.length,
      servicePlans: anglerServicePlans.length,
    },
    trinetra: { id: trinetra.id, categories: trinetraCategories.length, services: trinetraServices.length },
  });
}

if (require.main === module) {
  seedRenewalCompanyMasters()
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

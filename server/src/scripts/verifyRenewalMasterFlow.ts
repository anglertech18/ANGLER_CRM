import { prisma } from '../lib/prisma';
import { createRenewalAccount, updateRenewalAccount } from '../services/renewalService';

const runTag = `MASTER-FLOW-${Date.now()}`;

async function getCompany(name: string) {
  const company = await (prisma as any).company.findFirst({
    where: { name, is_active: true },
  });
  if (!company) throw new Error(`Company not found: ${name}`);
  return company;
}

async function getScopedCategories(companyId: number) {
  const scopedCount = await (prisma as any).renewalServiceCategory.count({
    where: { is_active: true, company_id: companyId },
  });
  return (prisma as any).renewalServiceCategory.findMany({
    where: { is_active: true, company_id: scopedCount > 0 ? companyId : null },
    select: { id: true, name: true, code: true, company_id: true },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  });
}

async function getScopedServices(companyId: number) {
  const scopedCount = await (prisma as any).renewalServiceMaster.count({
    where: { is_active: true, company_id: companyId },
  });
  return (prisma as any).renewalServiceMaster.findMany({
    where: { is_active: true, company_id: scopedCount > 0 ? companyId : null },
    select: {
      id: true,
      name: true,
      company_id: true,
      identifier_label: true,
      requires_identifier: true,
      supports_provider: true,
      supports_server_name: true,
      supports_plan_name: true,
      supports_login_username: true,
      supports_quantity: true,
      requires_quantity: true,
      quantity_label: true,
      category: { select: { name: true, company_id: true } },
    },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  });
}

async function ensureClientCompany(companyName: string) {
  return (prisma as any).clientCompany.upsert({
    where: { name: companyName },
    update: { is_active: true },
    create: { name: companyName, is_active: true },
  });
}

async function ensureContact(clientCompanyId: number) {
  return (prisma as any).renewalContact.create({
    data: {
      client_company_id: clientCompanyId,
      name: `Flow Contact ${runTag}`,
      email: `flow.${runTag.toLowerCase()}@example.com`,
      mobile: '9000010001',
      role: 'PRIMARY',
      is_primary: true,
      is_renewal_contact: true,
      is_active: true,
    },
  });
}

async function countOutboxForOrder(orderNumber: string) {
  return (prisma as any).notificationOutbox.count({
    where: { mapping_context: { contains: orderNumber } },
  });
}

async function main() {
  const angler = await getCompany('ANGLER');
  const trinetra = await getCompany('Trinetra');
  const user = await (prisma as any).user.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } });
  const userId = user?.id || 1;

  const [anglerCategories, trinetraCategories, anglerServices, trinetraServices, brandProfiles] = await Promise.all([
    getScopedCategories(angler.id),
    getScopedCategories(trinetra.id),
    getScopedServices(angler.id),
    getScopedServices(trinetra.id),
    (prisma as any).renewalBrandProfile.findMany({
      where: { is_active: true, company_id: { in: [angler.id, trinetra.id] } },
      select: { id: true, profile_name: true, company_id: true, company_name: true, sender_email: true, website_url: true },
      orderBy: { company_id: 'asc' },
    }),
  ]);

  const client = await ensureClientCompany(`ZZ Flow Client ${runTag}`);
  const contact = await ensureContact(client.id);
  const domainService = anglerServices.find((service: any) => service.name === 'Domain Renewal');
  if (!domainService) throw new Error('ANGLER Domain Renewal service not found');

  const orderNumber = `FLOW-${runTag}`;
  const outboxBeforeCreate = await countOutboxForOrder(orderNumber);
  const account = await createRenewalAccount({
    company_id: angler.id,
    client_company_id: client.id,
    order_number: orderNumber,
    status: 'DRAFT',
    contact_ids: [contact.id],
    services: [{
      service_master_id: domainService.id,
      identifier: `flow-${runTag.toLowerCase()}.com`,
      customer_contact_id: contact.id,
      expiry_date: '2027-08-29',
      activation_date: '2026-08-29',
      amount_due: 1234,
      amount_collected: 0,
    }],
  }, userId);
  const outboxAfterCreate = await countOutboxForOrder(orderNumber);

  await updateRenewalAccount(account.id, {
    notes: `Updated by ${runTag}`,
    contact_ids: [contact.id],
    services: [],
  }, userId);
  const outboxAfterUpdate = await countOutboxForOrder(orderNumber);

  console.dir({
    companies: { angler: { id: angler.id, name: angler.name }, trinetra: { id: trinetra.id, name: trinetra.name } },
    brandProfiles,
    createFormMasters: {
      angler: {
        categories: anglerCategories.map((category: any) => category.name),
        services: anglerServices.map((service: any) => ({
          name: service.name,
          category: service.category.name,
          fields: {
            identifier: service.requires_identifier ? service.identifier_label : 'optional',
            provider: service.supports_provider,
            serverName: service.supports_server_name,
            planName: service.supports_plan_name,
            loginUsername: service.supports_login_username,
            quantity: service.supports_quantity ? service.quantity_label || 'Quantity' : false,
          },
        })),
      },
      trinetra: {
        categories: trinetraCategories.map((category: any) => category.name),
        services: trinetraServices.map((service: any) => ({
          name: service.name,
          category: service.category.name,
          fields: {
            identifier: service.requires_identifier ? service.identifier_label : 'optional',
            provider: service.supports_provider,
            serverName: service.supports_server_name,
            planName: service.supports_plan_name,
            loginUsername: service.supports_login_username,
            quantity: service.supports_quantity ? service.quantity_label || 'Quantity' : false,
          },
        })),
      },
    },
    createUpdateMailCheck: {
      orderNumber,
      accountId: account.id,
      outboxBeforeCreate,
      outboxAfterCreate,
      outboxAfterUpdate,
      mailQueuedOnCreateOrUpdate: outboxAfterUpdate > outboxBeforeCreate,
    },
  }, { depth: null });
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

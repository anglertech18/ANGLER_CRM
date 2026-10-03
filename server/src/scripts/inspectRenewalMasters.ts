import { prisma } from '../lib/prisma';

async function main() {
  const companies = await (prisma as any).company.findMany({
    where: { is_active: true, OR: [{ name: { contains: 'ANGLER' } }, { name: { contains: 'Trinetra' } }, { name: { contains: 'TRINETRA' } }] },
    select: { id: true, name: true, is_active: true },
    orderBy: { id: 'asc' },
  });

  const companyIds = companies.map((company: any) => company.id);
  const categories = await (prisma as any).renewalServiceCategory.findMany({
    where: {
      is_active: true,
      OR: [{ company_id: { in: companyIds } }, { company_id: null }],
    },
    select: { id: true, name: true, code: true, company_id: true, parent_id: true },
    orderBy: [{ company_id: 'asc' }, { name: 'asc' }],
  });

  const services = await (prisma as any).renewalServiceMaster.findMany({
    where: {
      is_active: true,
      OR: [{ company_id: { in: companyIds } }, { company_id: null }],
    },
    select: {
      id: true,
      name: true,
      company_id: true,
      category_id: true,
      sub_category_id: true,
      identifier_label: true,
      requires_identifier: true,
      supports_provider: true,
      requires_provider: true,
      supports_server_name: true,
      supports_plan_name: true,
      supports_login_username: true,
      supports_quantity: true,
      requires_quantity: true,
      quantity_label: true,
      default_reminder_policy_id: true,
      category: { select: { id: true, name: true, company_id: true } },
      default_policy: { select: { id: true, name: true, company_id: true } },
    },
    orderBy: [{ company_id: 'asc' }, { name: 'asc' }],
  });

  const brandProfiles = await (prisma as any).renewalBrandProfile.findMany({
    where: {
      is_active: true,
      OR: [{ company_id: { in: companyIds } }, { company_id: null }],
    },
    select: {
      id: true,
      profile_name: true,
      company_id: true,
      company_name: true,
      sender_email: true,
      website_url: true,
      is_default: true,
    },
    orderBy: [{ company_id: 'asc' }, { id: 'asc' }],
  });

  console.dir({ companies, brandProfiles, categories, services }, { depth: null });
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

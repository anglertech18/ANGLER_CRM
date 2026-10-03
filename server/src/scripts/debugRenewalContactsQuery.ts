import { prisma } from '../lib/prisma';

async function main() {
  const page = 1;
  const limit = 250;
  const skip = (page - 1) * limit;
  const take = limit;
  const where: any = { is_active: true };
  const validClientCompanies = await (prisma as any).clientCompany.findMany({
    where: { is_active: true },
    select: { id: true },
  });
  where.client_company_id = { in: validClientCompanies.map((company: any) => company.id) };

  const rows = await (prisma as any).renewalContact.findMany({
    where,
    skip,
    take,
    include: {
      client_company: { select: { id: true, name: true } },
    },
    orderBy: [{ is_primary: 'desc' }, { name: 'asc' }],
  });
  const total = await (prisma as any).renewalContact.count({ where });
  console.dir({ total, returned: rows.length, sample: rows.slice(0, 3) }, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

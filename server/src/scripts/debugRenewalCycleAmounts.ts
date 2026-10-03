import { prisma } from '../lib/prisma';

async function main() {
  const rows = await (prisma as any).renewalCycle.findMany({
    where: { service_instance_id: { in: [3, 39] } },
    select: {
      id: true,
      service_instance_id: true,
      amount_due: true,
      amount_collected: true,
      outstanding: true,
      status: true,
      is_active: true,
    },
    orderBy: { id: 'asc' },
  });
  console.dir(rows.map((row: any) => ({
    ...row,
    amount_due: String(row.amount_due),
    amount_collected: String(row.amount_collected),
    outstanding: String(row.outstanding),
  })), { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

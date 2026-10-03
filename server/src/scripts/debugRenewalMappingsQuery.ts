import { prisma } from '../lib/prisma';

async function main() {
  const where: any = { is_active: true };
  const [rows, total] = await Promise.all([
    (prisma as any).renewalServiceInstance.findMany({
      where,
      skip: 0,
      take: 10,
      orderBy: { expiry_date: 'asc' },
      include: {
        renewal_account: {
          include: {
            client_company: { select: { id: true, name: true } },
          },
        },
        service_master: {
          include: {
            category: { select: { id: true, name: true, code: true, color: true } },
          },
        },
        customer_contact: { select: { id: true, name: true, email: true } },
        instance_alert_steps: {
          where: { is_active: true },
          orderBy: { step_number: 'asc' },
          select: { id: true, days_before: true, channel: true, step_number: true },
        },
        _count: { select: { instance_alert_steps: true } },
      },
    }),
    (prisma as any).renewalServiceInstance.count({ where }),
  ]);

  console.dir({
    total,
    returned: rows.length,
    sample: rows.slice(0, 3).map((row: any) => ({
      id: row.id,
      client: row.renewal_account?.client_company?.name,
      service: row.service_master?.name,
      assigned_user_id: row.assigned_user_id,
    })),
  }, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

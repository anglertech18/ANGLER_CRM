import { prisma } from '../lib/prisma';

async function main() {
  const accounts = await (prisma as any).renewalAccount.findMany({
    where: {
      OR: [
        { order_number: { contains: 'VERIFY-' } },
        { order_number: { contains: 'MASTER-FLOW-' } },
        { client_company: { name: { startsWith: 'ZZ Test ' } } },
        { client_company: { name: { startsWith: 'ZZ Flow ' } } },
      ],
    },
    select: { id: true },
  });
  const accountIds = accounts.map((account: any) => account.id);

  const instances = accountIds.length
    ? await (prisma as any).renewalServiceInstance.findMany({
        where: { renewal_account_id: { in: accountIds } },
        select: { id: true },
      })
    : [];
  const instanceIds = instances.map((instance: any) => instance.id);

  if (instanceIds.length) {
    await (prisma as any).renewalReminder.deleteMany({ where: { cycle: { service_instance_id: { in: instanceIds } } } });
    await (prisma as any).renewalCycle.deleteMany({ where: { service_instance_id: { in: instanceIds } } });
    await (prisma as any).renewalServiceInstance.deleteMany({ where: { id: { in: instanceIds } } });
  }
  if (accountIds.length) {
    await (prisma as any).renewalAccountContact.deleteMany({ where: { renewal_account_id: { in: accountIds } } });
    await (prisma as any).renewalDocument.deleteMany({ where: { renewal_account_id: { in: accountIds } } });
    await (prisma as any).renewalAuditLog.deleteMany({ where: { renewal_account_id: { in: accountIds } } });
    await (prisma as any).renewalAccount.deleteMany({ where: { id: { in: accountIds } } });
  }

  const contacts = await (prisma as any).renewalContact.deleteMany({
    where: {
      OR: [
        { email: { contains: '.verify-' } },
        { email: { contains: '.master-flow-' } },
        { name: { startsWith: 'Flow Contact MASTER-FLOW-' } },
      ],
    },
  });

  const clients = await (prisma as any).clientCompany.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'ZZ Test ' } },
        { name: { startsWith: 'ZZ Flow ' } },
      ],
    },
  });

  const services = await (prisma as any).renewalServiceMaster.deleteMany({
    where: {
      OR: [
        { name: { contains: 'VERIFY-' } },
        { name: { contains: 'MASTER-FLOW-' } },
      ],
    },
  });

  const categories = await (prisma as any).renewalServiceCategory.deleteMany({
    where: {
      OR: [
        { name: { contains: 'VERIFY-' } },
        { name: { contains: 'MASTER-FLOW-' } },
      ],
    },
  });

  console.log('[cleanupRenewalVerificationData]', {
    accounts: accountIds.length,
    instances: instanceIds.length,
    contacts: contacts.count,
    clients: clients.count,
    services: services.count,
    categories: categories.count,
  });
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

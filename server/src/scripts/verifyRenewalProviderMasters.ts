import { prisma } from '../lib/prisma';

async function main() {
  const providers = await (prisma as any).renewalProvider.count({ where: { is_active: true } });
  const subItems = await (prisma as any).renewalProviderSubItem.count({ where: { is_active: true } });
  const plans = await (prisma as any).renewalServicePlanMaster.count({ where: { is_active: true } });

  const sampleProviders = await (prisma as any).renewalProvider.findMany({
    where: { name: { in: ['Pair', 'Godaddy', 'Hostinger', 'Shiviom', 'Zoho'] } },
    select: { id: true, name: true, category_code: true },
    orderBy: { name: 'asc' },
  });

  const sampleItems = await (prisma as any).renewalProviderSubItem.findMany({
    where: { name: { in: ['Angler02', 'Angjandom9', 'G Suite', 'KVM 8', 'Ultimate Managed Wordpress'] } },
    select: { provider_id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  });

  const samplePlans = await (prisma as any).renewalServicePlanMaster.findMany({
    where: { name: { in: ['Basic Server', 'VPS Windows Server', 'Economy Server'] } },
    select: { id: true, name: true, category_code: true },
    orderBy: { name: 'asc' },
  });

  console.dir({ providers, subItems, plans, sampleProviders, sampleItems, samplePlans }, { depth: null });
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

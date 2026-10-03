const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function main() {
  const catCount = await prisma.renewalServiceCategory.count();
  const masterCount = await prisma.renewalServiceMaster.count();
  const planCount = await prisma.renewalServicePlanMaster.count();
  const provCount = await prisma.renewalProvider.count();
  const subCount = await prisma.renewalProviderSubItem.count();

  console.log('=== LOCAL DATABASE MASTER DATA AUDIT ===');
  console.log(`- Renewal Categories: ${catCount}`);
  console.log(`- Service Masters: ${masterCount}`);
  console.log(`- Server Service Plans: ${planCount}`);
  console.log(`- Providers (Email/Domain/Server): ${provCount}`);
  console.log(`- Provider Sub-Items / Accounts / Servers: ${subCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

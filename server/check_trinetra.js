const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.renewalNotificationTemplate.findMany({
    where: { name: { startsWith: 'Trinetra' } },
    select: { id: true, name: true, subject: true, category_code: true }
  });
  console.log('=== TRINETRA TEMPLATES SEEDED IN LOCAL DB ===');
  console.table(templates);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

process.env.DATABASE_URL = "mysql://root:@127.0.0.1:3306/kannan_angler_crm_v1";
const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING ALL TABLES IN LOCAL DATABASE ===\n');

  const tables = await prisma.$queryRawUnsafe('SHOW TABLES');
  const tableNames = tables.map(r => Object.values(r)[0]);
  console.log(`Total Tables in Local DB: ${tableNames.length}`);

  console.log('Has notification_outbox:', tableNames.includes('notification_outbox'));
  console.log('Has user:', tableNames.includes('user'));
  console.log('Has department:', tableNames.includes('department'));

  const userCount = await prisma.user.count();
  console.log(`Total Users in Local DB: ${userCount}`);

  const outboxCount = await prisma.notificationOutbox.count().catch(e => e.message);
  console.log(`Notification Outbox count: ${outboxCount}`);

  await prisma.$disconnect();
}

main().catch(console.error);

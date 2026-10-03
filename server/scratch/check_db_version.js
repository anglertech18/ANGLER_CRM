const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT VERSION() as version`;
    console.log('Database Version:', result[0].version);
  } catch (err) {
    console.error('Error fetching version:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

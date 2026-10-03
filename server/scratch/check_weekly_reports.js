const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const reports = await prisma.weeklyReport.findMany({
      take: 5,
      include: {
        details: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    console.log('Recent Weekly Reports:', JSON.stringify(reports, null, 2));
  } catch (err) {
    console.error('Error fetching reports:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

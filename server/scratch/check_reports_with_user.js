const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const reports = await prisma.weeklyReport.findMany({
      include: {
        details: true,
        user: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    console.log('Total Reports:', reports.length);
    reports.forEach((r, i) => {
        console.log(`Report #${i+1} (ID: ${r.id}, Date: ${r.date}, User: ${r.user.email} [ID: ${r.user_id}])`);
        const prev = r.details.filter(d => d.type === 'PREVIOUS').length;
        const curr = r.details.filter(d => d.type === 'CURRENT').length;
        console.log(`- Previous Details: ${prev}`);
        console.log(`- Current Details: ${curr}`);
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

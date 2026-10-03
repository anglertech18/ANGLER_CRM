const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const reports = await prisma.weeklyReport.findMany({
      include: {
        details: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    console.log('Total Reports:', reports.length);
    reports.forEach((r, i) => {
        console.log(`Report #${i+1} (ID: ${r.id}, Date: ${r.date})`);
        const prev = r.details.filter(d => d.type === 'PREVIOUS').length;
        const curr = r.details.filter(d => d.type === 'CURRENT').length;
        console.log(`- Previous Details: ${prev}`);
        console.log(`- Current Details: ${curr}`);
        r.details.forEach(d => {
            console.log(`  * ${d.type} ${d.metric}: ${d.lead_id || d.value}`);
        });
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

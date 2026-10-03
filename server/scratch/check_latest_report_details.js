const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const latestReport = await prisma.weeklyReport.findFirst({
      where: { user_id: 1 },
      include: {
        details: {
          include: {
            lead: {
              include: { company_master: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    console.log('Latest Report ID:', latestReport?.id);
    console.log('Details Count:', latestReport?.details?.length);
    if (latestReport) {
        latestReport.details.forEach(d => {
            console.log(`- ${d.type} ${d.metric}: ${d.lead_id} (${d.lead ? (d.lead.company_master?.name || d.lead.company_name) : 'No Lead Data'})`);
        });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

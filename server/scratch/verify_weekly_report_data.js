const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const reports = await prisma.weeklyReport.findMany({
      take: 1,
      include: {
        user: true,
        details: {
          include: {
            lead: {
                include: {
                    company_master: true
                }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    if (reports.length > 0) {
        const report = reports[0];
        console.log('Latest Report Date:', report.date);
        console.log('Details Count:', report.details.length);
        report.details.forEach(d => {
            console.log(`- Type: ${d.type}, Metric: ${d.metric}, Lead: ${d.lead ? (d.lead.company_master?.name || d.lead.company_name) : 'N/A'}`);
        });
    } else {
        console.log('No reports found.');
    }
  } catch (err) {
    console.error('Error fetching reports:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

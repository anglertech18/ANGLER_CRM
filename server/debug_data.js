
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugData() {
    try {
        const leads = await prisma.lead.findMany({
            include: {
                company_master: true
            }
        });

        console.log('--- DEBUG DATA ---');
        leads.forEach(l => {
            console.log(`Lead ID: ${l.id}, Quadrant: ${l.quadrant}, Company ID: ${l.company_id}, Company Name: ${l.company_master?.name || 'NULL'}`);
        });
        console.log('--- END DEBUG ---');
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

debugData();

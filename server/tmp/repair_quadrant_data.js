const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairData() {
    try {
        const nullLeads = await prisma.lead.findMany({
            where: { quadrant_updated_at: null },
            select: { id: true, updated_at: true }
        });

        console.log(`Found ${nullLeads.length} leads with null quadrant_updated_at`);

        for (const lead of nullLeads) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { quadrant_updated_at: lead.updated_at }
            });
            console.log(`Updated lead ID ${lead.id} with quadrant_updated_at = ${lead.updated_at}`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

repairData();

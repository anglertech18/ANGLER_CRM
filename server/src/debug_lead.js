const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log('Searching for Q4 leads...');
    try {
        const leads = await prisma.lead.findMany({
            where: { quadrant: 'Q4' },
            include: { product: true, owner: true }
        });
        console.log(`Found ${leads.length} leads in Q4.`);
        leads.forEach(l => {
            console.log(`ID: ${l.id}, Product: ${l.product?.name} (ID: ${l.product_id}), Owner: ${l.owner?.first_name} (ID: ${l.lead_owner_id}), QuadrantUpdated: ${l.quadrant_updated_at}, Devices: ${l.device_count}, CreatedAt: ${l.created_at}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
debug();

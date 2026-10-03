const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log('Searching for FMS leads created/updated in April 2026...');
    
    const leads = await prisma.lead.findMany({
        where: {
            quadrant: 'Q4'
        },
        include: {
            product: true,
            lead_owner: true
        }
    });

    console.log(`Found ${leads.length} leads in Q4.`);
    leads.forEach(l => {
        console.log(`ID: ${l.id}, Product: ${l.product?.name} (ID: ${l.product_id}), Owner: ${l.lead_owner?.first_name} (ID: ${l.lead_owner_id}), Created: ${l.created_at}, UpdatedAt: ${l.updated_at}, QuadrantUpdated: ${l.quadrant_updated_at}, Devices: ${l.device_count}`);
    });

    await prisma.$disconnect();
}

debug();

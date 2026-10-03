import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
    console.log('Searching for Q4 leads...');
    
    try {
        const leads = await prisma.lead.findMany({
            where: {
                quadrant: 'Q4'
            },
            include: {
                product: true,
                owner: true
            }
        });

        console.log(`Found ${leads.length} leads in Q4.`);
        leads.forEach((l: any) => {
            console.log(`ID: ${l.id}`);
            console.log(`  Product: ${l.product?.name} (ID: ${l.product_id})`);
            console.log(`  Owner: ${l.owner?.first_name} (ID: ${l.lead_owner_id})`);
            console.log(`  Created: ${l.created_at}`);
            console.log(`  QuadrantUpdated: ${l.quadrant_updated_at}`);
            console.log(`  Devices: ${l.device_count}`);
        });
    } catch (err) {
        console.error('Prisma Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

debug();

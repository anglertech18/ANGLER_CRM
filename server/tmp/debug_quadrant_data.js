const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function debugLeads() {
    try {
        const month = '2026-03';
        const targetUserId = 5;

        console.log(`Checking leads for User ${targetUserId}`);
        
        const leads = await prisma.lead.findMany({
            where: { lead_owner_id: targetUserId },
            select: {
                id: true,
                quadrant: true,
                quadrant_updated_at: true,
                product_id: true,
                product_or_service: true
            }
        });

        leads.forEach(l => {
            console.log(`ID: ${l.id}, Q: ${l.quadrant}, Q_Up: ${l.quadrant_updated_at}, PID: ${l.product_id}, Type: ${l.product_or_service}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugLeads();

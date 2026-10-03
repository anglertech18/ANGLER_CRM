const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function debugLeads() {
    try {
        const month = '2026-03';
        const startOfMonth = dayjs(`${month}-01`).startOf('month').toDate();
        const endOfMonth = dayjs(`${month}-01`).endOf('month').toDate();
        const targetUserId = 5;
        const productId = 1;

        console.log(`Checking leads for User ${targetUserId}, Month: ${month}, Product ID: ${productId}`);
        
        const leads = await prisma.lead.findMany({
            where: {
                lead_owner_id: targetUserId,
                created_at: { gte: startOfMonth, lte: endOfMonth },
                product_id: productId
            },
            select: {
                id: true,
                quadrant: true,
                created_at: true,
                product_id: true
            }
        });

        console.log(`Total leads found: ${leads.length}`);
        
        leads.forEach(l => {
            console.log(`ID: ${l.id}, Q: ${l.quadrant}, Created: ${l.created_at}, PID: ${l.product_id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugLeads();

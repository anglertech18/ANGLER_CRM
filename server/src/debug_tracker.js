const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log('Searching for CallTracker records for User 6 on April 02, 2026...');
    try {
        const records = await prisma.callTracker.findMany({
            where: {
                user_id: 6,
                date: {
                    gte: new Date('2026-04-02'),
                    lte: new Date('2026-04-02T23:59:59')
                }
            },
            include: { product: true, call_status: true }
        });
        
        console.log(`Found ${records.length} tracker records.`);
        records.forEach(r => {
            console.log(`ID: ${r.id}, Product: ${r.product?.name} (ID: ${r.product_id}), Call Status: ${r.call_status?.name} (ID: ${r.call_status_id})`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
debug();

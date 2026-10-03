const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log('Searching for CallLog records for User 6 in April 2026...');
    try {
        const logs = await prisma.callLog.findMany({
            where: {
                user_id: 6,
                start_time: {
                    gte: new Date('2026-04-01'),
                    lte: new Date('2026-04-30')
                }
            },
            include: { lead: { include: { product: true } } }
        });
        
        console.log(`Found ${logs.length} call logs.`);
        logs.forEach(l => {
            console.log(`ID: ${l.id}, Date: ${l.start_time}, Product: ${l.lead?.product?.name} (ID: ${l.lead?.product_id})`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
debug();

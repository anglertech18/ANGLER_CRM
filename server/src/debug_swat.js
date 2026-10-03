const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log('Searching for SwatPerformance records for User 6 in April 2026...');
    try {
        const records = await prisma.swatPerformance.findMany({
            where: {
                user_id: 6,
                date: {
                    gte: new Date('2026-04-01'),
                    lte: new Date('2026-04-30')
                }
            },
            include: { product: true }
        });
        
        console.log(`Found ${records.length} records.`);
        records.forEach(r => {
            console.log(`ID: ${r.id}, Date: ${r.date}, Product: ${r.product?.name} (ID: ${r.product_id}), Calls Achieved: ${r.calls_achieved}, Activities Achieved: ${r.activities_achieved}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
debug();

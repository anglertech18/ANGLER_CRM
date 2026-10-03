const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
    const logs = await prisma.swatPerformance.findMany({
        orderBy: { id: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(logs, null, 2));
}

checkDb()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

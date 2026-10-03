const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    const models = [
        'userProductTarget', 'userServiceTarget', 'swatPerformance',
        'swatKeyClosure', 'weeklyReport', 'planOfAction', 'partner'
    ];
    for (let m of models) {
        try {
            await prisma[m].findFirst();
            console.log(m + ': OK');
        } catch (e) {
            console.log(m + ': MISSING (' + e.message.split('\n')[0] + ')');
        }
    }
    prisma.$disconnect();
}
check();

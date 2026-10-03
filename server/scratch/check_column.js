const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const productTargets = await prisma.$queryRawUnsafe('DESCRIBE UserProductTarget;');
        console.log('UserProductTarget Columns:', JSON.stringify(productTargets, null, 2));

        const serviceTargets = await prisma.$queryRawUnsafe('DESCRIBE UserServiceTarget;');
        console.log('UserServiceTarget Columns:', JSON.stringify(serviceTargets, null, 2));

        const testTarget = await prisma.userProductTarget.findFirst();
        console.log('Test Target from Prisma:', JSON.stringify(testTarget, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        console.log('--- TABLES IN DB ---');
        console.table(tables);
    } catch (err) {
        console.error('Failed to show tables:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();

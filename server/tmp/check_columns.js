const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const columns = await prisma.$queryRaw`SHOW COLUMNS FROM BulkUploadStaging`;
        console.log('--- COLUMNS IN BulkUploadStaging ---');
        console.table(columns);
    } catch (err) {
        console.error('Failed to show columns:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function describeTable() {
    try {
        const columns = await prisma.$queryRaw`DESCRIBE weeklyreport`;
        console.log('Columns in weeklyreport:', JSON.stringify(columns, null, 2));
    } catch (error) {
        console.error('Error describing table:', error);
    } finally {
        await prisma.$disconnect();
    }
}

describeTable();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTable() {
    try {
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        console.log('Tables in DB:', JSON.stringify(tables, null, 2));
        
        const weeklyReportExists = await prisma.$queryRaw`SHOW TABLES LIKE 'WeeklyReport'`;
        console.log('WeeklyReport table exists:', JSON.stringify(weeklyReportExists, null, 2));
    } catch (error) {
        console.error('Error checking tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTable();

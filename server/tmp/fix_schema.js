const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSQL() {
    try {
        console.log('ALTERING CallTracker.date to be nullable...');
        await prisma.$executeRawUnsafe(`ALTER TABLE CallTracker MODIFY date DATETIME NULL DEFAULT NULL;`);
        console.log('SUCCESS: CallTracker.date is now nullable.');
        
        // Also check if we should do Lead if matching field exists
        // but user specifically mentioned Bulk Upload (CallTracker)
    } catch (err) {
        console.error('FAILED TO ALTER TABLE:', err);
    } finally {
        await prisma.$disconnect();
    }
}
runSQL();

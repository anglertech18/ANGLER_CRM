const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fixing orphaned FollowUpLogs...");
    try {
        const deleted = await prisma.$executeRawUnsafe(`DELETE FROM FollowUpLog WHERE lead_id NOT IN (SELECT id FROM Lead)`);
        console.log(`Deleted ${deleted} orphaned FollowUpLog records.`);
    } catch (e) {
        console.log("Error:", e);
    }
    
    // Also try checking for WeeklyReportDetail
    try {
        const deleted2 = await prisma.$executeRawUnsafe(`DELETE FROM WeeklyReportDetail WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM Lead)`);
        console.log(`Deleted ${deleted2} orphaned WeeklyReportDetail records.`);
    } catch(e) {
        console.log("Error2:", e);
    }
}
main().finally(() => prisma.$disconnect());

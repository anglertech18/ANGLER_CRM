const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0;');
    const tables = [
      { tbl: 'Privilege', col: 'user_id' },
      { tbl: 'UserProductTarget', col: 'user_id' },
      { tbl: 'UserServiceTarget', col: 'user_id' },
      { tbl: 'Lead', col: 'lead_owner_id' },
      { tbl: 'Lead', col: 'created_by_id' },
      { tbl: 'CallLog', col: 'user_id' },
      { tbl: 'ActivityLog', col: 'user_id' },
      { tbl: 'CallActivityLog', col: 'user_id' },
      { tbl: 'SwatPerformance', col: 'user_id' },
      { tbl: 'PomodoroSession', col: 'user_id' },
      { tbl: 'PricingNegotiationLog', col: 'user_id' },
      { tbl: 'FollowUpLog', col: 'created_by_id' },
      { tbl: 'LeadQuadrantHistory', col: 'user_id' }
    ];
    for (const { tbl, col } of tables) {
      const res = await prisma.$executeRawUnsafe(`DELETE FROM ${tbl} WHERE ${col} IS NOT NULL AND ${col} NOT IN (SELECT id FROM User);`);
      console.log(`Deleted orphaned rows from ${tbl}:`, res);
    }
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1;');
    console.log("Cleanup complete.");
  } catch(e) {
    console.error("Cleanup error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();

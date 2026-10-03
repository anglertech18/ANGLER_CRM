const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0;');
    const res = await prisma.$executeRawUnsafe('DELETE FROM Privilege WHERE user_id NOT IN (SELECT id FROM User);');
    console.log("Deleted orphaned rows:", res);
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1;');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();

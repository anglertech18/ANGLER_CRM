const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTwenty() {
  try {
    const sTargets = await prisma.userServiceTarget.findMany({
        where: { calls_target: 20 }
    });
    console.log('Service Targets with Calls=20:', JSON.stringify(sTargets, null, 2));
    
    const pTargets = await prisma.userProductTarget.findMany({
        where: { calls_target: 20 }
    });
    console.log('Product Targets with Calls=20:', JSON.stringify(pTargets, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

findTwenty();

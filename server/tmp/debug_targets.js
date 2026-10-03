const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTargets() {
  try {
    const targets = await prisma.userServiceTarget.findMany({
        include: { user: { select: { id: true, first_name: true, last_name: true } } }
    });
    console.log('User Service Targets:', JSON.stringify(targets, null, 2));
    
    const userProductTargets = await prisma.userProductTarget.findMany({
        include: { user: { select: { id: true, first_name: true, last_name: true } } }
    });
    console.log('User Product Targets:', JSON.stringify(userProductTargets, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkTargets();

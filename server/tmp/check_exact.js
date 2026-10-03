const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExactValue() {
  try {
    const target = await prisma.userServiceTarget.findUnique({
        where: { id: 1 }
    });
    console.log('Target ID 1:', target);
    console.log('Type of leads_target:', typeof target.leads_target);
    console.log('Leads Target Multiplied:', target.leads_target * 16);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkExactValue();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMe() {
  try {
    // Assuming user 6 is the one from the screenshot based on previous logs
    const userId = 6; 
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            service_targets: true,
            product_targets: true
        }
    });
    console.log('User 6 Details:', JSON.stringify(user, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkMe();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser12() {
  try {
    const userId = 12; 
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            service_targets: true,
            product_targets: true
        }
    });
    console.log('User 12 Details:', JSON.stringify(user, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser12();

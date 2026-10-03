const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTargets() {
  try {
    const targets = await prisma.userServiceTarget.findMany({
        include: { user: { select: { id: true, first_name: true, last_name: true } } }
    });
    console.log('--- USER SERVICE TARGETS ---');
    targets.forEach(t => {
        console.log(`User: ${t.user.first_name} ${t.user.last_name} (ID: ${t.user_id}), Dept: ${t.service_department}, Leads: ${t.leads_target}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkTargets();

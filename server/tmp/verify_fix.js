const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const userTarget = await prisma.userServiceTarget.findFirst();
    if (!userTarget) {
      console.log('No UserServiceTarget found.');
      return;
    }
    
    console.log('Found userTarget:', userTarget);
    const multiplier = 16.0;
    const days = 22;
    const q1_lead_gen_target = Math.round(((userTarget.leads_target || 0) * multiplier) / days);
    
    console.log(`Leads Target: ${userTarget.leads_target}`);
    console.log(`Multiplier: ${multiplier}`);
    console.log(`Days: ${days}`);
    console.log(`Calculated Q1 Target: ${q1_lead_gen_target}`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

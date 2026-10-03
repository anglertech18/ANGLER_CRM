const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function checkExisting() {
  try {
    const date = dayjs('2026-04-11').startOf('day').toDate();
    const existing = await prisma.swatPerformance.findFirst({
        where: {
            user_id: 5,
            date: date,
            service_department: 'EIT Services'
        }
    });
    console.log('Existing SWAT Record for User 5 Today:', JSON.stringify(existing, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkExisting();

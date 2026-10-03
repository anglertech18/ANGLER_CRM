const { PrismaClient } = require('../prisma/v2-client');
const prisma = new PrismaClient();

async function main() {
    // Check actual DB state
    const trackers = await prisma.$queryRawUnsafe('SELECT * FROM cashflow_tracker');
    console.log('Trackers:', JSON.stringify(trackers, null, 2));

    const milestones = await prisma.$queryRawUnsafe('SELECT * FROM cashflow_milestone');
    console.log('Milestones:', JSON.stringify(milestones, null, 2));

    // Check column definitions
    const cols = await prisma.$queryRawUnsafe("DESCRIBE cashflow_milestone");
    console.log('Milestone columns:', JSON.stringify(cols, null, 2));
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });

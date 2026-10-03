const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const prisma = new PrismaClient();

async function test() {
    const month = '2026-03'; // Use a month that has data or just check current
    const startOfMonth = dayjs.utc(`${month}-01`).startOf('month').toDate();
    const endOfMonth = dayjs.utc(`${month}-01`).endOf('month').toDate();

    console.log(`Checking leads for ${month}...`);

    const qLeads = await prisma.lead.findMany({
        where: {
            quadrant_updated_at: { gte: startOfMonth, lte: endOfMonth },
            quadrant: { in: ['Q1', 'Q2', 'Q3', 'Q4'] }
        },
        select: { id: true, quadrant: true, quadrant_updated_at: true, created_at: true }
    });

    console.log(`Found ${qLeads.length} leads matching criteria.`);

    const report = {};
    qLeads.forEach(l => {
        const date = l.quadrant_updated_at || l.created_at;
        const day = dayjs.utc(date).date();
        if (!report[day]) report[day] = {};
        report[day][l.quadrant] = (report[day][l.quadrant] || 0) + 1;
    });

    console.log('Day-wise breakdown:', JSON.stringify(report, null, 2));

    await prisma.$disconnect();
}

test().catch(console.error);

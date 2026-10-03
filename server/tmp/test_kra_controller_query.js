const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

async function debugKraLogic() {
    try {
        const month = '2026-03';
        const targetUserId = 5;
        const type = 'Product';
        const product_id = '1';

        const startOfMonth = dayjs(`${month}-01`).startOf('month').toDate();
        const endOfMonth = dayjs(`${month}-01`).endOf('month').toDate();

        console.log(`Calculating KRA data for User ${targetUserId}, Month: ${month}, Product: ${product_id}`);

        // Quarterly Leads Count logic (Leads currently in that quadrant, grouped by creation date)
        const qLeadsWhere = {
            lead_owner_id: targetUserId,
            created_at: { gte: startOfMonth, lte: endOfMonth },
            quadrant: { in: ['Q1', 'Q2', 'Q3', 'Q4'] }
        };
        if (type === 'Product' && product_id) qLeadsWhere.product_id = parseInt(product_id);

        const qLeads = await prisma.lead.findMany({
            where: qLeadsWhere,
            select: { created_at: true, quadrant: true }
        });

        console.log(`Leads found: ${qLeads.length}`);

        const q1LeadsDailyData = {};
        const q2LeadsDailyData = {};

        qLeads.forEach(l => {
            const day = dayjs.utc(l.created_at).date();
            console.log(`Grouping Lead Created: ${l.created_at}, Quadrant: ${l.quadrant} -> Day: ${day}`);
            if (l.quadrant === 'Q1') q1LeadsDailyData[day] = (q1LeadsDailyData[day] || 0) + 1;
            else if (l.quadrant === 'Q2') q2LeadsDailyData[day] = (q2LeadsDailyData[day] || 0) + 1;
        });

        console.log('Q1 Prospect Data:', q1LeadsDailyData);
        console.log('Q2 Prospect Data:', q2LeadsDailyData);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugKraLogic();

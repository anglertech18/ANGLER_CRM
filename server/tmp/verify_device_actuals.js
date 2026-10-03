const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

async function debugDeviceActuals() {
    try {
        const month = '2026-03';
        const targetUserId = 5;
        const type = 'Product';
        const product_id = '1';

        const startOfMonth = dayjs(`${month}-01`).startOf('month').toDate();
        const endOfMonth = dayjs(`${month}-01`).endOf('month').toDate();

        console.log(`Verifying Device Actuals for User ${targetUserId}, Month: ${month}, Product: ${product_id}`);

        const leads = await prisma.lead.findMany({
            where: {
                lead_owner_id: targetUserId,
                created_at: { gte: startOfMonth, lte: endOfMonth },
                product_id: parseInt(product_id),
                quadrant: { in: ['Q1', 'Q2', 'Q3', 'Q4'] }
            },
            select: { id: true, created_at: true, quadrant: true, device_count: true }
        });

        console.log(`Leads found: ${leads.length}`);

        const qDevicesDaily = { Q1: {}, Q2: {}, Q3: {}, Q4: {} };

        leads.forEach(l => {
            const day = dayjs.utc(l.created_at).date();
            const count = parseInt(l.device_count || '0') || 0;
            console.log(`Lead ${l.id} | Q: ${l.quadrant} | Created: ${l.created_at} | Devices: ${l.device_count} -> Parsed: ${count} | Day: ${day}`);
            
                const q = l.quadrant;
                qDevicesDaily[q][day] = (qDevicesDaily[q][day] || 0) + count;
        });

        console.log('Resulting Daily Device Data:');
        console.log(JSON.stringify(qDevicesDaily, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugDeviceActuals();

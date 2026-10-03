
async function testSubmit() {
    try {
        const payload = {
            date: '2026-04-29',
            curr_q4_to_order: '61',
            curr_q3_to_q4: '50',
            curr_q2_to_q3: '38',
            curr_notes: 'Test current notes',
            prev_q4_to_order: '61', // Simulating previous week data
            prev_q3_to_q4: '50',
            prev_q2_to_q3: '38',
            prev_notes: 'Test prev notes'
        };

        console.log('Sending payload:', JSON.stringify(payload, null, 2));
        
        // This won't work without authentication, but I can check the controller logic by running it directly in a script.
    } catch (err) {
        console.error(err);
    }
}

// Direct controller test
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function testControllerLogic() {
    const body = {
        date: '2026-04-29',
        curr_q4_to_order: '61',
        curr_q3_to_q4: '50',
        curr_q2_to_q3: '38',
        curr_notes: 'Test current notes',
        prev_q4_to_order: '61',
        prev_q3_to_q4: '50',
        prev_q2_to_q3: '38',
        prev_notes: 'Test prev notes'
    };

    const parseIds = (str) => {
        if (!str) return [];
        return str.split(/[,\n]/).map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    };

    const detailsData = [];
    parseIds(body.curr_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q4_TO_ORDER' }));
    parseIds(body.curr_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q3_TO_Q4' }));
    parseIds(body.curr_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q2_TO_Q3' }));
    if (body.curr_notes) detailsData.push({ value: body.curr_notes, type: 'CURRENT', metric: 'NOTES' });

    parseIds(body.prev_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q4_TO_ORDER' }));
    parseIds(body.prev_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q3_TO_Q4' }));
    parseIds(body.prev_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q2_TO_Q3' }));
    if (body.prev_notes) detailsData.push({ value: body.prev_notes, type: 'PREVIOUS', metric: 'NOTES' });

    console.log('Details Data Count:', detailsData.length);
    console.log(JSON.stringify(detailsData, null, 2));
    
    // Test creation
    const report = await prisma.weeklyReport.create({
        data: {
            date: dayjs(body.date).toDate(),
            user_id: 1,
            details: { create: detailsData }
        },
        include: { details: true }
    });
    
    console.log('Report Created with ID:', report.id);
    console.log('Final Details Count:', report.details.length);
}

testControllerLogic();

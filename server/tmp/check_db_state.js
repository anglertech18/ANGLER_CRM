const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTracker() {
    try {
        const calls = await prisma.callTracker.findMany({
            where: { company_name: 'Test Company' },
            orderBy: { created_at: 'desc' }
        });
        console.log('--- CALLS FOR TEST COMPANY ---');
        console.log(`Found ${calls.length} records`);
        calls.forEach(c => {
            console.log(`ID: ${c.id}, Date: ${c.date.toISOString().split('T')[0]}, User: ${c.user_id}`);
        });
        
        const staged = await prisma.bulkUploadStaging.findMany({
            where: { mapped_data: { contains: 'Test Company' } }
        });
        console.log('\n--- STAGED FOR TEST COMPANY ---');
        staged.forEach(s => {
            console.log(`ID: ${s.id}, User: ${s.user_id}, Error: ${s.has_validation_error}, Msg: ${s.error_message}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkTracker();

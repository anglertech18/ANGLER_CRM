const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        const records = await prisma.bulkUploadStaging.findMany({
            take: 5,
            orderBy: { created_at: 'desc' }
        });
        console.log('--- RECENT STAGED RECORDS ---');
        records.forEach(r => {
            console.log(`ID: ${r.id}, User: ${r.user_id}, Error: ${r.has_validation_error}`);
            try {
                const mapped = JSON.parse(r.mapped_data);
                console.log('Mapped Data Keys:', Object.keys(mapped));
                console.log('Sample data:', { company: mapped.company_name, date: mapped.date, user: mapped.user_id });
            } catch (e) {
                console.log('Mapped Data is not JSON string or fails to parse');
                console.log('Type of mapped_data:', typeof r.mapped_data);
            }
            console.log('---------------------------');
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

debug();

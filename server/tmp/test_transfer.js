const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTransfer() {
    try {
        console.log('--- ATTEMPTING DEBUG TRANSFER ---');
        // Find a record that has no validation error
        const record = await prisma.bulkUploadStaging.findFirst({
            where: { has_validation_error: false },
            orderBy: { created_at: 'desc' }
        });

        if (!record) {
            console.log('No valid staged records found to test');
            return;
        }

        console.log(`Testing record ID: ${record.id}`);
        let rowData = JSON.parse(record.mapped_data);
        console.log('Original rowData User:', rowData.user_id);

        // Rehydrate
        if (rowData.date) rowData.date = new Date(rowData.date);
        if (rowData.next_follow_up_date) rowData.next_follow_up_date = new Date(rowData.next_follow_up_date);

        // Check for duplicate manually first
        const startOfDay = new Date(rowData.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(rowData.date);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await prisma.callTracker.findFirst({
            where: {
                user_id: record.user_id,
                company_name: rowData.company_name,
                date: { gte: startOfDay, lte: endOfDay }
            }
        });

        if (existing) {
            console.log('Record is a duplicate, skipping actual creation test');
        } else {
            console.log('Attempting prisma.callTracker.create...');
            // We use a transaction so we don't pollute the db if it works
            await prisma.$transaction(async (tx) => {
                const created = await tx.callTracker.create({
                    data: rowData
                });
                console.log('SUCCESS: Call created with ID:', created.id);
                // Try convertToLead if applicable
                if (created.moved_to_quad) {
                    console.log('Attempting conversion logic simulation...');
                    // Just simulate it
                }
                throw new Error('ROLLBACK_INTENTIONAL');
            });
        }
    } catch (err) {
        if (err.message === 'ROLLBACK_INTENTIONAL') {
            console.log('Transaction rolled back successfully after proof of success');
        } else {
            console.error('CRITICAL ERROR DURING TRANSFER SIMULATION:');
            console.error(err);
        }
    } finally {
        await prisma.$disconnect();
    }
}

debugTransfer();

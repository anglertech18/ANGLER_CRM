/**
 * Data migration: extract JSON data from mapped_data into individual columns
 * for BulkUploadStaging records that pre-date the column-wise schema change.
 *
 * Run once after applying the Prisma schema migration:
 *   node server/prisma/migrations/migrate_bulk_upload_json_to_columns.js
 */

const { PrismaClient } = require('../v2-client');

const prisma = new PrismaClient();

async function migrate() {
    const records = await prisma.bulkUploadStaging.findMany({
        where: {
            company_name: null,
            mapped_data: { not: null }
        }
    });

    console.log(`Found ${records.length} records to migrate.`);
    let success = 0;
    let failed = 0;

    for (const record of records) {
        try {
            const data = JSON.parse(record.mapped_data);

            await prisma.bulkUploadStaging.update({
                where: { id: record.id },
                data: {
                    date:                    data.date ? new Date(data.date) : null,
                    product_id:              data.product_id    ? Number(data.product_id)    : null,
                    industry_id:             data.industry_id   ? Number(data.industry_id)   : null,
                    source_of_db_id:         data.source_of_db_id ? Number(data.source_of_db_id) : null,
                    company_name:            data.company_name  || null,
                    location:                data.location      || null,
                    contact_person_name:     data.contact_person_name || null,
                    designation:             data.designation   || null,
                    email_address:           data.email_address || null,
                    personal_email:          data.personal_email || null,
                    mobile_no:               data.mobile_no     || null,
                    business_potential:      data.business_potential || null,
                    email_status_id:         data.email_status_id ? Number(data.email_status_id) : null,
                    linkedin_sent:           !!data.linkedin_sent,
                    call_status_id:          data.call_status_id ? Number(data.call_status_id) : null,
                    next_follow_up_date:     data.next_follow_up_date ? new Date(data.next_follow_up_date) : null,
                    moved_to_quad:           data.moved_to_quad || null,
                    remarks:                 data.remarks       || null,
                }
            });

            success++;
        } catch (err) {
            console.error(`Failed to migrate record ID ${record.id}:`, err.message);
            failed++;
        }
    }

    console.log(`Migration complete. Success: ${success}, Failed: ${failed}`);
    await prisma.$disconnect();
}

migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});

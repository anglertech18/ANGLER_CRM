const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Manually creating WeeklyReportDetail table and cleaning up WeeklyReport...');
    try {
        // 1. Create the table if it doesn't exist
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS \`WeeklyReportDetail\` (
                \`id\` INTEGER NOT NULL AUTO_INCREMENT,
                \`weekly_report_id\` INTEGER NOT NULL,
                \`type\` VARCHAR(191) NOT NULL,
                \`metric\` VARCHAR(191) NOT NULL,
                \`lead_id\` INTEGER,
                \`value\` TEXT,
                PRIMARY KEY (\`id\`)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('Table WeeklyReportDetail created or already exists.');

        // 2. Add foreign keys and indexes manually if possible (ignoring errors if they fail)
        try {
            await prisma.$executeRawUnsafe('ALTER TABLE WeeklyReportDetail ADD CONSTRAINT WeeklyReportDetail_weekly_report_id_fkey FOREIGN KEY (weekly_report_id) REFERENCES WeeklyReport(id) ON DELETE CASCADE ON UPDATE CASCADE;');
            console.log('Foreign key for weekly_report_id added.');
        } catch (e) {
            console.warn('Could not add weekly_report_id foreign key.');
        }

        try {
            await prisma.$executeRawUnsafe('ALTER TABLE WeeklyReportDetail ADD CONSTRAINT WeeklyReportDetail_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES Lead(id) ON DELETE SET NULL ON UPDATE CASCADE;');
            console.log('Foreign key for lead_id added.');
        } catch (e) {
            console.warn('Could not add lead_id foreign key.');
        }

        try {
            await prisma.$executeRawUnsafe('CREATE INDEX WeeklyReportDetail_weekly_report_id_type_metric_idx ON WeeklyReportDetail(weekly_report_id, type, metric);');
            console.log('Index added.');
        } catch (e) {
            console.warn('Could not add index.');
        }

        // 3. Remove columns from WeeklyReport manually
        const columnsToRemove = [
            'prev_q4_to_order', 'prev_q3_to_q4', 'prev_q2_to_q3', 'prev_notes',
            'curr_q4_to_order', 'curr_q3_to_q4', 'curr_q2_to_q3', 'curr_notes'
        ];

        for (const col of columnsToRemove) {
            try {
                await prisma.$executeRawUnsafe(`ALTER TABLE WeeklyReport DROP COLUMN ${col};`);
                console.log(`Column ${col} dropped from WeeklyReport.`);
            } catch (e) {
                console.warn(`Could not drop column ${col} (it might not exist).`);
            }
        }

        console.log('Manual schema update complete.');
    } catch (error) {
        console.error('Error during manual schema update:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Manually altering Partner table...");
    try {
        // Add new columns
        await prisma.$executeRawUnsafe(`
            ALTER TABLE Partner 
            ADD COLUMN is_rfi_received TINYINT(1) NOT NULL DEFAULT 0,
            ADD COLUMN is_business_plan_submitted TINYINT(1) NOT NULL DEFAULT 0,
            ADD COLUMN is_business_plan_target_agreed TINYINT(1) NOT NULL DEFAULT 0,
            ADD COLUMN business_plan_target_value INT DEFAULT 0,
            ADD COLUMN is_training_provided TINYINT(1) NOT NULL DEFAULT 0,
            ADD COLUMN is_monthly_engagement_started TINYINT(1) NOT NULL DEFAULT 0
        `);
        console.log("Added new boolean columns.");

        // Drop old columns
        await prisma.$executeRawUnsafe(`
            ALTER TABLE Partner 
            DROP COLUMN rfi_received_date,
            DROP COLUMN business_plan_submitted_date,
            DROP COLUMN business_plan_target_agreed_date,
            DROP COLUMN training_provided_date,
            DROP COLUMN monthly_engagement_started_date
        `);
        console.log("Dropped old date columns.");

    } catch (e) {
        console.error("Error altering table:", e.message);
        // If columns already exist/dropped, we might see errors, which is okay for this manual fix
    }
}

main().finally(() => prisma.$disconnect());

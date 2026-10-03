// Direct SQL migration to add bant_focus_area column
const { PrismaClient } = require('./prisma/v2-client');

async function main() {
    const prisma = new PrismaClient();
    try {
        await prisma.$executeRawUnsafe(
            `ALTER TABLE \`Lead\` ADD COLUMN IF NOT EXISTS \`bant_focus_area\` VARCHAR(191) NULL;`
        );
        console.log('Column added successfully');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();

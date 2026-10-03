
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stages = await prisma.salesStage.findMany();
    console.log('Sales Stages:', JSON.stringify(stages, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

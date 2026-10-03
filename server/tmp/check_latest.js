const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Get last 3 call tracker records
    const calls = await prisma.callTracker.findMany({
        take: 3,
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            company_name: true,
            product_or_service: true,
            product_id: true,
            eit_service_id: true,
            im_service_id: true,
            created_at: true,
            updated_at: true
        }
    });
    console.log("Last 3 records:");
    console.log(JSON.stringify(calls, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

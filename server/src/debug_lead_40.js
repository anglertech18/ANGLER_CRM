const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log('Searching for Lead ID 40...');
    try {
        const l = await prisma.lead.findUnique({
            where: { id: 40 },
            include: { product: true }
        });
        if (l) {
            console.log(`ID: ${l.id}, Product: ${l.product?.name}`);
            console.log(`  device_count: ${l.device_count}`);
            console.log(`  license_count: ${l.license_count}`);
            console.log(`  employee_count: ${l.employee_count}`);
            console.log(`  vendor_count: ${l.vendor_count}`);
            console.log(`  quadrant: ${l.quadrant}`);
            console.log(`  quadrant_updated_at: ${l.quadrant_updated_at}`);
        } else {
            console.log('Lead 40 not found.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
debug();

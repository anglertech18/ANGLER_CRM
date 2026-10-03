const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeviceData() {
    try {
        const leads = await prisma.lead.findMany({
            where: {
                device_count: { not: null }
            },
            select: { id: true, device_count: true, quadrant: true, created_at: true }
        });

        console.log(`Leads with device_count found: ${leads.length}`);
        leads.forEach(l => {
            console.log(`ID: ${l.id} | Devices: ${l.device_count} | Q: ${l.quadrant} | Date: ${l.created_at}`);
        });

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDeviceData();

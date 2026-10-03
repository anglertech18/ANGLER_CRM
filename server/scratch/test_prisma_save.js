const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing save to UserProductTarget...');
        const target = await prisma.userProductTarget.findFirst();
        if (!target) {
            console.log('No targets found to test.');
            return;
        }

        console.log('Original Target:', target);

        const updated = await prisma.userProductTarget.update({
            where: { id: target.id },
            data: { partner_target: 99 }
        });

        console.log('Updated Target:', updated);

        const fetched = await prisma.userProductTarget.findUnique({
            where: { id: target.id }
        });
        console.log('Fetched Target after update:', fetched);

        // Revert
        await prisma.userProductTarget.update({
            where: { id: target.id },
            data: { partner_target: target.partner_target }
        });
        console.log('Reverted changes.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

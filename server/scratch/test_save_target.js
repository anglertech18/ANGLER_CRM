const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing save to UserProductTarget...');
        // Find a valid user and product
        const target = await prisma.userProductTarget.findFirst();
        if (!target) {
            console.log('No targets found to test.');
            return;
        }

        console.log('Original Target:', JSON.stringify(target, null, 2));

        const updated = await prisma.userProductTarget.update({
            where: { id: target.id },
            data: { partner_target: 99 }
        });

        console.log('Updated Target:', JSON.stringify(updated, null, 2));

        const fetched = await prisma.userProductTarget.findUnique({
            where: { id: target.id }
        });
        console.log('Fetched Target after update:', JSON.stringify(fetched, null, 2));

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

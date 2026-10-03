import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const statuses = ['Sent', 'Not Sent', 'Bounced', 'Opened', 'Replied'];

    console.log('Seeding EmailStatus...');
    for (const name of statuses) {
        await prisma.emailStatus.upsert({
            where: { name },
            update: {},
            create: { name }
        });
    }
    console.log('Seeding complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

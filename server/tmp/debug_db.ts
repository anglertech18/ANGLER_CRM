import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const calls = await prisma.callTracker.findMany({
        take: 5,
        orderBy: { id: 'desc' },
        include: {
            product: true,
            eit_service: true,
            im_service: true
        }
    });
    console.log(JSON.stringify(calls, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

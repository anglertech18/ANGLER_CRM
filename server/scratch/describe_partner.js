const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRawUnsafe(`DESCRIBE Partner`);
        console.log(JSON.stringify(columns, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main().finally(() => prisma.$disconnect());

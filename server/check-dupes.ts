import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Checking for duplicate SwatPerformance records...");
    const records = await prisma.swatPerformance.findMany();
    const map = new Map();
    const duplicates = [];

    for (const record of records) {
        const key = `${record.user_id}-${record.date.toISOString()}-${record.product_id}-${record.service_department}`;
        if (map.has(key)) {
            duplicates.push(record.id);
            console.log("Duplicate found:", key, "ID:", record.id);
        } else {
            map.set(key, record.id);
        }
    }

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicates. Deleting them...`);
        const result = await prisma.swatPerformance.deleteMany({
            where: {
                id: { in: duplicates }
            }
        });
        console.log(`Deleted ${result.count} duplicates.`);
    } else {
        console.log("No duplicates found. The error must be something else (possibly a foreign key naming collision).");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

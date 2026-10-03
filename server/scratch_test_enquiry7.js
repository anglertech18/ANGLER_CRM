const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function test() {
    try {
        await prisma.enquiry.create({
            data: {
                date: new Date(),
                company_name: "Test",
                contact_name: "Test",
                is_converted: false,
                lead_source_id: null
            },
            include: {
                lead_source: true,
                country: true,
                state: true,
                city: true,
                validated_by: { select: { id: true, first_name: true, last_name: true } },
                allocated_to: { select: { id: true, first_name: true, last_name: true } },
                product: { select: { id: true, name: true } },
                sales_stage: { select: { id: true, name: true } }
            }
        });
        console.log("Success with null and include");
    } catch (e) {
        console.error("V2 Client Error:", e.message);
    }
    await prisma.$disconnect();
}
test();

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
            }
        });
        console.log("Success with null");
    } catch (e) {
        console.error("V2 Client Error:", e.message);
    }
    await prisma.$disconnect();
}
test();

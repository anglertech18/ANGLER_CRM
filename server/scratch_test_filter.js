const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function test() {
    try {
        const andFilters = [
            { is_converted: false }
        ];

        const product_id = "8";
        const pid = parseInt(product_id);
        
        if (!isNaN(pid)) {
            andFilters.push({ product_id: pid });
        }

        const enquiries = await prisma.enquiry.findMany({
            where: { AND: andFilters },
            select: { id: true, product_id: true }
        });
        
        console.log("Enquiries:", enquiries);
    } catch (e) {
        console.error("Error:", e.message);
    }
    await prisma.$disconnect();
}
test();

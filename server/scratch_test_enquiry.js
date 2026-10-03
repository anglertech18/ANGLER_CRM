const { PrismaClient } = require('./prisma/custom-client');
const prisma = new PrismaClient();

async function test() {
    try {
        await prisma.enquiry.create({
            data: {
                date: new Date(),
                lead_source_id: 1,
                country_id: 1,
                state_id: 1,
                city_id: 1,
                company_name: "Test",
                contact_name: "Test",
                mobile_number: "123",
                email: "test@test.com",
                requirement: "test",
                lead_qualification: "test",
                validated_by_id: 1,
                allocated_to_id: 1,
                product_id: 1,
                linkedin_status: "test",
                sales_stage_id: 1,
                service_department: "EIT Services",
                remarks: "test",
                frequency: "test",
                name: "test",
                mktg_effectiveness: "test",
                is_converted: false,
                converted_at: null
            }
        });
        console.log("Success");
    } catch (e) {
        console.error(e.message);
    }
    await prisma.$disconnect();
}
test();

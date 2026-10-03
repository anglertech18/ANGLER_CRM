const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();

async function test() {
    try {
        const data = {
            country_id: '',
            state_id: '',
            city_id: '',
            company_name: 'TEST COMPANY',
            contact_name: 'TEST CONTACT',
            mobile_number: '',
            email: '',
            requirement: '',
            lead_qualification: '',
            validated_by_id: '',
            allocated_to_id: '',
            product_id: '',
            service_department: '',
            linkedin_status: '',
            sales_stage_id: '',
            remarks: '',
            frequency: '',
            name: '',
            mktg_effectiveness: '',
            is_converted: false
        };

        const parseSafeInt = (val) => {
            const parsed = parseInt(val);
            return isNaN(parsed) ? null : parsed;
        };

        const createData = {
            date: new Date(),
            lead_source_id: parseSafeInt(data.lead_source_id),
            country_id: parseSafeInt(data.country_id),
            state_id: parseSafeInt(data.state_id),
            city_id: parseSafeInt(data.city_id),
            company_name: data.company_name || null,
            contact_name: data.contact_name || null,
            mobile_number: data.mobile_number || null,
            email: data.email || null,
            requirement: data.requirement || null,
            lead_qualification: data.lead_qualification || null,
            validated_by_id: parseSafeInt(data.validated_by_id),
            allocated_to_id: parseSafeInt(data.allocated_to_id),
            product_id: parseSafeInt(data.product_id),
            linkedin_status: data.linkedin_status || null,
            sales_stage_id: parseSafeInt(data.sales_stage_id),
            service_department: data.service_department || null,
            remarks: data.remarks || null,
            frequency: data.frequency || null,
            name: data.name || null,
            mktg_effectiveness: data.mktg_effectiveness || null,
            is_converted: false,
            converted_at: null
        };

        await prisma.enquiry.create({
            data: createData,
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
        console.log("Success with empty UI data");
    } catch (e) {
        console.error("V2 Client Error:", e.message);
    }
    await prisma.$disconnect();
}
test();

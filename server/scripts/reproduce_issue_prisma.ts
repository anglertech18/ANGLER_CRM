
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting Lead Creation Reproduction (Direct Prisma)...');

    // 1. Get Prerequisites
    const user = await prisma.user.findFirst({ where: { email: 'sales1@crm.com' } });
    if (!user) throw new Error('User not found');

    const sbu = await prisma.sBU.findFirst();
    const company = await prisma.company.findFirst();

    // 2. Prepare Data (Simulating final object passed to prisma.create in controller)
    const leadData = {
        first_name: "TestLead",
        last_name: "Reproduction",
        sales_sbu_id: user.sbu_id || sbu?.id || 1,
        lead_owner_id: user.id,
        created_by_id: user.id,
        company_id: company?.id,

        // Simulating converted booleans
        budget_yes_no: true,
        authority_yes_no: true,
        need_yes_no: true,
        timeline_yes_no: true,
        telecalling_qualified: true,

        // Simulating converted numbers
        lead_score: 10,
        reduce_cost_score: 2,

        // Contacts Relation (This is the critical part to test)
        contacts: {
            create: [
                {
                    name: "Contact One",
                    email: "c1@example.com",
                    designation: "Manager",
                    contact_mobile: "1234567890",
                    whatsapp: "" // Empty string test
                }
            ]
        }
    };

    console.log('📤 Attempting to create lead with data:', JSON.stringify(leadData, null, 2));

    try {
        const newLead = await prisma.lead.create({
            data: leadData
        });
        console.log('✅ Lead created successfully:', newLead.id);
    } catch (error: any) {
        console.error('❌ Lead creation failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.meta) console.error('Meta:', error.meta);
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

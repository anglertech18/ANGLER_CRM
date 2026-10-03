
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugData() {
    try {
        // 1. Get Manager Details
        const manager = await prisma.user.findUnique({
            where: { email: 'manager1@crm.com' },
            include: { sbu: true }
        });
        console.log('Manager:', {
            id: manager?.id,
            email: manager?.email,
            role: manager?.role,
            sbu_id: manager?.sbu_id,
            sbu_name: manager?.sbu?.name
        });

        // 2. Get the recently created lead (ID 303)
        const lead = await prisma.lead.findUnique({
            where: { id: 303 },
            include: { sbu: true, owner: true }
        });
        console.log('Lead 303:', {
            id: lead?.id,
            sales_sbu_id: lead?.sales_sbu_id,
            lead_owner_id: lead?.lead_owner_id,
            owner_name: lead?.owner?.first_name
        });

        // 3. Check what query would return
        if (manager) {
            const where: any = {};
            if (manager.role === 'SalesPerson') {
                where.lead_owner_id = manager.id;
            } else if (manager.role === 'SalesManager') {
                where.sales_sbu_id = manager.sbu_id;
            }

            console.log('Query Where Clause:', where);

            const count = await prisma.lead.count({ where });
            console.log(`Manager would see ${count} leads.`);
        }

    } catch (error) {
        console.error('Debug error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugData();

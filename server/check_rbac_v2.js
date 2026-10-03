
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function check() {
    try {
        const leads = await prisma.lead.findMany({
            select: { id: true, lead_owner_id: true, created_by_id: true, sales_sbu_id: true, first_name: true, last_name: true }
        });
        console.log('Leads with SBU and Owners:', JSON.stringify(leads, null, 2));

        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true, sbu_id: true }
        });
        console.log('Users with SBU:', JSON.stringify(users, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}
check();

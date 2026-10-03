
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function check() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true }
        });
        console.log('Users:', JSON.stringify(users, null, 2));

        const leads = await prisma.lead.findMany({
            select: { id: true, lead_owner_id: true, created_by_id: true, first_name: true, last_name: true, quadrant: true }
        });
        console.log('Leads:', JSON.stringify(leads, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}
check();

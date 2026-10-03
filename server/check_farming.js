
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function check() {
    try {
        const leads = await prisma.lead.findMany({
            select: { id: true, first_name: true, is_farming: true }
        });
        console.log('Leads Farming Status:', JSON.stringify(leads, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}
check();

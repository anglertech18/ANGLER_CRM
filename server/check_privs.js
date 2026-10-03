
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function check() {
    try {
        const privileges = await prisma.privilege.findMany({
            include: { user: { select: { email: true, role: true } } }
        });
        console.log('Privileges:', JSON.stringify(privileges, null, 2));

        const sbus = await prisma.sBU.findMany();
        console.log('SBUs:', JSON.stringify(sbus, null, 2));

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

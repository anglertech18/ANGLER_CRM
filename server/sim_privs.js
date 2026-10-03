
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function checkPrivilegeSim(userId, role, moduleName, action) {
    if (role === 'CEO') return true;
    const privilege = await prisma.privilege.findUnique({
        where: {
            user_id_module_name: {
                user_id: userId,
                module_name: moduleName
            }
        }
    });
    return !!(privilege && privilege[action]);
}

async function run() {
    try {
        const users = await prisma.user.findMany();
        for (const user of users) {
            const canViewLeads = await checkPrivilegeSim(user.id, user.role, 'Leads', 'can_view');
            console.log(`User: ${user.email} (${user.role}) - Can View Leads: ${canViewLeads}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();

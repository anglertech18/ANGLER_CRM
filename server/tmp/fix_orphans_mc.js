const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    try {
        // Find orphaned _ManagerCompanies records (Column B is User id)
        const orphaned = await prisma.$queryRaw`
            SELECT mc.A, mc.B FROM _ManagerCompanies mc
            LEFT JOIN \`User\` u ON mc.B = u.id
            WHERE u.id IS NULL
        `;
        
        console.log('Orphaned _ManagerCompanies records (User):', orphaned);
        
        if (orphaned.length > 0) {
            for (const record of orphaned) {
                await prisma.$executeRawUnsafe(`
                    DELETE FROM _ManagerCompanies WHERE A = ${record.A} AND B = ${record.B}
                `);
            }
            console.log(`Deleted ${orphaned.length} orphaned records.`);
        } else {
            console.log('No orphaned records found in _ManagerCompanies (User).');
        }

        // Check Column A (Company id) just in case
        const orphanedA = await prisma.$queryRaw`
            SELECT mc.A, mc.B FROM _ManagerCompanies mc
            LEFT JOIN \`Company\` c ON mc.A = c.id
            WHERE c.id IS NULL
        `;

        if (orphanedA.length > 0) {
            for (const record of orphanedA) {
                await prisma.$executeRawUnsafe(`
                    DELETE FROM _ManagerCompanies WHERE A = ${record.A} AND B = ${record.B}
                `);
            }
            console.log(`Deleted ${orphanedA.length} orphaned records for Company.`);
        }

    } catch (err) {
        console.error('Error fixing orphaned records:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

fix();

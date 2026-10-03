const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    try {
        // Find orphaned LeadScore records
        const orphaned = await prisma.$queryRaw`
            SELECT ls.id FROM LeadScore ls
            LEFT JOIN \`Lead\` l ON ls.lead_id = l.id
            WHERE l.id IS NULL
        `;
        
        console.log('Orphaned LeadScore records:', orphaned);
        
        if (orphaned.length > 0) {
            const ids = orphaned.map(o => o.id);
            await prisma.$executeRawUnsafe(`
                DELETE FROM LeadScore WHERE id IN (${ids.join(',')})
            `);
            console.log(`Deleted ${ids.length} orphaned records.`);
        } else {
            console.log('No orphaned records found in LeadScore.');
        }
    } catch (err) {
        console.error('Error fixing orphaned records:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

fix();

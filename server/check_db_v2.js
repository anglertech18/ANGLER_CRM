
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function check() {
    try {
        const leadCount = await prisma.lead.count();
        console.log(`STATUS:SUCCESS`);
        console.log(`Total Leads: ${leadCount}`);

        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true, sbu_id: true }
        });
        console.log('Users found:', users.length);
        console.log('Users roles:', users.map(u => u.role));

        if (leadCount > 0) {
            const sampleLeads = await prisma.lead.findMany({
                take: 5,
                include: {
                    owner: { select: { email: true } },
                    creator: { select: { email: true } }
                }
            });
            console.log('Sample Leads (ID, Owner, Creator):', sampleLeads.map(l => ({
                id: l.id,
                owner: l.owner?.email,
                creator: l.creator?.email
            })));
        }
    } catch (error) {
        console.log(`STATUS:ERROR`);
        console.error('Error details:', error);
    } finally {
        await prisma.$disconnect();
    }
}

check();

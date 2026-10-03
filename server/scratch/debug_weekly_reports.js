const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('Testing WeeklyReport query...');
        
        // Mock a manager role with ID 1 (adjust as needed)
        const authUserId = 1; 
        
        const subordinates = await prisma.user.findMany({
            where: {
                OR: [
                    { id: authUserId },
                    { reporting_manager_id: authUserId }
                ]
            },
            select: { id: true }
        });
        const ids = subordinates.map(s => s.id);
        console.log('Target IDs:', ids);

        const reports = await prisma.weeklyReport.findMany({
            where: { user_id: { in: ids } },
            include: {
                user: {
                    select: { first_name: true, last_name: true }
                },
                details: {
                    include: {
                        lead: {
                            select: { 
                                id: true, 
                                first_name: true, 
                                last_name: true, 
                                company_name: true, 
                                company_master: { select: { name: true } } 
                            }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        console.log('Reports found:', reports.length);
        if (reports.length > 0) {
            console.log('First report sample:', JSON.stringify(reports[0], null, 2));
        }
    } catch (err) {
        console.error('CRASH DETECTED:');
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

debug();

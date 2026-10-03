const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up User table reporting_manager_id...');
    try {
        const users = await prisma.user.findMany({ select: { id: true } });
        const validUserIds = new Set(users.map(u => u.id));
        
        const modelsToCleanup = [
            { name: 'privilege', field: 'user_id' },
            { name: 'userProductTarget', field: 'user_id' },
            { name: 'userServiceTarget', field: 'user_id' },
            { name: 'weeklyReport', field: 'user_id' },
            { name: 'planOfAction', field: 'user_id' },
            { name: 'callTracker', field: 'user_id' },
            { name: 'enquiry', field: 'validated_by_id' },
            { name: 'enquiry', field: 'allocated_to_id' },
            { name: 'partner', field: 'user_id' }
        ];

        for (const model of modelsToCleanup) {
            console.log(`Checking ${model.name}.${model.field}...`);
            const records = await prisma[model.name].findMany({
                select: { id: true, [model.field]: true }
            });
            const invalidRecords = records.filter((r) => r[model.field] && !validUserIds.has(r[model.field]));
            console.log(`Found ${invalidRecords.length} invalid records in ${model.name}`);
            
            for (const rec of invalidRecords) {
                await prisma[model.name].delete({ where: { id: rec.id } });
                console.log(`Deleted ${model.name} ${rec.id}`);
            }
        }
        
        // Fix self-referencing User.reporting_manager_id
        const usersToFix = await prisma.user.findMany({
            where: { reporting_manager_id: { not: null } },
            select: { id: true, reporting_manager_id: true }
        });
        for (const u of usersToFix) {
            if (!validUserIds.has(u.reporting_manager_id)) {
                await prisma.user.update({ where: { id: u.id }, data: { reporting_manager_id: null } });
                console.log(`Reset reporting_manager_id for User ${u.id}`);
            }
        }

        console.log('Aggressive cleanup complete.');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Adding partner_target column to UserProductTarget and UserServiceTarget...');
    try {
        // 1. Add column to UserProductTarget
        try {
            await prisma.$executeRawUnsafe('ALTER TABLE UserProductTarget ADD COLUMN partner_target INTEGER DEFAULT 0;');
            console.log('Column partner_target added to UserProductTarget.');
        } catch (e) {
            console.warn('Could not add partner_target to UserProductTarget (it might already exist).');
        }

        // 2. Add column to UserServiceTarget
        try {
            await prisma.$executeRawUnsafe('ALTER TABLE UserServiceTarget ADD COLUMN partner_target INTEGER DEFAULT 0;');
            console.log('Column partner_target added to UserServiceTarget.');
        } catch (e) {
            console.warn('Could not add partner_target to UserServiceTarget (it might already exist).');
        }

        console.log('Manual column addition complete.');
    } catch (error) {
        console.error('Error during manual column addition:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

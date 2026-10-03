"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function cleanup() {
    console.log('Starting cleanup...');
    try {
        // 1. Delete Lead related data
        console.log('Deleting Lead related data...');
        await prisma.leadContact.deleteMany({});
        await prisma.leadDocument.deleteMany({});
        await prisma.callLog.deleteMany({});
        await prisma.leadScore.deleteMany({});
        await prisma.leadQuadrantHistory.deleteMany({});
        await prisma.pricingNegotiationLog.deleteMany({});
        // 2. Delete Leads
        console.log('Deleting Leads...');
        await prisma.lead.deleteMany({});
        // 3. Unlink Users from Company and SBU
        console.log('Unlinking Users from Companies and SBUs...');
        await prisma.user.updateMany({
            data: {
                company_id: null,
                sbu_id: null
            }
        });
        // 4. Delete SBUs (dependent on Company)
        console.log('Deleting SBUs...');
        await prisma.sBU.deleteMany({});
        // 5. Delete Companies
        console.log('Deleting Companies...');
        await prisma.company.deleteMany({});
        console.log('Cleanup completed successfully.');
    }
    catch (error) {
        console.error('Error during cleanup:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
cleanup();

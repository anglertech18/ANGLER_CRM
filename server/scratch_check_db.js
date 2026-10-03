const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    try { await prisma.swatPerformance.findFirst(); console.log('SwatPerformance exists'); } catch (e) { console.log('SwatPerformance error', e.message); }
    try { await prisma.userProductTarget.findFirst(); console.log('UserProductTarget exists'); } catch (e) { console.log('UserProductTarget error', e.message); }
    try { await prisma.userServiceTarget.findFirst(); console.log('UserServiceTarget exists'); } catch (e) { console.log('UserServiceTarget error', e.message); }
    try { await prisma.partner.findFirst(); console.log('Partner exists'); } catch (e) { console.log('Partner error', e.message); }
    try { await prisma.planOfAction.findFirst(); console.log('PlanOfAction exists'); } catch (e) { console.log('PlanOfAction error', e.message); }
    try { await prisma.weeklyReport.findFirst(); console.log('WeeklyReport exists'); } catch (e) { console.log('WeeklyReport error', e.message); }
    prisma.$disconnect();
}
check();

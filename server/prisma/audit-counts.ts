import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit() {
  const [
    accounts, instances, cycles, alertSteps, reminders,
    documents, auditLogs, payments, drafts, companies
  ] = await Promise.all([
    prisma.renewalAccount.count(),
    prisma.renewalServiceInstance.count(),
    prisma.renewalCycle.count(),
    prisma.renewalInstanceAlertStep.count(),
    prisma.renewalReminder.count(),
    prisma.renewalDocument.count(),
    prisma.renewalAuditLog.count(),
    prisma.renewalPayment.count(),
    prisma.notificationOutbox.count(),
    prisma.clientCompany.count(),
  ]);

  console.log('\n====== DATABASE AUDIT RESULTS ======');
  console.log(`  ClientCompany:               ${companies}`);
  console.log(`  RenewalAccount:              ${accounts}`);
  console.log(`  RenewalServiceInstance:      ${instances}`);
  console.log(`  RenewalCycle:                ${cycles}`);
  console.log(`  RenewalInstanceAlertStep:    ${alertSteps}`);
  console.log(`  RenewalReminder:             ${reminders}`);
  console.log(`  RenewalDocument:             ${documents}`);
  console.log(`  RenewalAuditLog:             ${auditLogs}`);
  console.log(`  RenewalPayment:              ${payments}`);
  console.log(`  NotificationOutbox:          ${drafts}`);
  console.log('====================================\n');

  // Check reminder tab distribution
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);

  const [todayCount, upcomingCount, overdueCount, sentCount, skippedCount] = await Promise.all([
    prisma.renewalReminder.count({ where: { scheduled_date: { gte: todayStart, lte: todayEnd } } }),
    prisma.renewalReminder.count({ where: { scheduled_date: { gt: todayEnd }, status: 'PENDING' } }),
    prisma.renewalReminder.count({ where: { scheduled_date: { lt: todayStart }, status: 'PENDING' } }),
    prisma.renewalReminder.count({ where: { status: 'SENT' } }),
    prisma.renewalReminder.count({ where: { status: 'SKIPPED' } }),
  ]);

  console.log('====== FOLLOW-UP QUEUE TABS ======');
  console.log(`  Today:      ${todayCount}`);
  console.log(`  Upcoming:   ${upcomingCount}`);
  console.log(`  Overdue:    ${overdueCount}`);
  console.log(`  Completed:  ${sentCount}`);
  console.log(`  Skipped:    ${skippedCount}`);
  console.log('==================================\n');

  await prisma.$disconnect();
}

audit().catch(e => { console.error(e); process.exit(1); });

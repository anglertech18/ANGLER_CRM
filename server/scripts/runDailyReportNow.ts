// Manually run the Daily Report cron for a given date (default: today).
// Usage:
//   npx ts-node scripts/runDailyReportNow.ts            -> runs for today
//   npx ts-node scripts/runDailyReportNow.ts 2026-07-20  -> runs for a specific date (YYYY-MM-DD)
import dayjs from 'dayjs';
import { prisma } from '../src/lib/prisma';
import { runDailyReportGeneration } from '../src/cron/dailyReportCron';

(async () => {
    const reportDate = process.argv[2] || dayjs().format('YYYY-MM-DD');
    await runDailyReportGeneration(reportDate);
    await prisma.$disconnect();
})();

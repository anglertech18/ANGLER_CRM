/**
 * Manually run the Daily Report generation/email job for a single date, without
 * waiting for the 10:15 PM cron (dailyReportCron.ts) or restarting the live server.
 *
 * Usage:
 *   npx ts-node src/scripts/runDailyReportNow.ts [YYYY-MM-DD]
 *   node dist/scripts/runDailyReportNow.js [YYYY-MM-DD]   (after `npm run build`)
 *
 * Defaults to today's date (same window the cron itself targets) if omitted.
 * Safe to re-run: runDailyReportGeneration skips users/companies that already
 * have a DailyReport row for that date (see the `existing` check in dailyReportCron.ts).
 */
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';
import { runDailyReportGeneration } from '../cron/dailyReportCron';

async function main() {
    const arg = process.argv[2];
    if (arg && (!/^\d{4}-\d{2}-\d{2}$/.test(arg) || !dayjs(arg).isValid())) {
        console.error(`[runDailyReportNow] Invalid date "${arg}", expected YYYY-MM-DD.`);
        process.exit(1);
    }
    const reportDate = arg || dayjs().format('YYYY-MM-DD');

    console.log(`[runDailyReportNow] Triggering Daily Report generation for ${reportDate}...`);
    await runDailyReportGeneration(reportDate);
    console.log('[runDailyReportNow] Done.');
}

main()
    .catch((err) => {
        console.error('[runDailyReportNow] Failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

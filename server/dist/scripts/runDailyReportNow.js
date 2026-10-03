"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const dayjs_1 = __importDefault(require("dayjs"));
const prisma_1 = require("../lib/prisma");
const dailyReportCron_1 = require("../cron/dailyReportCron");
async function main() {
    const arg = process.argv[2];
    if (arg && (!/^\d{4}-\d{2}-\d{2}$/.test(arg) || !(0, dayjs_1.default)(arg).isValid())) {
        console.error(`[runDailyReportNow] Invalid date "${arg}", expected YYYY-MM-DD.`);
        process.exit(1);
    }
    const reportDate = arg || (0, dayjs_1.default)().format('YYYY-MM-DD');
    console.log(`[runDailyReportNow] Triggering Daily Report generation for ${reportDate}...`);
    await (0, dailyReportCron_1.runDailyReportGeneration)(reportDate);
    console.log('[runDailyReportNow] Done.');
}
main()
    .catch((err) => {
    console.error('[runDailyReportNow] Failed:', err);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});

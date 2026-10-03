import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { prisma } from '../lib/prisma';

dayjs.extend(utc);
import { sendEmail } from '../utils/emailService';
import { generateDailyReportForUser } from '../services/dailyReportService';

// Generates and emails the automated Daily Report (per active user/product) for a single date.
// Shared by the scheduled cron below and by scripts/runDailyReportNow.ts for manual testing.
export async function runDailyReportGeneration(reportDate: string): Promise<void> {
    console.log(`[DailyReportCron] Running Daily Report generation for ${reportDate}...`);

    const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, first_name: true, last_name: true, company_id: true },
    });

    for (const user of users) {
        try {
            if (!user.company_id) continue;

            const existing = await prisma.dailyReport.findUnique({
                where: { user_id_report_date: { user_id: user.id, report_date: dayjs.utc(reportDate).startOf('day').toDate() } },
            });
            if (existing) continue;

            const generated = await generateDailyReportForUser(user, reportDate);
            if (!generated) continue;

            const company = await prisma.company.findUnique({
                where: { id: user.company_id },
                select: { id: true, report_recipient_email: true },
            });

            const record = await prisma.dailyReport.create({
                data: {
                    report_date: dayjs.utc(reportDate).startOf('day').toDate(),
                    user_id: user.id,
                    company_id: user.company_id,
                    recipient_email: company?.report_recipient_email || '',
                    subject: generated.subject,
                    email_html: generated.html,
                    status: company?.report_recipient_email ? 'generated' : 'failed',
                    error_message: company?.report_recipient_email ? null : 'No report_recipient_email configured for company',
                    products: {
                        create: generated.products.map(p => ({
                            product_id: p.product_id,
                            product_name: p.product_name,
                            leads: { create: p.leads.map(l => ({ lead_id: l.lead_id, lead_name: l.lead_name, quadrant: l.quadrant, follow_up_notes: l.follow_up_notes })) },
                            swat_metrics: { create: p.swat.map(s => ({ category: s.category, target: s.target, achieved: s.achieved })) },
                        })),
                    },
                },
            });

            if (company?.report_recipient_email) {
                try {
                    await sendEmail({ to: company.report_recipient_email, subject: generated.subject, html: generated.html });
                    await prisma.dailyReport.update({ where: { id: record.id }, data: { status: 'sent', sent_at: new Date() } });
                    console.log(`[DailyReportCron] Sent report for user:${user.id} -> ${company.report_recipient_email}`);
                } catch (mailErr: any) {
                    await prisma.dailyReport.update({ where: { id: record.id }, data: { status: 'failed', error_message: mailErr?.message || 'Failed to send email' } });
                    console.error(`[DailyReportCron] Email send failed for user:${user.id}:`, mailErr);
                }
            }
        } catch (err) {
            console.error(`[DailyReportCron] Error processing user:${user.id}:`, err);
        }
    }

    console.log('[DailyReportCron] Daily Report generation completed.');
}

// Runs daily at midnight, after SwatCron (23:59) has persisted the day's SwatPerformance rows,
// generating and emailing an automated Daily Report per active user/product.
export const startDailyReportCron = () => {
    cron.schedule('5 0 * * *', async () => {
        try {
            const reportDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
            await runDailyReportGeneration(reportDate);
        } catch (error) {
            console.error('[DailyReportCron] Fatal error:', error);
        }
    });
};

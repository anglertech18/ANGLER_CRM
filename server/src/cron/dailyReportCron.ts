import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { prisma } from '../lib/prisma';

dayjs.extend(utc);
import { sendEmail } from '../utils/emailService';
import { generateDailyReportsForUser } from '../services/dailyReportService';

// Generates and emails the automated Daily Report for a single date, for every
// user opted in via `daily_report_enabled` (independent of active/inactive
// status — see md files/daily_report/daily_report_updated_development_plan.md).
// A BDE whose products map to more than one company gets one report/email per
// company, each sent to that company's own recipient.
// Shared by the scheduled cron below and by scripts/runDailyReportNow.ts for manual testing.
export async function runDailyReportGeneration(reportDate: string): Promise<void> {
    console.log(`[DailyReportCron] Running Daily Report generation for ${reportDate}...`);

    const users = await prisma.user.findMany({
        where: { daily_report_enabled: true },
        select: { id: true, first_name: true, last_name: true, email: true },
    });

    const reportDbDate = dayjs.utc(reportDate).startOf('day').toDate();

    for (const user of users) {
        try {
            const generatedReports = await generateDailyReportsForUser(user, reportDate);

            for (const generated of generatedReports) {
                try {
                    const existing = await prisma.dailyReport.findUnique({
                        where: { user_id_report_date_company_id: { user_id: user.id, report_date: reportDbDate, company_id: generated.company_id } },
                    });
                    if (existing) continue;

                    const company = await prisma.company.findUnique({
                        where: { id: generated.company_id },
                        select: { id: true, report_recipient_email: true },
                    });

                    const record = await prisma.dailyReport.create({
                        data: {
                            report_date: reportDbDate,
                            user_id: user.id,
                            company_id: generated.company_id,
                            recipient_email: company?.report_recipient_email || '',
                            subject: generated.subject,
                            email_html: generated.html,
                            status: company?.report_recipient_email ? 'generated' : 'failed',
                            error_message: company?.report_recipient_email ? null : 'No report_recipient_email configured for company',
                            products: {
                                // Today's/Expired Sales Activities and Cashflow Milestone/POA are
                                // now count-only summary rows in the report (Modules/reportstructure.md)
                                // — Q4 Lead Activities is the only remaining per-lead detail list, so
                                // that's the only one carried into this audit trail; the full summary
                                // counts live in email_html.
                                create: generated.products.map(p => ({
                                    product_id: p.product_id,
                                    product_name: p.product_name,
                                    leads: { create: p.q4_activities.map(l => ({ lead_id: l.lead_id, lead_name: l.lead_name, quadrant: l.quadrant, follow_up_notes: l.engagement, status: l.status })) },
                                    swat_metrics: { create: p.swat.map(s => ({ category: s.category, target: s.target, achieved: s.achieved })) },
                                })),
                            },
                        },
                    });

                    if (company?.report_recipient_email) {
                        try {
                            await sendEmail({ to: company.report_recipient_email, cc: user.email, subject: generated.subject, html: generated.html });
                            await prisma.dailyReport.update({ where: { id: record.id }, data: { status: 'sent', sent_at: new Date() } });
                            console.log(`[DailyReportCron] Sent report for user:${user.id} company:${generated.company_id} -> ${company.report_recipient_email} (cc: ${user.email})`);
                        } catch (mailErr: any) {
                            await prisma.dailyReport.update({ where: { id: record.id }, data: { status: 'failed', error_message: mailErr?.message || 'Failed to send email' } });
                            console.error(`[DailyReportCron] Email send failed for user:${user.id} company:${generated.company_id}:`, mailErr);
                        }
                    }
                } catch (err) {
                    console.error(`[DailyReportCron] Error processing user:${user.id} company:${generated.company_id}:`, err);
                }
            }
        } catch (err) {
            console.error(`[DailyReportCron] Error processing user:${user.id}:`, err);
        }
    }

    console.log('[DailyReportCron] Daily Report generation completed.');
}

// Runs daily at 10:15 PM, 15 minutes after SwatCron (10:00 PM the same day) has
// persisted today's SwatPerformance rows, generating and emailing an automated
// Daily Report per active user/product for today's date.
export const startDailyReportCron = () => {
    cron.schedule('15 22 * * *', async () => {
        try {
            const reportDate = dayjs().format('YYYY-MM-DD');
            await runDailyReportGeneration(reportDate);
        } catch (error) {
            console.error('[DailyReportCron] Fatal error:', error);
        }
    });
};

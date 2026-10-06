import cron from 'node-cron';
import dayjs from 'dayjs';
import { renderTemplate } from '../utils/templateRenderer';
import { ensureResponsiveEmailHtml } from '../utils/emailHtmlCompatibility';
import { prisma } from '../lib/prisma';
import { refreshCycleStatuses } from '../services/renewalCycleService';
import { processOutbox } from '../services/notificationOutboxService';
import { processConsolidatedMonthlyReminders } from '../services/reminderConsolidationService';
import { acquireCronLock, releaseCronLock, generateInstanceOwnerId } from '../services/cronLockService';
import { dualWriteReminderCreated } from '../services/renewalDualWriteService';

/**
 * Single canonical notification pipeline.
 * Hourly: refresh cycle statuses → monthly consolidated digests → materialize due reminders + alert steps → create notifications → queue outbox.
 * Every 5 min: process QUEUED outbox items (SMTP send).
 */
const JOB_NAME = 'renewal_reminder_cron';

export const startRenewalReminderCron = () => {
  const instanceOwnerId = generateInstanceOwnerId('renewal-cron');

  cron.schedule('0 * * * *', async () => {
    const runId = `RUN_${Date.now()}`;
    console.log(`[RenewalCron] [${runId}] Hourly cron triggered on instance ${instanceOwnerId}. Attempting to acquire DB lease lock...`);

    // Acquire MySQL-compatible database lease lock
    const lockRes = await acquireCronLock(JOB_NAME, instanceOwnerId, 600000); // 10 minute lease

    if (!lockRes.acquired) {
      console.log(`[RenewalCron] [${runId}] SKIPPED_LOCK_HELD (${lockRes.reason}). Another instance is currently executing the pipeline.`);
      return;
    }

    const startTime = Date.now();
    console.log(`[RenewalCron] [${runId}] DB lease lock acquired cleanly by ${instanceOwnerId}. Running hourly renewal pipeline...`);

    try {
      await refreshCycleStatuses();
      const consolidated = await processConsolidatedMonthlyReminders();
      if (consolidated > 0) console.log(`[RenewalCron] [${runId}] Processed ${consolidated} consolidated monthly reminders.`);
      await processDueReminders();
      await materializeAlertStepReminders();
      await recoverMissedReminders();
      console.log(`[RenewalCron] [${runId}] Pipeline completed successfully in ${Date.now() - startTime}ms.`);
    } catch (err) {
      console.error(`[RenewalCron] [${runId}] Fatal error during cron pipeline:`, err);
    } finally {
      const released = await releaseCronLock(JOB_NAME, instanceOwnerId);
      if (released) {
        console.log(`[RenewalCron] [${runId}] DB lease lock released safely.`);
      } else {
        console.warn(`[RenewalCron] [${runId}] Could not release lease lock (may have expired or been reassigned).`);
      }
    }
  });

  const fiveMinCron = '*/5 * * * *';
  cron.schedule(fiveMinCron, async () => {
    try {
      await processOutbox();
    } catch (err) {
      console.error('[OutboxCron] Error:', err);
    }
  });

  console.log(`[RenewalCron] Canonical pipeline scheduled on ${instanceOwnerId} (hourly + outbox every 5 min with MySQL DB lease lock).`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  1. Process PENDING → DUE reminders + create notifications + queue outbox
// ─────────────────────────────────────────────────────────────────────────────

export async function processDueReminders(): Promise<void> {
  const now = dayjs().endOf('day').toDate();

  const dueReminders = await (prisma as any).renewalReminder.findMany({
    where: { status: 'PENDING', due_date: { lte: now } },
    include: {
      cycle: {
        include: {
          service_instance: {
            include: {
              renewal_account: {
                include: {
                  client_company: true,
                  company: { select: { id: true, name: true } },
                },
              },
              service_master: { include: { category: true } },
              provider: { select: { id: true, name: true } },
              customer_contact: true,
            },
          },
        },
      },
      assigned_user: { select: { id: true, first_name: true, last_name: true, email: true } },
      template: true,
    },
    take: 200,
  });

  for (const reminder of dueReminders) {
    try {
      const svc = reminder.cycle?.service_instance;
      const account = svc?.renewal_account;
      const client = account?.client_company?.name ?? 'Customer';
      const serviceName = svc?.service_master?.name ?? 'Service';
      const identifier = svc?.identifier ?? '';
      const expiryDate = svc?.expiry_date ? dayjs(svc.expiry_date).format('DD-MMM-YYYY') : '';
      const daysLeft = svc?.expiry_date ? dayjs(svc.expiry_date).diff(dayjs(), 'day') : 0;
      const amountDue = Number(svc?.amount_due ?? 0);
      const subtotal = amountDue;
      const gst = Math.round(amountDue * 0.18 * 100) / 100;
      const grandTotal = subtotal + gst;

      // Mark reminder as DUE
      await (prisma as any).renewalReminder.update({
        where: { id: reminder.id },
        data: { status: 'DUE' },
      });

      // Create in-app notification if user is assigned
      if (reminder.assigned_user_id) {
        const title = `Renewal Reminder: ${client} – ${serviceName}`;
        const body = identifier
          ? `${identifier} expires on ${expiryDate} (${daysLeft >= 0 ? daysLeft + ' days left' : 'EXPIRED'}). Action: ${reminder.action_type.replace(/_/g, ' ')}`
          : `${serviceName} expires on ${expiryDate}. Action: ${reminder.action_type.replace(/_/g, ' ')}`;

        const existing = await (prisma as any).applicationNotification.findFirst({
          where: { reminder_id: reminder.id, user_id: reminder.assigned_user_id },
        });

        if (!existing) {
          await (prisma as any).applicationNotification.create({
            data: {
              user_id: reminder.assigned_user_id,
              reminder_id: reminder.id,
              type: 'RENEWAL_REMINDER',
              title,
              body,
              link: `/renewals/${account?.id}`,
            },
          });
        }
      }

      // Queue email if channel includes EMAIL and template exists
      const channel = (reminder.channel || '').toUpperCase();
      const channelAction = await (prisma as any).renewalFollowUpChannelAction.findFirst({
        where: { reminder_id: reminder.id, is_deleted: false },
        orderBy: { id: 'asc' },
      });
      if (['APPROVAL', 'APPROVAL_REQUIRED'].includes(String(channelAction?.execution_mode || '').toUpperCase())) {
        console.log(`[RenewalCron] Reminder ${reminder.id} requires approval; automatic delivery was not queued.`);
        continue;
      }
      const templateText = reminder.template?.body_text || reminder.template?.body_html || '';
      const renderedText = renderTemplate(templateText, {
        client_name: client,
        company_name: account?.company?.name ?? '',
        order_number: account?.order_number ?? '',
        service_name: serviceName,
        identifier: identifier,
        expiry_date: expiryDate,
        days_left: String(daysLeft),
        amount_due: String(amountDue),
        subtotal: String(subtotal),
        gst: String(gst),
        grand_total: String(grandTotal),
        provider_name: svc?.provider?.name ?? '',
        account_manager_name: `${reminder.assigned_user?.first_name ?? ''} ${reminder.assigned_user?.last_name ?? ''}`.trim(),
      });

      if ((channel === 'EMAIL' || channel === 'BOTH' || channel === 'EMAIL_DIRECT') && reminder.template) {
        const [recipient] = await resolveRecipients(svc, { days_before: reminder.offset_days ?? 0 });
        if (!recipient?.email) {
          console.warn(`[RenewalCron] Skipping email reminder ${reminder.id}: no consented customer email found.`);
        } else {
          const idemKey = `EMAIL_R${reminder.id}_C${reminder.cycle_id}_S${reminder.step_number}_${svc?.expiry_date ? dayjs(svc.expiry_date).format('YYYY-MM-DD') : 'noexp'}`;

          const alreadyQueued = await (prisma as any).notificationOutbox.findFirst({
          where: { mapping_context: { contains: `"idem_key":"${idemKey}"` } },
        });
          if (!alreadyQueued) {
            await (prisma as any).notificationOutbox.create({
            data: {
              channel: 'EMAIL',
              recipient: recipient.email,
              recipient_name: recipient.name || null,
              subject: reminder.template.subject ?? `Renewal Reminder – ${client}`,
              rendered_body: ensureResponsiveEmailHtml(renderedText),
              template_id: reminder.template.id,
              channel_action_id: channelAction?.id ?? null,
              idempotency_key: idemKey,
              status: 'QUEUED',
              mapping_context: JSON.stringify({
                idem_key: idemKey,
                reminder_id: reminder.id,
                cycle_id: reminder.cycle_id,
                step_number: reminder.step_number,
                company_id: account?.company_id,
                channel_action_id: channelAction?.id ?? null,
                user_id: channelAction?.created_by_id ?? reminder.assigned_user_id ?? null,
                expiry_date: svc?.expiry_date,
              }),
            },
            });
          }
        }
      }

      // Queue WhatsApp if channel includes WHATSAPP or BOTH
      if (channel === 'WHATSAPP' || channel === 'BOTH' || channel === 'SMS') {
        const contact = svc?.customer_contact;
        const targetPhone = contact?.whatsapp || contact?.mobile;

        if (targetPhone && contact?.whatsapp_consent !== false) {
          const idemKey = `WA_R${reminder.id}_C${reminder.cycle_id}_S${reminder.step_number}_${svc?.expiry_date ? dayjs(svc.expiry_date).format('YYYY-MM-DD') : 'noexp'}`;

          const alreadyQueued = await (prisma as any).notificationOutbox.findFirst({
            where: { mapping_context: { contains: `"idem_key":"${idemKey}"` } },
          });

          if (!alreadyQueued) {
            await (prisma as any).notificationOutbox.create({
              data: {
                channel: 'WHATSAPP',
                recipient: targetPhone,
                recipient_name: contact?.name ?? client,
                subject: `WhatsApp Reminder – ${client}`,
                rendered_body: renderedText,
                template_id: reminder.template?.id ?? null,
                channel_action_id: channelAction?.id ?? null,
                idempotency_key: idemKey,
                status: 'QUEUED',
                mapping_context: JSON.stringify({
                  idem_key: idemKey,
                  reminder_id: reminder.id,
                  cycle_id: reminder.cycle_id,
                  company_id: account?.company_id,
                  channel_action_id: channelAction?.id ?? null,
                  user_id: channelAction?.created_by_id ?? reminder.assigned_user_id ?? null,
                  expiry_date: svc?.expiry_date,
                }),
              },
            });
          }
        }
      }
    } catch (err) {
      console.error(`[RenewalCron] Error processing reminder ${reminder.id}:`, err);
    }
  }

  // Handle escalations
  await processEscalations();

  if (dueReminders.length > 0) {
    console.log(`[RenewalCron] Processed ${dueReminders.length} reminders.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. Materialize alert steps as override reminders in the active cycle
// ─────────────────────────────────────────────────────────────────────────────

async function materializeAlertStepReminders(): Promise<void> {
  const today = dayjs().startOf('day');

  const instances = await (prisma as any).renewalServiceInstance.findMany({
    where: {
      status: 'ACTIVE',
      is_active: true,
      expiry_date: { lte: today.add(90, 'day').toDate() },
      instance_alert_steps: { some: { is_active: true } },
    },
    include: {
      instance_alert_steps: { where: { is_active: true }, orderBy: { step_number: 'asc' } },
      renewal_account: { include: { client_company: true, company: { select: { id: true, name: true } } } },
      service_master: { include: { category: true } },
      assigned_user: { select: { id: true, first_name: true, last_name: true, email: true } },
      customer_contact: true,
      cycles: { where: { is_active: true }, orderBy: { cycle_number: 'desc' }, take: 1 },
      follow_up_logs: { orderBy: { logged_at: 'desc' }, take: 5 },
      provider: { select: { id: true, name: true } },
    },
  });

  let materialized = 0;

  for (const instance of instances) {
    if (!instance.expiry_date) continue;
    const activeCycle = instance.cycles?.[0];
    if (!activeCycle) continue;

    // Skip if customer already agreed in current cycle
    const hasAgreement = instance.follow_up_logs?.some(
      (log: any) => log.outcome_code && ['AGREED', 'PAYMENT_PENDING', 'RENEWED'].includes(log.outcome_code)
    );
    if (hasAgreement) continue;

    for (const step of instance.instance_alert_steps) {
      const triggerDate = dayjs(instance.expiry_date).subtract(step.days_before, 'day').startOf('day');
      if (triggerDate.isAfter(today)) continue;

      // Use negative step_number to distinguish from policy-generated reminders
      const reminderStepNum = -step.step_number;

      const existingReminder = await (prisma as any).renewalReminder.findFirst({
        where: { cycle_id: activeCycle.id, step_number: reminderStepNum },
      });
      if (existingReminder) continue;

      const channel = step.channel === 'EMAIL_DIRECT' ? 'EMAIL' : step.channel === 'EMAIL_DRAFT' ? 'EMAIL_DRAFT' : step.channel;

      const reminder = await (prisma as any).renewalReminder.create({
        data: {
          cycle_id: activeCycle.id,
          step_number: reminderStepNum,
          offset_days: step.days_before,
          due_date: triggerDate.toDate(),
          action_type: channel === 'CALL_TASK' ? 'CALL' : 'SEND_EMAIL',
          channel: channel,
          recipient_type: 'CONTACT',
          assigned_user_id: instance.assigned_user_id,
          template_id: step.email_template_id,
          status: 'PENDING',
        },
      });
      
      // Dual-write: Create follow-up task and channel action for this reminder
      await dualWriteReminderCreated(reminder.id, instance.assigned_user_id || 0);
      
      materialized++;
    }
  }

  if (materialized > 0) {
    console.log(`[RenewalCron] Materialized ${materialized} alert step reminder(s).`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. Recover missed reminders (PENDING past their due_date)
// ─────────────────────────────────────────────────────────────────────────────

async function recoverMissedReminders(): Promise<void> {
  const now = dayjs().endOf('day').toDate();

  const missed = await (prisma as any).renewalReminder.findMany({
    where: {
      status: 'PENDING',
      due_date: { lte: now },
    },
    take: 100,
  });

  if (missed.length > 0) {
    await (prisma as any).renewalReminder.updateMany({
      where: { id: { in: missed.map((r: any) => r.id) } },
      data: { status: 'DUE' },
    });
    console.log(`[RenewalCron] Recovered ${missed.length} missed reminder(s) — set to DUE.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Escalation engine (unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────

async function processEscalations(): Promise<void> {
  const now = new Date();
  const escalatable = await (prisma as any).renewalReminder.findMany({
    where: { status: 'DUE', escalated: false, escalation_after_days: { not: null } },
  });

  for (const r of escalatable) {
    if (!r.escalation_after_days) continue;
    const escalateAt = dayjs(r.due_date).add(r.escalation_after_days, 'day');
    if (dayjs(now).isAfter(escalateAt)) {
      await (prisma as any).renewalReminder.update({
        where: { id: r.id },
        data: { escalated: true, escalated_at: now },
      });

      if (r.escalate_to_id) {
        await (prisma as any).applicationNotification.create({
          data: {
            user_id: r.escalate_to_id,
            reminder_id: r.id,
            type: 'RENEWAL_ESCALATION',
            title: 'Escalated Renewal Reminder',
            body: `Reminder step ${r.step_number} was not completed and has been escalated to you.`,
            link: null,
          },
        });
      }
    }
  }
}



export async function resolveRecipients(instance: any, step: any): Promise<{ email: string; name: string }[]> {
  const companyId = instance.renewal_account?.client_company_id;
  if (!companyId) {
    const c = instance.customer_contact;
    if (c?.email && c.email_consent === true) {
      return [{ email: c.email, name: c.name }];
    }
    return [];
  }

  const contacts = await (prisma as any).renewalContact.findMany({
    where: { client_company_id: companyId, is_active: true, email_consent: true },
  });

  if (contacts.length === 0) {
    const c = instance.customer_contact;
    if (c?.email && c.email_consent === true) {
      return [{ email: c.email, name: c.name }];
    }
    return [];
  }

  let targetRole = 'PRIMARY';
  const catCode = instance.service_master?.category?.code;

  if (catCode === 'SSL' || catCode === 'SERVER') {
    targetRole = 'TECHNICAL';
  } else if (step.days_before <= 0) {
    targetRole = 'BILLING';
  }

  let matching = contacts.filter((c: any) => c.role === targetRole || c.use_default_template === true);

  if (matching.length === 0 && targetRole !== 'PRIMARY') {
    matching = contacts.filter((c: any) => c.role === 'PRIMARY' || c.use_default_template === true);
  }

  if (matching.length === 0) {
    matching = [contacts[0]];
  }

  return matching
    .map((c: any) => ({ email: c.email, name: c.name }))
    .filter((c: any) => c.email);
}

import { prisma } from '../lib/prisma';
import { getActiveSmtpConfigDecrypted } from '../controllers/smtpConfigController';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

const MAX_RETRIES = 3;
const RETRY_DELAY_MINUTES = 30;

/**
 * Queue an outbox item with optional channel action linkage.
 * Never throws — outbox failures are non-fatal.
 */
export async function queueNotification(params: {
  channel: string;
  recipient: string;
  ccRecipients?: string;
  subject?: string;
  renderedBody: string;
  templateId?: number;
  mappingContext?: string;
  attachmentPath?: string;
  cycleId?: number;
  stepNumber?: number;
  reminderId?: number;
  digestPeriod?: string;
  clientCompanyId?: number;
  channelActionId?: number;
}): Promise<number | null> {
  try {
    let mappingContextObj: any = {};
    if (params.mappingContext) {
      try { mappingContextObj = JSON.parse(params.mappingContext); } catch {}
    }

    // Construct step-aware / digest-aware idempotency key if not explicitly set in mappingContext
    if (!mappingContextObj.idem_key) {
      if (params.reminderId) {
        mappingContextObj.idem_key = `NOTIF_${params.channel}_R${params.reminderId}_${params.recipient.toLowerCase()}`;
      } else if (params.cycleId && params.stepNumber !== undefined) {
        mappingContextObj.idem_key = `NOTIF_${params.channel}_C${params.cycleId}_S${params.stepNumber}_${params.recipient.toLowerCase()}`;
      } else if (params.digestPeriod && params.clientCompanyId) {
        mappingContextObj.idem_key = `DIGEST_${params.channel}_P${params.digestPeriod}_CC${params.clientCompanyId}_${params.recipient.toLowerCase()}`;
      } else if (params.cycleId) {
        mappingContextObj.idem_key = `NOTIF_${params.channel}_C${params.cycleId}_${params.recipient.toLowerCase()}`;
      }
    }

    if (params.cycleId) mappingContextObj.cycle_id = params.cycleId;
    if (params.reminderId) mappingContextObj.reminder_id = params.reminderId;
    if (params.channelActionId) mappingContextObj.channel_action_id = params.channelActionId;

    const contextStr = Object.keys(mappingContextObj).length > 0 ? JSON.stringify(mappingContextObj) : params.mappingContext ?? null;

    // Deduplication check
    if (mappingContextObj.idem_key) {
      const existing = await (prisma as any).notificationOutbox.findFirst({
        where: {
          channel: params.channel,
          recipient: params.recipient,
          mapping_context: { contains: `"idem_key":"${mappingContextObj.idem_key}"` },
        },
      });
      if (existing) {
        console.log(`[Outbox] Duplicate notification suppressed for key: ${mappingContextObj.idem_key}`);
        return existing.id;
      }
    }

    const outbox = await (prisma as any).notificationOutbox.create({
      data: {
        channel: params.channel,
        recipient: params.recipient,
        cc_recipients: params.ccRecipients ?? null,
        subject: params.subject ?? null,
        rendered_body: params.renderedBody,
        template_id: params.templateId ?? null,
        mapping_context: contextStr,
        attachment_path: params.attachmentPath ?? null,
        channel_action_id: params.channelActionId ?? null,
        idempotency_key: mappingContextObj.idem_key ?? null,
        status: 'QUEUED',
        attempt_count: 0,
      },
    });

    return outbox.id;
  } catch (err) {
    console.error('[Outbox] Failed to queue notification:', err);
    return null;
  }
}

/**
 * Process QUEUED/FAILED outbox items. Called by cron every 5 minutes.
 * State machine: QUEUED → PROCESSING → SENT | FAILED
 */
export async function processOutbox(): Promise<void> {
  const items = await (prisma as any).notificationOutbox.findMany({
    where: {
      status: { in: ['QUEUED', 'FAILED'] },
      attempt_count: { lt: MAX_RETRIES },
      OR: [
        { next_retry_at: null },
        { next_retry_at: { lte: new Date() } },
      ],
    },
    take: 50,
    orderBy: { created_at: 'asc' },
  });

  for (const item of items) {
    let mappingContext: any = {};
    if (item.mapping_context) {
      try { mappingContext = JSON.parse(item.mapping_context); } catch {}
    }
    const actionUserId = Number(mappingContext.user_id) || null;

    // Transition: QUEUED/FAILED → PROCESSING
    const claim = await (prisma as any).notificationOutbox.updateMany({
      where: {
        id: item.id,
        status: item.status,
        attempt_count: item.attempt_count,
      },
      data: { status: 'PROCESSING' },
    });
    if (claim.count !== 1) continue;

    let providerAccepted = false;
    let providerRef: string | null = null;
    try {
      if (item.channel === 'EMAIL') {
        // Load SMTP config dynamically from the database
        const smtpCfg = await getActiveSmtpConfigDecrypted();
        if (process.env.MOCK_EMAIL_SEND === 'true') {
          providerRef = `MOCK_SMTP_${Date.now()}`;
          providerAccepted = true;
          console.log(`[OutboxService] Using controlled test provider for Outbox #${item.id}`);
        } else {
          if (!smtpCfg) throw new Error('No active SMTP configuration is available');

          const transporter = nodemailer.createTransport({
            host: smtpCfg.host,
            port: smtpCfg.port,
            secure: smtpCfg.secure,
            auth: { user: smtpCfg.username, pass: smtpCfg.password },
          });

          const attachments = item.attachment_path ? [
            {
              filename: item.attachment_path.split(/[/\\]/).pop() || 'OrderForm.pdf',
              path: item.attachment_path,
            }
          ] : undefined;

          const sendResult = await transporter.sendMail({
            from: smtpCfg.from_name
              ? `"${smtpCfg.from_name}" <${smtpCfg.from_email}>`
              : smtpCfg.from_email,
            to: item.recipient,
            cc: item.cc_recipients || undefined,
            subject: item.subject ?? 'Renewal Notification',
            html: item.rendered_body,
            attachments,
          });
          providerRef = sendResult.messageId || null;
          providerAccepted = true;
        }
      } else if (item.channel === 'WHATSAPP') {
        // Parse mapping_context for company_id or brand_key if present
        let companyId: number | undefined;
        let brandKey: string | undefined;
        if (item.mapping_context) {
          try {
            const ctx = JSON.parse(item.mapping_context);
            if (ctx.company_id) companyId = Number(ctx.company_id);
            if (ctx.brand_key) brandKey = String(ctx.brand_key);
          } catch (e) {
            // ignore JSON parse error
          }
        }

        // Convert simple HTML tags to WhatsApp markdown
        const textMsg = item.rendered_body
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
          .replace(/<b>(.*?)<\/b>/gi, '*$1*')
          .replace(/<em>(.*?)<\/em>/gi, '_$1_')
          .replace(/<i>(.*?)<\/i>/gi, '_$1_')
          .replace(/<[^>]+>/g, '')
          .trim();

        const { sendWhatsappMessage } = await import('./whatsappWebBridgeService');
        const res = await sendWhatsappMessage({
          recipientPhone: item.recipient,
          messageText: textMsg,
          companyId,
          brandKey,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to dispatch WhatsApp message');
        }
        providerRef = res.messageId || null;
        providerAccepted = true;

        // Save session_phone if available
        if (res.sessionPhone) {
          await (prisma as any).notificationOutbox.update({
            where: { id: item.id },
            data: { session_phone: res.sessionPhone },
          });
        }
      }

      // Transition: PROCESSING → SENT
      await (prisma as any).notificationOutbox.update({
        where: { id: item.id },
        data: {
          status: 'SENT',
          sent_at: new Date(),
          attempt_count: item.attempt_count + 1,
          provider_ref: providerRef,
          error_message: null,
        },
      });

      if (item.channel_action_id) {
        try {
          const { completeChannelActionFromOutbox } = await import('./renewalFollowUpChannelActionService');
          await completeChannelActionFromOutbox(
            item.channel_action_id,
            providerRef || `${item.channel}_${item.id}`,
            actionUserId
          );
        } catch (actionLogError: any) {
          await (prisma as any).notificationOutbox.update({
            where: { id: item.id },
            data: { error_message: `Delivery succeeded; action logging failed: ${actionLogError?.message ?? 'Unknown error'}` },
          });
          console.error(`[OutboxService] Delivery succeeded for item ${item.id}, but action logging failed:`, actionLogError?.message);
        }
      }
    } catch (err: any) {
      // Once the external provider accepted a message, never put it back in the
      // retry queue: doing so can deliver the same customer message twice.
      if (providerAccepted) {
        try {
          await (prisma as any).notificationOutbox.update({
            where: { id: item.id },
            data: {
              status: 'SENT',
              sent_at: new Date(),
              attempt_count: item.attempt_count + 1,
              provider_ref: providerRef,
              error_message: `Delivery accepted; persistence failed: ${err?.message ?? 'Unknown error'}`,
            },
          });
        } catch (persistError: any) {
          console.error(`[OutboxService] Delivery was accepted for item ${item.id}; SENT persistence also failed:`, persistError?.message);
        }
        continue;
      }
      const newCount = item.attempt_count + 1;
      const exhausted = newCount >= MAX_RETRIES;
      const nextRetry = exhausted ? null : dayjs().add(RETRY_DELAY_MINUTES, 'minute').toDate();

      // Transition: PROCESSING → FAILED (exhausted) or back to QUEUED (retryable)
      await (prisma as any).notificationOutbox.update({
        where: { id: item.id },
        data: {
          status: exhausted ? 'FAILED' : 'QUEUED',
          attempt_count: newCount,
          next_retry_at: nextRetry,
          error_message: err?.message ?? 'Unknown error',
        },
      });

      if (exhausted && item.channel_action_id) {
        const { failChannelActionFromOutbox } = await import('./renewalFollowUpChannelActionService');
        await failChannelActionFromOutbox(
          item.channel_action_id,
          err?.message ?? 'Unknown error',
          actionUserId
        );
      }

      console.error(`[OutboxService] Failed to send item ${item.id} (attempt ${newCount}/${MAX_RETRIES}):`, err?.message);
    }
  }
}

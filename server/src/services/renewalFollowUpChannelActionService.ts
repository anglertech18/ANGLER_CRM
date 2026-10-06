import { prisma } from '../lib/prisma';
import { ensureResponsiveEmailHtml } from '../utils/emailHtmlCompatibility';
import { logAudit } from '../utils/renewalAudit';
import { queueNotification } from './notificationOutboxService';
import { logChannelActionStarted, logChannelActionCompleted, logChannelActionFailed } from './renewalCommunicationEventService';
import { getActiveSmtpConfigDecrypted } from '../controllers/smtpConfigController';
import nodemailer from 'nodemailer';

/**
 * Service for managing RenewalFollowUpChannelAction entities.
 * Channel actions represent individual communication actions within a parent follow-up task.
 */
export interface CreateChannelActionInput {
  follow_up_task_id: number;
  renewal_account_id: number;
  service_instance_id: number;
  cycle_id: number;
  reminder_id?: number;
  channel: string;
  action_type: string;
  execution_mode?: string;
  communication_purpose?: string;
  is_required?: boolean;
  scheduled_at?: Date;
  recipient_contact_id?: number;
  recipient_address?: string;
  template_id?: number;
  idempotency_key: string;
  created_by_id?: number;
}

export interface UpdateChannelActionInput {
  status?: string;
  scheduled_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  recipient_contact_id?: number;
  recipient_address?: string;
  template_id?: number;
  provider_message_id?: string;
  outcome_code?: string;
  customer_response?: string;
  notes?: string;
  completed_by_id?: number;
  is_deleted?: boolean;
  digest_outbox_id?: number;
}

/**
 * Create a new channel action within a follow-up task.
 */
export async function createChannelAction(
  data: CreateChannelActionInput,
  userId: number,
  ip?: string
) {
  const action = await (prisma as any).renewalFollowUpChannelAction.create({
    data: {
      ...data,
      execution_mode: data.execution_mode || 'AUTOMATIC',
      is_required: data.is_required !== undefined ? data.is_required : true,
      status: 'PENDING',
    },
  });

  await logAudit({
    accountId: data.renewal_account_id,
    entityType: 'CHANNEL_ACTION',
    entityId: action.id,
    action: 'CREATED',
    newValue: JSON.stringify(data),
    performedById: userId,
    ip,
  });

  return action;
}

/**
 * Get a channel action by ID with relations.
 */
export async function getChannelActionById(id: number) {
  return (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id },
    include: {
      follow_up_task: {
        include: {
          renewal_account: true,
          service_instance: true,
          cycle: true,
        },
      },
      renewal_account: true,
      service_instance: true,
      cycle: true,
      reminder: true,
      recipient_contact: true,
      template: true,
      created_by: true,
      completed_by: true,
      outbox_messages: true,
      communication_events: {
        orderBy: { occurred_at: 'desc' },
        take: 20,
      },
    },
  });
}

/**
 * Get channel actions for a follow-up task.
 */
export async function getChannelActionsByTask(
  followUpTaskId: number,
  filters: {
    status?: string;
    channel?: string;
  } = {}
) {
  const where: any = {
    follow_up_task_id: followUpTaskId,
    is_deleted: false,
  };

  if (filters.status) where.status = filters.status;
  if (filters.channel) where.channel = filters.channel;

  return (prisma as any).renewalFollowUpChannelAction.findMany({
    where,
    include: {
      reminder: true,
      recipient_contact: true,
      template: true,
      created_by: true,
      completed_by: true,
      outbox_messages: true,
    },
    orderBy: { scheduled_at: 'asc' },
  });
}

/**
 * Get channel actions by idempotency key (for deduplication).
 */
export async function getChannelActionByIdempotencyKey(
  idempotencyKey: string
) {
  return (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { idempotency_key: idempotencyKey },
  });
}

/**
 * Update a channel action.
 */
export async function updateChannelAction(
  id: number,
  data: UpdateChannelActionInput,
  userId: number,
  ip?: string
) {
  const old = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id },
  });

  const updated = await (prisma as any).renewalFollowUpChannelAction.update({
    where: { id },
    data,
  });

  await logAudit({
    accountId: old?.renewal_account_id,
    entityType: 'CHANNEL_ACTION',
    entityId: id,
    action: 'UPDATED',
    oldValue: JSON.stringify(old),
    newValue: JSON.stringify(data),
    performedById: userId,
    ip,
  });

  return updated;
}

/**
 * Start execution of a channel action.
 */
export async function startChannelAction(
  id: number,
  userId: number,
  ip?: string
) {
  return updateChannelAction(
    id,
    {
      status: 'IN_PROGRESS',
      started_at: new Date(),
    },
    userId,
    ip
  );
}

/**
 * Complete a channel action with channel validation.
 * Rejects cross-channel submissions (e.g., Call outcome for Email action).
 */
export async function completeChannelAction(
  id: number,
  outcome: {
    provider_message_id?: string;
    outcome_code?: string;
    customer_response?: string;
    notes?: string;
  },
  userId: number,
  ip?: string
) {
  const action = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id },
  });

  if (!action) {
    throw new Error('Channel action not found');
  }

  const isCallChannel = action.channel === 'PHONE' || action.channel === 'CALL' || action.channel === 'CALL_TASK';

  // Call outcomes require an outcome_code
  if (isCallChannel && !outcome.outcome_code) {
    throw new Error('outcome_code is required for Call channel actions');
  }

  // Email/WhatsApp actions should not have call outcome codes
  if ((action.channel === 'EMAIL' || action.channel === 'EMAIL_DIRECT' || action.channel === 'EMAIL_DRAFT' ||
       action.channel === 'WHATSAPP') && outcome.outcome_code) {
    throw new Error('Call outcome codes cannot be used for Email or WhatsApp channel actions');
  }

  const updated = await updateChannelAction(
    id,
    {
      status: 'COMPLETED',
      completed_at: new Date(),
      completed_by_id: userId,
      ...outcome,
    },
    userId,
    ip
  );

  // Write RenewalFollowUpLog for call outcomes so the audit panel shows them
  if (isCallChannel && outcome.outcome_code && action.service_instance_id) {
    try {
      await (prisma as any).renewalFollowUpLog.create({
        data: {
          service_instance_id: action.service_instance_id,
          reminder_id: action.reminder_id ?? null,
          outcome_code: outcome.outcome_code,
          contacted: true,
          notes: outcome.notes ?? null,
          customer_response: outcome.customer_response ?? null,
          logged_by_id: userId,
        },
      });
    } catch (_e) {
      // Non-fatal: audit log failure should not block the completion
      console.warn('[completeChannelAction] Failed to write follow-up log:', _e);
    }
  }

  // Log communication event for this completed action
  try {
    await logChannelActionCompleted(id, outcome, userId, 'USER');
  } catch (_e) {
    console.warn('[completeChannelAction] Failed to log communication event:', _e);
  }

  // Update parent task overall_status if all actions completed
  if (action.follow_up_task_id) {
    try {
      const pendingActions = await (prisma as any).renewalFollowUpChannelAction.count({
        where: {
          follow_up_task_id: action.follow_up_task_id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });
      const newTaskStatus = pendingActions === 0 ? 'COMPLETED' : 'IN_PROGRESS';
      await (prisma as any).renewalFollowUpTask.update({
        where: { id: action.follow_up_task_id },
        data: { overall_status: newTaskStatus },
      });
    } catch (_e) {}
  }

  // Also complete associated reminder if present
  if (action.reminder_id) {
    try {
      await (prisma as any).renewalReminder.update({
        where: { id: action.reminder_id },
        data: { status: 'COMPLETED', completed_at: new Date(), completed_by_id: userId },
      });
    } catch (_e) {}
  }

  return updated;
}

/**
 * Fail a channel action.
 */
export async function failChannelAction(
  id: number,
  error: {
    outcome_code?: string;
    notes?: string;
  },
  userId: number,
  ip?: string
) {
  const updated = await updateChannelAction(
    id,
    {
      status: 'FAILED',
      completed_at: new Date(),
      completed_by_id: userId,
      ...error,
    },
    userId,
    ip
  );

  try {
    await logChannelActionFailed(
      id,
      { error_code: error.outcome_code || 'FAILED', error_message: error.notes },
      userId,
      'USER'
    );
  } catch (_e) {
    console.warn('[failChannelAction] Failed to log failure event:', _e);
  }

  return updated;
}

/**
 * Skip a channel action (for optional actions).
 */
export async function skipChannelAction(
  id: number,
  reason: string,
  userId: number,
  ip?: string
) {
  return updateChannelAction(
    id,
    {
      status: 'SKIPPED',
      completed_at: new Date(),
      completed_by_id: userId,
      notes: reason,
    },
    userId,
    ip
  );
}

/**
 * Soft delete a channel action.
 */
export async function deleteChannelAction(
  id: number,
  userId: number,
  ip?: string
) {
  const old = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id },
  });

  const updated = await (prisma as any).renewalFollowUpChannelAction.update({
    where: { id },
    data: { is_deleted: true },
  });

  await logAudit({
    accountId: old?.renewal_account_id,
    entityType: 'CHANNEL_ACTION',
    entityId: id,
    action: 'DELETED',
    oldValue: JSON.stringify(old),
    newValue: JSON.stringify({ is_deleted: true }),
    performedById: userId,
    ip,
  });

  return updated;
}

/**
 * Get pending channel actions that need to be executed.
 */
export async function getPendingChannelActions(limit = 100) {
  return (prisma as any).renewalFollowUpChannelAction.findMany({
    where: {
      status: 'PENDING',
      is_deleted: false,
      scheduled_at: { lte: new Date() },
    },
    include: {
      follow_up_task: {
        include: {
          renewal_account: true,
          service_instance: true,
          cycle: true,
        },
      },
      reminder: true,
      recipient_contact: true,
      template: true,
    },
    orderBy: { scheduled_at: 'asc' },
    take: limit,
  });
}

/**
 * Get channel actions by reminder ID.
 */
export async function getChannelActionsByReminderId(reminderId: number) {
  return (prisma as any).renewalFollowUpChannelAction.findMany({
    where: {
      reminder_id: reminderId,
      is_deleted: false,
    },
    include: {
      follow_up_task: true,
      renewal_account: true,
      service_instance: true,
      cycle: true,
    },
    orderBy: { scheduled_at: 'asc' },
  });
}

/**
 * Link a channel action to a digest outbox message.
 */
export async function linkChannelActionToDigest(
  channelActionId: number,
  digestOutboxId: number,
  userId: number,
  ip?: string
) {
  return updateChannelAction(
    channelActionId,
    { digest_outbox_id: digestOutboxId },
    userId,
    ip
  );
}

/**
 * Get channel actions that are part of a digest.
 */
export async function getChannelActionsByDigestOutboxId(
  digestOutboxId: number
) {
  return (prisma as any).renewalFollowUpChannelAction.findMany({
    where: {
      digest_outbox_id: digestOutboxId,
      is_deleted: false,
    },
    include: {
      follow_up_task: true,
      reminder: true,
      recipient_contact: true,
    },
  });
}

/**
 * Preview email for a channel action (renders template with actual data).
 */
export async function previewEmailForChannelAction(channelActionId: number) {
  const action = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: {
      template: true,
      follow_up_task: {
        include: {
          renewal_account: {
            include: {
              client_company: true,
            },
          },
          service_instance: {
            include: {
              service_master: { include: { category: true } },
            },
          },
          cycle: true,
        },
      },
      recipient_contact: true,
    },
  });

  if (!action) {
    throw new Error('Channel action not found');
  }

  let template = action.template;
  if (!template) {
    const categoryCode = action.follow_up_task?.service_instance?.service_master?.category?.code || null;
    if (categoryCode) {
      template = await (prisma as any).renewalNotificationTemplate.findFirst({
        where: { channel: 'EMAIL', category_code: categoryCode, is_active: true },
        orderBy: { id: 'asc' },
      });
    }
  }
  if (!template) {
    template = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: { channel: 'EMAIL', category_code: null, is_active: true },
      orderBy: { id: 'asc' },
    });
  }

  const customerName = action.follow_up_task?.renewal_account?.client_company?.name || 'Valued Client';
  const serviceName = action.follow_up_task?.service_instance?.service_master?.name || 'Renewal Service';
  const identifier = action.follow_up_task?.service_instance?.identifier || 'domain.com';
  const amountDue = action.follow_up_task?.service_instance?.amount_due ? `₹${action.follow_up_task.service_instance.amount_due}` : '₹1,500';
  const expiryDate = action.follow_up_task?.service_instance?.expiry_date ? new Date(action.follow_up_task.service_instance.expiry_date).toLocaleDateString('en-GB') : '15 Days';
  const recipient = action.recipient_address || action.recipient_contact?.email || action.follow_up_task?.renewal_account?.client_company?.email || 'contact@client.com';
  const senderName = 'ANGLER Renewals Team';

  const replaceTokens = (str: string) => {
    return (str || '')
      .replace(/qadomain-test-\d+\.com/gi, identifier)
      .replace(/vps-seedhost-\d+-\d+\.in/gi, identifier)
      .replace(/{{customer_name}}/g, customerName)
      .replace(/{{service_name}}/g, serviceName)
      .replace(/{{domain_url}}/g, identifier)
      .replace(/{{identifier}}/g, identifier)
      .replace(/{{expiry_date}}/g, expiryDate)
      .replace(/{{amount_due}}/g, amountDue)
      .replace(/{{sender_name}}/g, senderName)
      .replace(/{{order_number}}/g, 'ORD-2026-892');
  };

  const rawSubject = template?.subject || `Upcoming Service Renewal Notice: {{service_name}}`;
  const rawBody = template?.compiled_html || template?.body_html || `<div style="font-family:sans-serif;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;"><h3 style="color:#0f172a;margin-top:0;">Renewal Reminder for {{service_name}}</h3><p style="color:#334155;">Dear <strong>{{customer_name}}</strong>,</p><p style="color:#334155;">This is a courteous reminder that your subscription for <strong>{{service_name}}</strong> ({{domain_url}}) is scheduled for upcoming renewal on {{expiry_date}}.</p><p style="color:#475569;font-size:12px;margin-top:16px;">Thank you for your business!</p></div>`;

  const subject = replaceTokens(rawSubject);
  const renderedBody = ensureResponsiveEmailHtml(replaceTokens(rawBody));

  return {
    channel_action_id: action.id,
    service_instance_id: action.follow_up_task?.service_instance_id,
    identifier: identifier,
    channel: action.channel,
    recipient: recipient,
    subject: subject,
    rendered_body: renderedBody,
    template_id: template?.id || null,
    template_version: template?.version || 1,
    template_name: template?.name || 'Default Renewal Template',
    customer_name: customerName,
    service_name: serviceName,
    cycle: action.follow_up_task?.cycle?.name || 'Annual Renewal',
    preview_available: true,
    source: action.template ? 'ASSOCIATED_TEMPLATE' : 'SYSTEM_DEFAULT_TEMPLATE',
  };
}

/**
 * Queue email for a channel action (manual send).
 * If the linked reminder step has attach_order_form = true, the Order Form PDF
 * is generated and attached automatically.
 */
export async function queueEmailForChannelAction(
  channelActionId: number,
  userId: number,
  ip?: string,
  recipientAddressInput?: string,
  approvalGranted = false
) {
  const action = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: {
      template: true,
      follow_up_task: {
        include: {
          renewal_account: {
            include: { client_company: true }
          }
        }
      },
      recipient_contact: true,
    },
  });

  if (!action) {
    throw new Error('Channel action not found');
  }

  if (action.channel !== 'EMAIL' && action.channel !== 'EMAIL_DIRECT' && action.channel !== 'EMAIL_DRAFT') {
    throw new Error('This action is not an Email channel action');
  }

  if (['APPROVAL', 'APPROVAL_REQUIRED'].includes(action.execution_mode) && !approvalGranted) {
    throw new Error('This email requires approval before it can be queued');
  }

  const recipient = recipientAddressInput || action.recipient_address || action.recipient_contact?.email || action.follow_up_task?.renewal_account?.client_company?.email;

  if (!recipient || recipient === 'contact@client.com') {
    throw new Error('RECIPIENT_MISSING: Customer recipient contact email is missing');
  }

  if (recipientAddressInput && recipientAddressInput !== action.recipient_address) {
    await (prisma as any).renewalFollowUpChannelAction.update({
      where: { id: channelActionId },
      data: { recipient_address: recipientAddressInput },
    });
  }

  const renderedPreview = await previewEmailForChannelAction(channelActionId);

  // Check if the linked reminder step requires Order Form attachment
  let orderFormAttachmentPath: string | undefined = undefined;
  if (action.reminder_id) {
    try {
      const reminder = await (prisma as any).renewalReminder.findUnique({
        where: { id: action.reminder_id },
        include: { cycle: { include: { service_instance: { include: { reminder_policy: true } } } } }
      });
      if (reminder?.cycle?.service_instance?.reminder_policy_id) {
        const step = await (prisma as any).renewalReminderStep.findFirst({
          where: {
            policy_id: reminder.cycle.service_instance.reminder_policy_id,
            step_number: reminder.step_number,
          },
          select: { attach_order_form: true }
        });
        if (step?.attach_order_form) {
          const { generateOrderFormPDF } = await import('../utils/orderFormPdfGenerator');
          const accountId = action.follow_up_task?.renewal_account_id || action.renewal_account_id;
          if (accountId) {
            const pdfRes = await generateOrderFormPDF(accountId);
            orderFormAttachmentPath = pdfRes.filePath;
          }
        }
      }
    } catch (pdfErr: any) {
      // Non-fatal — proceed without attachment if PDF generation fails
      console.error(`[queueEmailForChannelAction] Order form PDF attachment failed: ${pdfErr.message}`);
    }
  }

  // Mark action as started
  await startChannelAction(channelActionId, userId, ip);

  // Log the start event
  await logChannelActionStarted(channelActionId, userId, 'USER');

  // Queue the email in the outbox with channel action linkage
  const outboxId = await queueNotification({
    channel: 'EMAIL',
    recipient: recipient,
    subject: renderedPreview.subject || 'Renewal Notification',
    renderedBody: renderedPreview.rendered_body,
    templateId: renderedPreview.template_id,
    cycleId: action.cycle_id,
    reminderId: action.reminder_id,
    clientCompanyId: action.follow_up_task?.renewal_account?.client_company_id,
    channelActionId: channelActionId,
    attachmentPath: orderFormAttachmentPath,
    mappingContext: JSON.stringify({
      channel_action_id: channelActionId,
      user_id: userId,
    }),
  });

  // Link outbox to channel action if outbox was created
  if (outboxId) {
    await updateChannelAction(
      channelActionId,
      { status: 'QUEUED' },
      userId,
      ip
    );
  }

  return action;
}

export async function sendTestEmailForChannelAction(channelActionId: number, userId: number) {
  const testRecipient = (process.env.RENEWAL_DEV_TEST_EMAIL || '').trim();
  if (!testRecipient) {
    throw new Error('RENEWAL_DEV_TEST_EMAIL is not configured');
  }

  const preview = await previewEmailForChannelAction(channelActionId);
  const smtpCfg = await getActiveSmtpConfigDecrypted();
  if (!smtpCfg) {
    throw new Error('SMTP configuration not found');
  }

  const action = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: { reminder: true },
  });
  if (!action) throw new Error('Channel action not found');
  if (action.channel !== 'EMAIL' && action.channel !== 'EMAIL_DIRECT' && action.channel !== 'EMAIL_DRAFT') {
    throw new Error('This action is not an Email channel action');
  }

  let orderFormAttachmentPath: string | undefined;
  if (action.reminder_id) {
    const reminder = await (prisma as any).renewalReminder.findUnique({
      where: { id: action.reminder_id },
      include: { cycle: { include: { service_instance: true } } },
    });
    if (reminder?.cycle?.service_instance?.reminder_policy_id) {
      const step = await (prisma as any).renewalReminderStep.findFirst({
        where: {
          policy_id: reminder.cycle.service_instance.reminder_policy_id,
          step_number: reminder.step_number,
          attach_order_form: true,
        },
        select: { id: true },
      });
      if (step) {
        const { generateOrderFormPDF } = await import('../utils/orderFormPdfGenerator');
        const pdfRes = await generateOrderFormPDF(action.renewal_account_id);
        orderFormAttachmentPath = pdfRes.filePath;
      }
    }
  }

  const transporter = nodemailer.createTransport({
    host: smtpCfg.host,
    port: smtpCfg.port,
    secure: smtpCfg.secure,
    auth: { user: smtpCfg.username, pass: smtpCfg.password },
    tls: process.env.NODE_ENV !== 'production' ? { rejectUnauthorized: false } : undefined,
  });

  const info = await transporter.sendMail({
    from: smtpCfg.from_name ? `"${smtpCfg.from_name}" <${smtpCfg.from_email}>` : smtpCfg.from_email,
    to: testRecipient,
    subject: `[TEST] ${preview.subject || 'Renewal Notification'}`,
    html: preview.rendered_body,
    attachments: orderFormAttachmentPath ? [{
      filename: orderFormAttachmentPath.split(/[/\\]/).pop() || 'OrderForm.pdf',
      path: orderFormAttachmentPath,
    }] : undefined,
  });

  await (prisma as any).renewalCommunicationEvent.create({
    data: {
      renewal_account_id: action.renewal_account_id,
      service_instance_id: action.service_instance_id,
      cycle_id: action.cycle_id,
      follow_up_task_id: action.follow_up_task_id,
      channel_action_id: action.id,
      reminder_id: action.reminder_id || null,
      channel: 'EMAIL',
      event_type: 'TEST_EMAIL_SENT',
      execution_mode: 'MANUAL',
      communication_purpose: 'TEST',
      direction: 'OUTBOUND',
      status: 'SENT',
      actor_type: 'USER',
      actor_user_id: userId,
      recipient: testRecipient,
      subject_snapshot: `[TEST] ${preview.subject || 'Renewal Notification'}`,
      body_snapshot: preview.rendered_body,
      attachment_metadata: orderFormAttachmentPath ? JSON.stringify({ order_form: orderFormAttachmentPath }) : null,
      template_id: preview.template_id,
      template_version: preview.template_version,
      provider_message_id: info.messageId,
    },
  });

  return {
    success: true,
    channel_action_id: channelActionId,
    test_recipient: testRecipient,
    provider_message_id: info.messageId,
    attached_order_form: Boolean(orderFormAttachmentPath),
  };
}

/**
 * Approve email for a channel action (approval-required workflow).
 */
export async function approveEmailForChannelAction(
  channelActionId: number,
  userId: number,
  ip?: string
) {
  const action = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
  });

  if (!action) {
    throw new Error('Channel action not found');
  }

  if (action.channel !== 'EMAIL' && action.channel !== 'EMAIL_DIRECT' && action.channel !== 'EMAIL_DRAFT') {
    throw new Error('This action is not an Email channel action');
  }

  if (!['APPROVAL', 'APPROVAL_REQUIRED'].includes(action.execution_mode)) {
    throw new Error('This action does not require approval');
  }

  // Queue the email after approval
  return queueEmailForChannelAction(channelActionId, userId, ip, undefined, true);
}

/**
 * Preview WhatsApp message for a channel action.
 */
export async function previewWhatsAppForChannelAction(channelActionId: number) {
  const action = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: {
      template: true,
      follow_up_task: {
        include: {
          renewal_account: {
            include: {
              client_company: true,
            },
          },
          service_instance: {
            include: {
              service_master: { include: { category: true } },
            },
          },
          cycle: true,
        },
      },
      recipient_contact: true,
    },
  });

  if (!action) {
    throw new Error('Channel action not found');
  }

  let template = action.template;
  if (!template) {
    const categoryCode = action.follow_up_task?.service_instance?.service_master?.category?.code || null;
    if (categoryCode) {
      template = await (prisma as any).renewalNotificationTemplate.findFirst({
        where: { channel: 'WHATSAPP', category_code: categoryCode, is_active: true },
        orderBy: { id: 'asc' },
      });
    }
  }
  if (!template) {
    template = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: { channel: 'WHATSAPP', category_code: null, is_active: true },
      orderBy: { id: 'asc' },
    });
  }

  const customerName = action.follow_up_task?.renewal_account?.client_company?.name || 'Valued Client';
  const serviceName = action.follow_up_task?.service_instance?.service_master?.name || 'Renewal Service';
  const mobile = action.recipient_address || action.recipient_contact?.mobile || action.follow_up_task?.renewal_account?.client_company?.phone || '';

  const htmlBody = template?.compiled_html || template?.body_html || `*Renewal Notice for ${serviceName}*\nDear ${customerName},\nYour subscription for *${serviceName}* is due for renewal soon. Please let us know if you have any questions.`;
  const whatsappMessage = htmlBody
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<b>(.*?)<\/b>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<i>(.*?)<\/i>/gi, '_$1_')
    .replace(/<[^>]+>/g, '')
    .replace(/{{customer_name}}/g, customerName)
    .replace(/{{service_name}}/g, serviceName)
    .trim();

  return {
    channel_action_id: action.id,
    channel: action.channel,
    recipient: mobile,
    message_text: whatsappMessage,
    template_id: template?.id || null,
    template_version: template?.version || 1,
    template_name: template?.name || 'Default WhatsApp Template',
    customer_name: customerName,
    service_name: serviceName,
    cycle: action.follow_up_task?.cycle?.name || 'Annual Renewal',
    consent_status: action.recipient_contact?.whatsapp_consent || 'OPTED_IN',
    preview_available: true,
  };
}

/**
 * Queue WhatsApp message for a channel action (manual send).
 */
export async function queueWhatsAppForChannelAction(
  channelActionId: number,
  userId: number,
  ip?: string,
  approvalGranted = false
) {
  const action = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: {
      template: true,
      follow_up_task: true,
      recipient_contact: true,
    },
  });

  if (!action) {
    throw new Error('Channel action not found');
  }

  if (action.channel !== 'WHATSAPP') {
    throw new Error('This action is not a WhatsApp channel action');
  }

  if (['APPROVAL', 'APPROVAL_REQUIRED'].includes(action.execution_mode) && !approvalGranted) {
    throw new Error('This WhatsApp message requires approval before it can be queued');
  }

  // Check consent
  if (action.recipient_contact?.whatsapp_consent !== true) {
    throw new Error('WhatsApp consent not available for this contact');
  }

  const renderedPreview = await previewWhatsAppForChannelAction(channelActionId);
  if (!renderedPreview.recipient) {
    throw new Error('RECIPIENT_MISSING: Customer WhatsApp/mobile number is missing');
  }

  // Mark action as started
  await startChannelAction(channelActionId, userId, ip);

  // Log the start event
  await logChannelActionStarted(channelActionId, userId, 'USER');

  // Queue the WhatsApp message in the outbox with channel action linkage
  const outboxId = await queueNotification({
    channel: 'WHATSAPP',
    recipient: renderedPreview.recipient,
    renderedBody: renderedPreview.message_text,
    templateId: renderedPreview.template_id,
    cycleId: action.cycle_id,
    reminderId: action.reminder_id,
    clientCompanyId: action.follow_up_task?.renewal_account?.client_company_id,
    channelActionId: channelActionId,
    mappingContext: JSON.stringify({
      company_id: action.follow_up_task?.renewal_account?.client_company_id,
      channel_action_id: channelActionId,
      user_id: userId,
    }),
  });

  // Update status to QUEUED if outbox was created
  if (outboxId) {
    await updateChannelAction(
      channelActionId,
      { status: 'QUEUED' },
      userId,
      ip
    );
  }

  return action;
}

/**
 * Approve WhatsApp message for a channel action (approval-required workflow).
 */
export async function approveWhatsAppForChannelAction(
  channelActionId: number,
  userId: number,
  ip?: string
) {
  const action = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
  });

  if (!action) {
    throw new Error('Channel action not found');
  }

  if (action.channel !== 'WHATSAPP') {
    throw new Error('This action is not a WhatsApp channel action');
  }

  if (!['APPROVAL', 'APPROVAL_REQUIRED'].includes(action.execution_mode)) {
    throw new Error('This action does not require approval');
  }

  // Queue the WhatsApp message after approval
  return queueWhatsAppForChannelAction(channelActionId, userId, ip, true);
}

/**
 * Complete a channel action from outbox processing (transactional).
 * Updates channel action, logs communication event, and recomputes parent task status.
 */
export async function completeChannelActionFromOutbox(
  channelActionId: number,
  providerMessageId: string,
  userId?: number | null
) {
  return (prisma as any).$transaction(async (tx: any) => {
    // Update channel action status
    const action = await tx.renewalFollowUpChannelAction.update({
      where: { id: channelActionId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        completed_by_id: userId ?? null,
        provider_message_id: providerMessageId,
      },
      include: {
        follow_up_task: true,
      },
    });

    if (action.reminder_id) {
      await tx.renewalReminder.updateMany({
        where: { id: action.reminder_id, status: { not: 'COMPLETED' } },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          completed_by_id: userId ?? null,
        },
      });
    }

    // Log communication event
    await tx.renewalCommunicationEvent.create({
      data: {
        renewal_account_id: action.renewal_account_id,
        service_instance_id: action.service_instance_id,
        cycle_id: action.cycle_id,
        follow_up_task_id: action.follow_up_task_id,
        channel_action_id: action.id,
        channel_action_snapshot_id: action.id,
        channel: action.channel,
        event_type: 'ACTION_COMPLETED',
        execution_mode: action.execution_mode,
        communication_purpose: action.communication_purpose,
        status: 'COMPLETED',
        actor_type: 'SYSTEM',
        actor_user_id: userId ?? null,
        recipient: action.recipient_address,
        provider_message_id: providerMessageId,
        occurred_at: new Date(),
      },
    });

    // Reccompute parent follow-up task status
    const allActions = await tx.renewalFollowUpChannelAction.findMany({
      where: {
        follow_up_task_id: action.follow_up_task_id,
        is_deleted: false,
      },
    });

    const requiredActions = allActions.filter((a: any) => a.is_required);
    const completedRequired = requiredActions.filter((a: any) => a.status === 'COMPLETED').length;
    const failedRequired = requiredActions.filter((a: any) => a.status === 'FAILED').length;

    let newTaskStatus = 'PENDING';
    if (completedRequired === requiredActions.length && requiredActions.length > 0) {
      newTaskStatus = 'COMPLETED';
    } else if (failedRequired > 0) {
      newTaskStatus = 'FAILED';
    } else if (completedRequired > 0) {
      newTaskStatus = 'IN_PROGRESS';
    }

    await tx.renewalFollowUpTask.update({
      where: { id: action.follow_up_task_id },
      data: { overall_status: newTaskStatus },
    });

    return action;
  });
}

/**
 * Fail a channel action from outbox processing (transactional).
 * Updates channel action, logs communication event, and recomputes parent task status.
 */
export async function failChannelActionFromOutbox(
  channelActionId: number,
  errorMessage: string,
  userId?: number | null
) {
  return (prisma as any).$transaction(async (tx: any) => {
    // Update channel action status
    const action = await tx.renewalFollowUpChannelAction.update({
      where: { id: channelActionId },
      data: {
        status: 'FAILED',
        completed_at: new Date(),
        completed_by_id: userId ?? null,
        outcome_code: 'SEND_FAILED',
        notes: errorMessage,
      },
      include: {
        follow_up_task: true,
      },
    });

    // Log communication event
    await tx.renewalCommunicationEvent.create({
      data: {
        renewal_account_id: action.renewal_account_id,
        service_instance_id: action.service_instance_id,
        cycle_id: action.cycle_id,
        follow_up_task_id: action.follow_up_task_id,
        channel_action_id: action.id,
        channel_action_snapshot_id: action.id,
        channel: action.channel,
        event_type: 'ACTION_FAILED',
        execution_mode: action.execution_mode,
        communication_purpose: action.communication_purpose,
        status: 'FAILED',
        actor_type: 'SYSTEM',
        actor_user_id: userId ?? null,
        recipient: action.recipient_address,
        error_code: 'SEND_FAILED',
        error_message: errorMessage,
        occurred_at: new Date(),
      },
    });

    // Recompute parent follow-up task status
    const allActions = await tx.renewalFollowUpChannelAction.findMany({
      where: {
        follow_up_task_id: action.follow_up_task_id,
        is_deleted: false,
      },
    });

    const requiredActions = allActions.filter((a: any) => a.is_required);
    const completedRequired = requiredActions.filter((a: any) => a.status === 'COMPLETED').length;
    const failedRequired = requiredActions.filter((a: any) => a.status === 'FAILED').length;

    let newTaskStatus = 'PENDING';
    if (completedRequired === requiredActions.length && requiredActions.length > 0) {
      newTaskStatus = 'COMPLETED';
    } else if (failedRequired > 0) {
      newTaskStatus = 'FAILED';
    } else if (completedRequired > 0) {
      newTaskStatus = 'IN_PROGRESS';
    }

    await tx.renewalFollowUpTask.update({
      where: { id: action.follow_up_task_id },
      data: { overall_status: newTaskStatus },
    });

    return action;
  });
}

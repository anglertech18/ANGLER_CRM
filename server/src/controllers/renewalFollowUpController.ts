import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../utils/renewalAudit';
import dayjs from 'dayjs';

const ip = (req: Request) => req.ip ?? '';

export function buildFollowUpQueueWhere({
  tab = 'today', assignedUser, assignedOnly, category, search, action, channel,
  reminderId, user, now = new Date(),
}: any) {
  const assignedToCurrentUser = assignedOnly === 'true' || assignedOnly === '1' || user.role === 'SalesPerson';
  const directReminderId = Number.parseInt(String(reminderId || ''), 10);

  if (Number.isInteger(directReminderId) && directReminderId > 0) {
    return {
      id: directReminderId,
      ...(assignedToCurrentUser ? { assigned_user_id: user.id } : {}),
    };
  }

  const current = dayjs(now);
  const todayStart = current.startOf('day').toDate();
  const todayEnd = current.endOf('day').toDate();
  let status: any = {};
  let dueDate: any = {};

  if (tab === 'today') {
    status = { in: ['DUE', 'PENDING'] };
    dueDate = { gte: todayStart, lte: todayEnd };
  } else if (tab === 'upcoming') {
    status = { in: ['DUE', 'PENDING'] };
    dueDate = { gt: todayEnd };
  } else if (tab === 'overdue') {
    status = { in: ['DUE', 'PENDING'] };
    dueDate = { lt: todayStart };
  } else if (tab === 'completed') status = 'COMPLETED';
  else if (tab === 'skipped') status = 'SKIPPED';

  const where: any = {
    status,
    ...(Object.keys(dueDate).length ? { due_date: dueDate } : {}),
  };

  if (assignedToCurrentUser) {
    where.OR = [
      { assigned_user_id: user.id },
      { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { assigned_user_id: user.id } } }] },
      { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { renewal_account: { renewal_executive_id: user.id } } } }] },
    ];
  } else if (assignedUser === 'UNASSIGNED') {
    where.assigned_user_id = null;
    where.AND = [
      ...(where.AND || []),
      { cycle: { service_instance: { assigned_user_id: null } } },
      { cycle: { service_instance: { renewal_account: { renewal_executive_id: null } } } },
    ];
  } else if (assignedUser) {
    const targetUserId = Number.parseInt(String(assignedUser), 10);
    where.OR = [
      { assigned_user_id: targetUserId },
      { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { assigned_user_id: targetUserId } } }] },
      { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { renewal_account: { renewal_executive_id: targetUserId } } } }] },
    ];
  }

  if (category) {
    where.cycle = {
      service_instance: {
        service_master: { category_id: Number.parseInt(String(category), 10) },
      },
    };
  }

  const requestedChannel = action || channel;
  if (requestedChannel) where.channel = String(requestedChannel);

  const term = String(search || '').trim();
  if (term) {
    where.OR = [
      { cycle: { service_instance: { renewal_account: { client_company: { name: { contains: term } } } } } },
      { cycle: { service_instance: { service_master: { name: { contains: term } } } } },
      { cycle: { service_instance: { identifier: { contains: term } } } },
    ];
  }

  return where;
}

// GET /api/renewal-followups  — Follow-up queue
export const getFollowUpQueue = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { page = 1, limit = 50 } = req.query;
    const where = buildFollowUpQueueWhere({ ...req.query, user });

    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));

    const includeChannelActions = req.query.includeChannelActions === 'true';

    const [total, reminders] = await Promise.all([
      (prisma as any).renewalReminder.count({ where }),
      (prisma as any).renewalReminder.findMany({
        where,
        skip,
        take: parseInt(String(limit)),
        orderBy: { due_date: 'asc' },
        include: {
          assigned_user: { select: { id: true, first_name: true, last_name: true } },
          follow_up_logs: {
            orderBy: { logged_at: 'desc' },
            take: 1,
            select: { id: true, outcome_code: true, notes: true, customer_response: true, logged_at: true, contacted: true },
          },
          cycle: {
            include: {
              service_instance: {
                include: {
                  assigned_user: { select: { id: true, first_name: true, last_name: true } },
                  service_master: { include: { category: true } },
                  renewal_account: {
                    include: {
                      client_company: { select: { id: true, name: true } },
                      renewal_executive: { select: { id: true, first_name: true, last_name: true } },
                    },
                  },
                  customer_contact: { select: { id: true, name: true, mobile: true, whatsapp: true } },
                },
              },
            },
          },
          ...(includeChannelActions ? { channel_actions: {
            select: {
              id: true,
              follow_up_task_id: true,
              reminder_id: true,
              service_instance_id: true,
              cycle_id: true,
              channel: true,
              action_type: true,
              execution_mode: true,
              communication_purpose: true,
              status: true,
              scheduled_at: true,
              completed_at: true,
              recipient_address: true,
              template_id: true,
              outbox_messages: {
                select: { id: true, status: true, sent_at: true, updated_at: true },
                take: 1,
              },
              communication_events: {
                select: { id: true, event_type: true, occurred_at: true },
                take: 1,
              },
            },
          } } : {}),
        },
      }),
    ]);

    const formattedReminders = reminders.map((r: any) => {
      const effectiveAssignedUser = r.assigned_user ||
        r.cycle?.service_instance?.assigned_user ||
        r.cycle?.service_instance?.renewal_account?.renewal_executive ||
        null;
      const actions = r.channel_actions || [];
      const primaryAction = actions.find((a: any) => a.status === 'PENDING' || a.status === 'DUE') || actions[0];
      const hasV2Action = !!(primaryAction && primaryAction.follow_up_task_id && primaryAction.id);

      // Delivery Evidence Check
      const outboxSent = primaryAction?.outbox_messages?.[0];
      const commEvent = primaryAction?.communication_events?.[0];

      let deliveryVerified = false;
      let deliverySource: string | null = null;
      let outboxId: number | null = null;
      let actualSentAt: string | null = null;

      if (outboxSent && (outboxSent.status === 'SENT' || outboxSent.status === 'DELIVERED')) {
        deliveryVerified = true;
        deliverySource = 'NOTIFICATION_OUTBOX';
        outboxId = outboxSent.id;
        actualSentAt = outboxSent.sent_at || outboxSent.updated_at || null;
      } else if (commEvent && (commEvent.event_type === 'SENT' || commEvent.event_type === 'DELIVERED')) {
        deliveryVerified = true;
        deliverySource = 'COMMUNICATION_EVENT';
        actualSentAt = commEvent.occurred_at || null;
      }

      // 1. DATA_INCOMPLETE Check
      const rawCh = (primaryAction?.channel || r.channel || '').toUpperCase();
      const rawActionType = (primaryAction?.action_type || r.action_type || '').toUpperCase();

      if (!rawCh && !rawActionType) {
        return {
          ...r,
          task_id: null,
          source_reminder_id: r.id,
          channel_action_id: null,
          workflow_state: 'DATA_INCOMPLETE',
          canonical_next_action: null,
          next_action: null,
          available_actions: [],
          issues: ['CHANNEL_UNMAPPED', 'TASK_LINK_MISSING'],
        };
      }

      // Canonical Channel Resolution
      let channel = 'UNKNOWN';
      let channelLabel = 'Unknown Channel';
      if (rawCh === 'PHONE' || rawCh === 'CALL' || rawCh === 'CALL_TASK' || rawActionType === 'CALL_REMINDER' || rawActionType === 'LOG_CALL') {
        channel = 'CALL';
        channelLabel = 'Phone Call';
      } else if (rawCh === 'WHATSAPP' || rawCh === 'WA' || rawActionType === 'SEND_WHATSAPP' || rawActionType === 'WHATSAPP_REMINDER') {
        channel = 'WHATSAPP';
        channelLabel = 'WhatsApp';
      } else if (rawCh === 'EMAIL' || rawCh === 'EMAIL_DIRECT' || rawCh === 'EMAIL_DRAFT' || rawActionType === 'FOLLOW_UP_EMAIL' || rawActionType === 'EXPIRY_ALERT' || rawActionType === 'SEND_EMAIL') {
        channel = 'EMAIL';
        channelLabel = 'Email';
      }

      if (channel === 'UNKNOWN') {
        return {
          ...r,
          task_id: null,
          source_reminder_id: r.id,
          channel_action_id: null,
          workflow_state: 'DATA_INCOMPLETE',
          canonical_next_action: null,
          next_action: null,
          available_actions: [],
          issues: ['CHANNEL_UNMAPPED'],
        };
      }

      // 2. LEGACY_COMPATIBILITY Mode (If no linked V2 task/action)
      if (!hasV2Action) {
        let legacyButton = 'View Details';
        let legacyActionEnum = 'VIEW_LEGACY_HISTORY';

        if (channel === 'CALL') {
          legacyButton = 'Log Call';
          legacyActionEnum = 'LEGACY_LOG_OUTCOME';
        } else if (channel === 'EMAIL') {
          legacyButton = 'View History';
          legacyActionEnum = 'VIEW_LEGACY_HISTORY';
        } else if (channel === 'WHATSAPP') {
          legacyButton = 'View History';
          legacyActionEnum = 'VIEW_LEGACY_HISTORY';
        }

        return {
          ...r,
          task_id: null,
          source_reminder_id: r.id,
          channel_action_id: null,
          legacy_channel: rawCh,
          legacy_action_type: rawActionType,
          workflow_state: 'LEGACY_COMPATIBILITY',
          issues: ['V2_TASK_UNLINKED', 'CHANNEL_ACTION_MISSING'],
          canonical_next_action: {
            channel,
            channel_label: channelLabel,
            button_label: legacyButton,
            action_type: rawActionType,
            execution_mode: null,
            communication_purpose: null,
            is_digest: null,
            delivery_verified: false,
            delivery_source: null,
            outbox_id: null,
            sent_at: null,
          },
          next_action: {
            channel_action_id: null,
            type: legacyActionEnum,
            label: legacyButton,
          },
          available_actions: [legacyActionEnum, 'VIEW_LEGACY_HISTORY'],
        };
      }

      // 3. V2_COMPLETE Mode (Selected action MUST have all required V2 fields)
      const execMode = primaryAction.execution_mode || null;
      const purpose = primaryAction.communication_purpose || null;
      const actionStatus = primaryAction.status || null;
      const issues: string[] = [];

      if (r.status === 'COMPLETED' && actionStatus !== 'COMPLETED') {
        issues.push('PARENT_CHILD_STATUS_MISMATCH');
      }

      if (!purpose) issues.push('COMMUNICATION_PURPOSE_MISSING');
      if (!execMode) issues.push('EXECUTION_MODE_MISSING');
      if (!actionStatus) issues.push('ACTION_STATUS_MISSING');

      // If key fields are missing, return DATA_INCOMPLETE
      if (issues.length > 0) {
        return {
          ...r,
          task_id: primaryAction.follow_up_task_id || null,
          source_reminder_id: r.id,
          channel_action_id: primaryAction.id || null,
          workflow_state: 'DATA_INCOMPLETE',
          canonical_next_action: null,
          next_action: null,
          available_actions: [],
          issues,
        };
      }

      let nextActionType = 'VIEW_AUDIT';
      let buttonLabel = 'View Details';
      const availableActions: string[] = ['VIEW_AUDIT'];

      if (channel === 'CALL') {
        if (actionStatus === 'COMPLETED') {
          nextActionType = 'VIEW_CALL_OUTCOME';
          buttonLabel = 'View Call Outcome';
          availableActions.unshift('VIEW_CALL_OUTCOME');
        } else if (actionStatus === 'PENDING' || actionStatus === 'DUE') {
          nextActionType = 'LOG_CALL';
          buttonLabel = 'Log Call';
          availableActions.unshift('LOG_CALL');
        } else if (actionStatus === 'SKIPPED') {
          nextActionType = 'VIEW_SKIP_REASON';
          buttonLabel = 'View Skip Reason';
          availableActions.unshift('VIEW_SKIP_REASON');
        }
      } else if (channel === 'EMAIL') {
        if (actionStatus === 'PENDING' || actionStatus === 'DUE' || actionStatus === 'SCHEDULED') {
          if (execMode === 'APPROVAL' || execMode === 'APPROVAL_REQUIRED') {
            nextActionType = 'APPROVE_EMAIL';
            buttonLabel = 'Approve Email';
            availableActions.unshift('APPROVE_EMAIL', 'PREVIEW_EMAIL', 'SKIP_EMAIL');
          } else if (execMode === 'AUTOMATIC') {
            nextActionType = 'PREVIEW_EMAIL';
            buttonLabel = 'Review Email';
            availableActions.unshift('PREVIEW_EMAIL', 'VIEW_SCHEDULE');
          } else { // MANUAL
            nextActionType = 'PREVIEW_EMAIL';
            buttonLabel = 'Review Email';
            availableActions.unshift('PREVIEW_EMAIL', 'QUEUE_EMAIL');
          }
        } else if (actionStatus === 'SENT' || actionStatus === 'COMPLETED') {
          if (deliveryVerified) {
            nextActionType = 'VIEW_SENT_EMAIL';
            buttonLabel = 'View Sent Email';
            availableActions.unshift('VIEW_SENT_EMAIL', 'RECORD_CUSTOMER_RESPONSE');
          } else {
            nextActionType = 'VIEW_AUDIT';
            buttonLabel = 'View Audit';
            issues.push('DELIVERY_EVIDENCE_MISSING');
          }
        } else if (actionStatus === 'FAILED') {
          nextActionType = 'RETRY_EMAIL';
          buttonLabel = 'Retry Email';
          availableActions.unshift('RETRY_EMAIL', 'VIEW_FAILURE');
        }
      } else if (channel === 'WHATSAPP') {
        if (actionStatus === 'PENDING' || actionStatus === 'DUE' || actionStatus === 'SCHEDULED') {
          if (execMode === 'APPROVAL' || execMode === 'APPROVAL_REQUIRED') {
            nextActionType = 'APPROVE_WHATSAPP';
            buttonLabel = 'Approve WhatsApp';
            availableActions.unshift('APPROVE_WHATSAPP', 'PREVIEW_WHATSAPP');
          } else {
            nextActionType = 'PREVIEW_WHATSAPP';
            buttonLabel = 'Review WhatsApp';
            availableActions.unshift('PREVIEW_WHATSAPP');
          }
        } else if (actionStatus === 'SENT' || actionStatus === 'COMPLETED') {
          if (deliveryVerified) {
            nextActionType = 'VIEW_SENT_WHATSAPP';
            buttonLabel = 'View Message';
            availableActions.unshift('VIEW_SENT_WHATSAPP', 'RECORD_CUSTOMER_RESPONSE');
          } else {
            nextActionType = 'VIEW_AUDIT';
            buttonLabel = 'View Audit';
            issues.push('DELIVERY_EVIDENCE_MISSING');
          }
        }
      }

      return {
        ...r,
        assigned_user: effectiveAssignedUser,
        task_id: primaryAction.follow_up_task_id,
        source_reminder_id: r.id,
        channel_action_id: primaryAction.id,
        workflow_state: 'V2_COMPLETE',
        issues,
        canonical_next_action: {
          channel,
          channel_label: purpose === 'DIGEST' ? 'Email Digest' : channelLabel,
          button_label: buttonLabel,
          action_type: primaryAction.action_type,
          execution_mode: execMode,
          communication_purpose: purpose,
          is_digest: purpose === 'DIGEST' ? true : (purpose === 'REMINDER' ? false : null),
          delivery_verified: deliveryVerified,
          delivery_source: deliverySource,
          outbox_id: outboxId,
          sent_at: actualSentAt,
        },
        next_action: {
          channel_action_id: primaryAction.id,
          type: nextActionType,
          label: buttonLabel,
        },
        available_actions: availableActions,
      };
    });

    res.json({ data: formattedReminders, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching follow-up queue', detail: err.message });
  }
};

// POST /api/renewal-followups/:reminderId/complete
export const completeFollowUp = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const reminderId = parseInt(req.params.reminderId);
    const { outcome_code, contacted, notes, customer_response, next_follow_up_date } = req.body;
    const finalNotes = notes || customer_response || null;

    const { reminder, log } = await (prisma as any).$transaction(async (tx: any) => {
      const currentReminder = await tx.renewalReminder.findUnique({
        where: { id: reminderId },
        include: { cycle: { include: { service_instance: true } } },
      });
      if (!currentReminder) {
        const error: any = new Error('Reminder not found');
        error.statusCode = 404;
        throw error;
      }

      const claim = await tx.renewalReminder.updateMany({
        where: { id: reminderId, status: { not: 'COMPLETED' } },
        data: { status: 'COMPLETED', completed_at: new Date(), completed_by_id: user.id },
      });
      if (claim.count !== 1) {
        const error: any = new Error('Follow-up has already been completed');
        error.statusCode = 409;
        throw error;
      }

      const createdLog = await tx.renewalFollowUpLog.create({
        data: {
          service_instance_id: currentReminder.cycle.service_instance_id,
          reminder_id: reminderId,
          outcome_code: outcome_code ?? null,
          contacted: contacted ?? false,
          notes: finalNotes,
          customer_response: customer_response ?? null,
          next_follow_up_date: next_follow_up_date ? new Date(next_follow_up_date) : null,
          logged_by_id: user.id,
        },
      });

      const linkedActions = await tx.renewalFollowUpChannelAction.findMany({
        where: { reminder_id: reminderId, is_deleted: false },
      });
      await tx.renewalFollowUpChannelAction.updateMany({
        where: { reminder_id: reminderId, is_deleted: false, status: { not: 'COMPLETED' } },
        data: {
          status: 'COMPLETED', completed_at: new Date(), completed_by_id: user.id,
          outcome_code: outcome_code ?? null, customer_response: customer_response ?? null, notes: finalNotes,
        },
      });

      for (const action of linkedActions) {
        await tx.renewalCommunicationEvent.create({
          data: {
            renewal_account_id: action.renewal_account_id,
            service_instance_id: action.service_instance_id,
            cycle_id: action.cycle_id,
            follow_up_task_id: action.follow_up_task_id,
            channel_action_id: action.id,
            reminder_id: reminderId,
            channel: action.channel,
            event_type: 'ACTION_COMPLETED',
            execution_mode: action.execution_mode,
            communication_purpose: action.communication_purpose,
            direction: 'OUTBOUND', status: 'COMPLETED', actor_type: 'USER', actor_user_id: user.id,
            occurred_at: new Date(),
            metadata: JSON.stringify({ outcome_code, contacted, customer_response, notes: finalNotes, next_follow_up_date }),
          },
        });
      }

      const taskIds = [...new Set(linkedActions.map((action: any) => action.follow_up_task_id).filter(Boolean))];
      for (const taskId of taskIds) {
        const actions = await tx.renewalFollowUpChannelAction.findMany({
          where: { follow_up_task_id: taskId, is_deleted: false },
          select: { status: true, is_required: true, reminder_id: true },
        });
        const statuses = actions.map((action: any) => action.reminder_id === reminderId ? { ...action, status: 'COMPLETED' } : action);
        const required = statuses.filter((action: any) => action.is_required);
        const overallStatus = required.length > 0 && required.every((action: any) => action.status === 'COMPLETED')
          ? 'COMPLETED'
          : statuses.some((action: any) => action.status === 'COMPLETED') ? 'IN_PROGRESS' : 'PENDING';
        await tx.renewalFollowUpTask.update({
          where: { id: taskId },
          data: { overall_status: overallStatus, completed_at: overallStatus === 'COMPLETED' ? new Date() : null },
        });
      }

      if (linkedActions.length === 0) {
        await tx.renewalCommunicationEvent.create({
          data: {
            renewal_account_id: currentReminder.cycle.service_instance.renewal_account_id,
            service_instance_id: currentReminder.cycle.service_instance_id,
            cycle_id: currentReminder.cycle_id,
            reminder_id: reminderId,
            channel: currentReminder.channel || 'CALL', event_type: 'ACTION_COMPLETED',
            execution_mode: 'MANUAL', communication_purpose: 'REMINDER', direction: 'OUTBOUND',
            status: 'COMPLETED', actor_type: 'USER', actor_user_id: user.id, occurred_at: new Date(),
            metadata: JSON.stringify({ outcome_code, contacted, customer_response, notes: finalNotes, next_follow_up_date }),
          },
        });
      }

      if (outcome_code === 'RENEWED' || outcome_code === 'RENEWED_PAID') {
        await tx.renewalServiceInstance.update({
          where: { id: currentReminder.cycle.service_instance_id },
          data: { status: 'RENEWED' },
        });
      }

      // If next_follow_up_date was specified, schedule a callback reminder
      if (next_follow_up_date) {
        try {
          const callbackDate = dayjs(next_follow_up_date);
          const expiry = dayjs(currentReminder.cycle?.service_instance?.expiry_date || callbackDate);
          const offsetDays = callbackDate.diff(expiry, 'day');

          const nextStepNum = (currentReminder.step_number || 0) + 1;

          const assignedId = currentReminder.assigned_user_id ||
            currentReminder.cycle?.service_instance?.assigned_user_id ||
            currentReminder.cycle?.service_instance?.renewal_account?.renewal_executive_id ||
            user.id;

          const callbackReminder = await tx.renewalReminder.create({
            data: {
              cycle_id: currentReminder.cycle_id,
              step_number: nextStepNum,
              offset_days: offsetDays,
              due_date: callbackDate.toDate(),
              action_type: 'CALL',
              channel: 'PHONE',
              recipient_type: currentReminder.recipient_type || 'CLIENT',
              assigned_user_id: assignedId,
              status: 'PENDING',
            },
          });

          await tx.renewalCommunicationEvent.create({
            data: {
              renewal_account_id: currentReminder.cycle.service_instance.renewal_account_id,
              service_instance_id: currentReminder.cycle.service_instance_id,
              cycle_id: currentReminder.cycle_id,
              reminder_id: callbackReminder.id,
              channel: 'PHONE',
              event_type: 'CALLBACK_SCHEDULED',
              execution_mode: 'MANUAL',
              communication_purpose: 'REMINDER',
              direction: 'OUTBOUND',
              status: 'PENDING',
              actor_type: 'USER',
              actor_user_id: user.id,
              occurred_at: new Date(),
              metadata: JSON.stringify({
                scheduled_date: next_follow_up_date,
                previous_outcome: outcome_code,
                notes: finalNotes,
              }),
            },
          });
        } catch (cbErr) {
          console.warn('[completeFollowUp] Failed to create callback reminder:', cbErr);
        }
      }

      return { reminder: currentReminder, log: createdLog };
    });

    const accountId = reminder.cycle?.service_instance?.renewal_account_id;
    if (accountId) {
      try {
        await logAudit({ accountId, entityType: 'REMINDER', entityId: reminderId, action: 'REMINDER_COMPLETED', newValue: JSON.stringify({ outcome_code }), performedById: user.id, ip: ip(req) });
      } catch (auditError) {
        console.warn(`[RenewalFollowUp] Follow-up ${reminderId} completed, but audit logging failed:`, auditError);
      }
    }

    res.json({ message: 'Follow-up completed', log });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ message: 'Error completing follow-up', detail: err.message });
  }
};

// POST /api/renewal-followups/:reminderId/skip
export const skipFollowUp = async (req: Request, res: Response) => {
  try {
    const reminderId = parseInt(req.params.reminderId);
    const { reason } = req.body;

    const reminder = await (prisma as any).renewalReminder.findUnique({ where: { id: reminderId } });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    if (reminder.is_mandatory) return res.status(400).json({ message: 'This reminder is mandatory and cannot be skipped' });

    await (prisma as any).renewalReminder.update({
      where: { id: reminderId },
      data: { status: 'SKIPPED', skipped_at: new Date(), skip_reason: reason ?? null },
    });

    res.json({ message: 'Reminder skipped' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error skipping reminder', detail: err.message });
  }
};

// POST /api/renewal-followups/:reminderId/reschedule
export const rescheduleFollowUp = async (req: Request, res: Response) => {
  try {
    const reminderId = parseInt(req.params.reminderId);
    const { new_due_date } = req.body;
    if (!new_due_date) return res.status(400).json({ message: 'new_due_date is required' });

    await (prisma as any).renewalReminder.update({
      where: { id: reminderId },
      data: { due_date: new Date(new_due_date), status: 'PENDING' },
    });

    res.json({ message: 'Reminder rescheduled' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error rescheduling', detail: err.message });
  }
};

// GET /api/renewal-followups/:reminderId/audit
export const getFollowUpTaskAudit = async (req: Request, res: Response) => {
  try {
    const reminderId = parseInt(req.params.reminderId);
    if (isNaN(reminderId)) {
      return res.status(400).json({ message: 'Invalid reminder ID' });
    }

    const reminder = await (prisma as any).renewalReminder.findUnique({
      where: { id: reminderId },
      include: {
        assigned_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        completed_by: { select: { id: true, first_name: true, last_name: true } },
        channel_actions: {
          orderBy: { scheduled_at: 'asc' },
        },
        cycle: {
          include: {
            service_instance: {
              include: {
                service_master: { include: { category: true } },
                renewal_account: { include: { client_company: { select: { id: true, name: true } } } },
                customer_contact: { select: { id: true, name: true, email: true, mobile: true } },
                follow_up_logs: {
                  orderBy: { logged_at: 'desc' },
                  take: 15,
                  include: { logged_by: { select: { id: true, first_name: true, last_name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!reminder) return res.status(404).json({ message: 'Follow-up task not found' });

    const serviceInstanceId = reminder.cycle?.service_instance_id;
    let outboxMessages: any[] = [];
    if (serviceInstanceId) {
      try {
        // Collect channel action IDs linked to this reminder
        const actionIds: number[] = (reminder.channel_actions || []).map((ca: any) => ca.id);
        if (actionIds.length > 0) {
          outboxMessages = await (prisma as any).notificationOutbox.findMany({
            where: { channel_action_id: { in: actionIds } },
            orderBy: { created_at: 'desc' },
            take: 10,
          });
        }
      } catch (_e) {
        outboxMessages = [];
      }
    }

    res.json({
      task: {
        id: reminder.id,
        status: reminder.status,
        due_date: reminder.due_date,
        completed_at: reminder.completed_at,
        skip_reason: reminder.skip_reason,
        assigned_user: reminder.assigned_user,
        completed_by: reminder.completed_by,
      },
      channel_actions: reminder.channel_actions || [],
      follow_up_logs: reminder.cycle?.service_instance?.follow_up_logs || [],
      notification_logs: outboxMessages,
      outbox_messages: outboxMessages,
      service_instance: reminder.cycle?.service_instance,
    });
  } catch (err: any) {
    console.error('[getFollowUpTaskAudit error]', err);
    res.status(500).json({ message: 'Error fetching follow-up task audit', detail: err.message });
  }
};

// GET /api/renewal-followups/counts  — tab badge counts
export const getQueueCounts = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { assignedOnly, assignedUser } = req.query;
    const now = dayjs();

    const isAssignedOnly = assignedOnly === 'true' || assignedOnly === '1' || user.role === 'SalesPerson';
    const base: any = {};
    if (isAssignedOnly) {
      base.OR = [
        { assigned_user_id: user.id },
        { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { assigned_user_id: user.id } } }] },
        { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { renewal_account: { renewal_executive_id: user.id } } } }] },
      ];
    } else if (assignedUser === 'UNASSIGNED') {
      base.AND = [
        { assigned_user_id: null },
        { cycle: { service_instance: { assigned_user_id: null } } },
        { cycle: { service_instance: { renewal_account: { renewal_executive_id: null } } } },
      ];
    } else if (assignedUser) {
      const targetUserId = parseInt(String(assignedUser));
      base.OR = [
        { assigned_user_id: targetUserId },
        { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { assigned_user_id: targetUserId } } }] },
        { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { renewal_account: { renewal_executive_id: targetUserId } } } }] },
      ];
    }

    const [today, upcoming, overdue, completed, skipped] = await Promise.all([
      (prisma as any).renewalReminder.count({ where: { ...base, status: { in: ['DUE', 'PENDING'] }, due_date: { gte: now.startOf('day').toDate(), lte: now.endOf('day').toDate() } } }),
      (prisma as any).renewalReminder.count({ where: { ...base, status: { in: ['DUE', 'PENDING'] }, due_date: { gt: now.endOf('day').toDate() } } }),
      (prisma as any).renewalReminder.count({ where: { ...base, status: { in: ['DUE', 'PENDING'] }, due_date: { lt: now.startOf('day').toDate() } } }),
      (prisma as any).renewalReminder.count({ where: { ...base, status: 'COMPLETED' } }),
      (prisma as any).renewalReminder.count({ where: { ...base, status: 'SKIPPED' } }),
    ]);

    res.json({ today, upcoming, overdue, completed, skipped });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching counts', detail: err.message });
  }
};


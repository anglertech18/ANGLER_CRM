import { prisma } from '../lib/prisma';
import {
  createFollowUpTask,
  getFollowUpTasksByServiceInstance,
} from './renewalFollowUpTaskService';
import {
  createChannelAction,
  getChannelActionByIdempotencyKey,
} from './renewalFollowUpChannelActionService';
import {
  createCommunicationEvent,
  logChannelActionStarted,
  logChannelActionCompleted,
  logChannelActionFailed,
} from './renewalCommunicationEventService';
import dayjs from 'dayjs';

/**
 * Dual-write service to bridge legacy and new multi-channel follow-up architectures.
 * This service ensures that writes to legacy tables also write to new architecture tables.
 */

/**
 * Generate a follow-up group key for a policy step.
 * Format: POLICY_STEP:{policyId}:{stepNumber}:{offsetDays}
 */
export function generateFollowUpGroupKey(
  policyId: number,
  stepNumber: number,
  offsetDays: number
): string {
  return `POLICY_STEP:${policyId}:${stepNumber}:${offsetDays}`;
}

/**
 * Generate an idempotency key for a channel action.
 * Format: {serviceInstanceId}:{cycleId}:{reminderId}:{channel}:{actionType}:{executionMode}
 */
export function generateIdempotencyKey(
  serviceInstanceId: number,
  cycleId: number,
  reminderId: number,
  channel: string,
  actionType: string,
  executionMode: string
): string {
  return `${serviceInstanceId}:${cycleId}:${reminderId}:${channel}:${actionType}:${executionMode}`;
}

/**
 * Dual-write: When a reminder is created, create corresponding follow-up task and channel action.
 */
export async function dualWriteReminderCreated(
  reminderId: number,
  userId: number,
  ip?: string,
  externalDb?: any
) {
  const db = externalDb || prisma;
  try {
    const reminder = await db.renewalReminder.findUnique({
      where: { id: reminderId },
      include: {
        cycle: {
          include: {
            service_instance: {
              include: {
                renewal_account: true,
                reminder_policy: true,
              },
            },
          },
        },
      },
    });

    if (!reminder) return;

    // Group reminders in the same cycle and scheduled window under ONE parent task
    const followUpGroupKey = `CYCLE-${reminder.cycle_id}-WINDOW-${Math.abs(reminder.offset_days)}D`;

    const existingTasks = await getFollowUpTasksByServiceInstance(
      reminder.cycle.service_instance_id,
      reminder.cycle_id,
      { policy_version: reminder.policy_version }
    );

    const existingTask = existingTasks.find(
      (t: any) => t.followUpGroupKey === followUpGroupKey || t.follow_up_group_key === followUpGroupKey
    );

    let taskId: number;

    if (existingTask) {
      taskId = existingTask.id;
    } else {
      // Create parent follow-up task
      const task = await createFollowUpTask(
        {
          renewal_account_id: reminder.cycle.service_instance.renewal_account_id,
          service_instance_id: reminder.cycle.service_instance_id,
          cycle_id: reminder.cycle_id,
          policy_version: reminder.policy_version,
          follow_up_group_key: followUpGroupKey,
          scheduled_for: reminder.due_date,
          overall_status: 'PENDING',
          assigned_user_id: reminder.assigned_user_id,
          source_type: 'POLICY_STEP',
          source_reference_id: reminder.id,
          migration_confidence: 'LEGACY_SYNC',
        },
        userId,
        ip
      );
      taskId = task.id;
    }

    // Resolve execution mode dynamically from channel
    let executionMode = 'AUTOMATIC';
    if (reminder.channel === 'PHONE' || reminder.channel === 'CALL' || reminder.action_type === 'CALL') {
      executionMode = 'MANUAL';
    } else if (reminder.channel === 'EMAIL_DRAFT' || reminder.action_type === 'EMAIL_DRAFT' || reminder.channel === 'WHATSAPP' || reminder.action_type === 'WHATSAPP') {
      executionMode = 'APPROVAL_REQUIRED';
    }

    // Create channel action for this reminder
    const idempotencyKey = generateIdempotencyKey(
      reminder.cycle.service_instance_id,
      reminder.cycle_id,
      reminder.id,
      reminder.channel,
      reminder.action_type,
      executionMode
    );

    const existingAction = await getChannelActionByIdempotencyKey(
      idempotencyKey
    );

    if (!existingAction) {
      await createChannelAction(
        {
          follow_up_task_id: taskId,
          renewal_account_id: reminder.cycle.service_instance.renewal_account_id,
          service_instance_id: reminder.cycle.service_instance_id,
          cycle_id: reminder.cycle_id,
          reminder_id: reminder.id,
          channel: reminder.channel,
          action_type: reminder.action_type,
          execution_mode: executionMode,
          communication_purpose: 'REMINDER',
          is_required: reminder.is_mandatory,
          scheduled_at: reminder.due_date,
          recipient_contact_id: reminder.cycle.service_instance.customer_contact_id,
          template_id: reminder.template_id,
          idempotency_key: idempotencyKey,
          created_by_id: userId,
        },
        userId,
        ip
      );
    }
  } catch (error) {
    console.error('[dualWriteReminderCreated] Error:', error);
    // Don't throw - dual-write failures should not block legacy operations
  }
}

/**
 * Dual-write: When a reminder is updated, update corresponding channel action.
 */
export async function dualWriteReminderUpdated(
  reminderId: number,
  oldData: any,
  newData: any,
  userId: number,
  ip?: string
) {
  try {
    const idempotencyKey = generateIdempotencyKey(
      newData.service_instance_id || oldData.service_instance_id,
      newData.cycle_id || oldData.cycle_id,
      reminderId,
      newData.channel || oldData.channel,
      newData.action_type || oldData.action_type,
      'AUTOMATIC'
    );

    const action = await getChannelActionByIdempotencyKey(idempotencyKey);

    if (action) {
      await (prisma as any).renewalFollowUpChannelAction.update({
        where: { id: action.id },
        data: {
          status: newData.status,
          scheduled_at: newData.due_date || action.scheduled_at,
          recipient_contact_id: newData.assigned_user_id || action.recipient_contact_id,
          template_id: newData.template_id || action.template_id,
        },
      });
    }
  } catch (error) {
    console.error('[dualWriteReminderUpdated] Error:', error);
  }
}

/**
 * Dual-write: When a follow-up log is created, create a communication event.
 */
export async function dualWriteFollowUpLogCreated(
  followUpLogId: number,
  userId: number,
  ip?: string
) {
  try {
    const log = await (prisma as any).renewalFollowUpLog.findUnique({
      where: { id: followUpLogId },
      include: {
        service_instance: {
          include: {
            renewal_account: true,
            cycles: {
              where: { is_active: true },
              orderBy: { cycle_number: 'desc' },
              take: 1,
            },
          },
        },
        reminder: true,
      },
    });

    if (!log) return;

    const cycle = log.service_instance.cycles[0];
    if (!cycle) return;

    // Find or create a follow-up task for manual follow-ups
    const followUpGroupKey = `MANUAL_FOLLOW_UP:${dayjs(log.logged_at).format('YYYY-MM-DD')}`;

    const existingTasks = await getFollowUpTasksByServiceInstance(
      log.service_instance_id,
      cycle.id
    );

    const existingTask = existingTasks.find(
      (t: any) => t.follow_up_group_key === followUpGroupKey
    );

    let taskId: number;

    if (existingTask) {
      taskId = existingTask.id;
    } else {
      const task = await createFollowUpTask(
        {
          renewal_account_id: log.service_instance.renewal_account_id,
          service_instance_id: log.service_instance_id,
          cycle_id: cycle.id,
          follow_up_group_key: followUpGroupKey,
          scheduled_for: log.logged_at,
          overall_status: 'COMPLETED',
          assigned_user_id: log.logged_by_id,
          source_type: 'MANUAL_FOLLOW_UP',
          source_reference_id: followUpLogId,
          migration_confidence: 'LEGACY_SYNC',
        },
        userId,
        ip
      );
      taskId = task.id;
    }

    // Create communication event
    await createCommunicationEvent({
      renewal_account_id: log.service_instance.renewal_account_id,
      service_instance_id: log.service_instance_id,
      cycle_id: cycle.id,
      follow_up_task_id: taskId,
      channel: log.channel || 'OTHER',
      event_type: 'MANUAL_FOLLOW_UP',
      execution_mode: 'MANUAL',
      communication_purpose: 'FOLLOW_UP',
      direction: 'OUTBOUND',
      status: 'COMPLETED',
      actor_type: 'USER',
      actor_user_id: log.logged_by_id,
      recipient: log.contact_person,
      subject_snapshot: log.notes,
      body_snapshot: log.outcome,
      metadata: JSON.stringify({
        follow_up_method: log.follow_up_method,
        next_follow_up_date: log.next_follow_up_date,
      }),
    });
  } catch (error) {
    console.error('[dualWriteFollowUpLogCreated] Error:', error);
  }
}

/**
 * Dual-write: When a notification is queued, link it to the corresponding channel action.
 */
export async function dualWriteNotificationQueued(
  notificationOutboxId: number,
  reminderId?: number,
  channelActionId?: number
) {
  try {
    if (channelActionId) {
      // Direct link provided
      await (prisma as any).notificationOutbox.update({
        where: { id: notificationOutboxId },
        data: {
          channel_action_id: channelActionId,
          follow_up_task_id: channelActionId, // Will be populated via relation
        },
      });
    } else if (reminderId) {
      // Find channel action by reminder
      const actions = await (prisma as any).renewalFollowUpChannelAction.findMany({
        where: { reminder_id: reminderId },
        take: 1,
      });

      if (actions.length > 0) {
        await (prisma as any).notificationOutbox.update({
          where: { id: notificationOutboxId },
          data: {
            channel_action_id: actions[0].id,
            follow_up_task_id: actions[0].follow_up_task_id,
          },
        });
      }
    }
  } catch (error) {
    console.error('[dualWriteNotificationQueued] Error:', error);
  }
}

/**
 * Dual-write: When a notification is sent, log a communication event.
 */
export async function dualWriteNotificationSent(
  notificationOutboxId: number,
  outcome: {
    provider_message_id?: string;
    status: string;
    error_code?: string;
    error_message?: string;
  },
  userId: number
) {
  try {
    const outbox = await (prisma as any).notificationOutbox.findUnique({
      where: { id: notificationOutboxId },
      include: {
        channel_action: {
          include: {
            follow_up_task: true,
          },
        },
      },
    });

    if (!outbox || !outbox.channel_action) return;

    // Update channel action status
    if (outcome.status === 'SENT' || outcome.status === 'DELIVERED') {
      await (prisma as any).renewalFollowUpChannelAction.update({
        where: { id: outbox.channel_action_id },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          provider_message_id: outcome.provider_message_id,
        },
      });

      await logChannelActionCompleted(
        outbox.channel_action_id,
        {
          provider_message_id: outcome.provider_message_id,
          outcome_code: outcome.status,
        },
        userId
      );
    } else {
      await (prisma as any).renewalFollowUpChannelAction.update({
        where: { id: outbox.channel_action_id },
        data: {
          status: 'FAILED',
          completed_at: new Date(),
        },
      });

      await logChannelActionFailed(
        outbox.channel_action_id,
        {
          error_code: outcome.error_code,
          error_message: outcome.error_message,
        },
        userId
      );
    }

    // Update outbox with delivery status
    await (prisma as any).notificationOutbox.update({
      where: { id: notificationOutboxId },
      data: {
        delivery_status: outcome.status,
        delivery_timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('[dualWriteNotificationSent] Error:', error);
  }
}

/**
 * Dual-write: When a cycle is activated, generate follow-up tasks for all reminders.
 */
export async function dualWriteCycleActivated(cycleId: number, userId: number) {
  try {
    const reminders = await (prisma as any).renewalReminder.findMany({
      where: {
        cycle_id: cycleId,
        status: 'PENDING',
      },
    });

    for (const reminder of reminders) {
      await dualWriteReminderCreated(reminder.id, userId);
    }
  } catch (error) {
    console.error('[dualWriteCycleActivated] Error:', error);
  }
}

/**
 * Dual-write: When reminders are regenerated, update follow-up tasks.
 */
export async function dualWriteRemindersRegenerated(
  cycleId: number,
  userId: number
) {
  try {
    // Cancel existing follow-up tasks for this cycle
    await (prisma as any).renewalFollowUpTask.updateMany({
      where: {
        cycle_id: cycleId,
        overall_status: 'PENDING',
        source_type: 'POLICY_STEP',
      },
      data: {
        overall_status: 'CANCELLED',
        cancelled_at: new Date(),
        cancel_reason: 'Policy regenerated',
      },
    });

    // Create new follow-up tasks for new reminders
    const reminders = await (prisma as any).renewalReminder.findMany({
      where: {
        cycle_id: cycleId,
        status: 'PENDING',
      },
    });

    for (const reminder of reminders) {
      await dualWriteReminderCreated(reminder.id, userId);
    }
  } catch (error) {
    console.error('[dualWriteRemindersRegenerated] Error:', error);
  }
}

import { prisma } from '../lib/prisma';

/**
 * Service for managing RenewalCommunicationEvent entities.
 * Communication events are immutable logs of all communication activities.
 */
export interface CreateCommunicationEventInput {
  renewal_account_id: number;
  service_instance_id: number;
  cycle_id: number;
  follow_up_task_id?: number;
  channel_action_id?: number;
  reminder_id?: number;
  outbox_id?: number;
  account_snapshot_id?: number;
  service_snapshot_id?: number;
  cycle_snapshot_id?: number;
  task_snapshot_id?: number;
  channel_action_snapshot_id?: number;
  channel: string;
  event_type: string;
  execution_mode?: string;
  communication_purpose?: string;
  direction?: string;
  status: string;
  actor_type: string;
  actor_user_id?: number;
  recipient?: string;
  subject_snapshot?: string;
  body_snapshot?: string;
  attachment_metadata?: string;
  template_id?: number;
  template_version?: string;
  content_snapshot_ref?: string;
  provider_message_id?: string;
  error_code?: string;
  error_message?: string;
  metadata?: string;
}

/**
 * Create a new communication event.
 * Events are immutable - always create new, never update.
 */
export async function createCommunicationEvent(
  data: CreateCommunicationEventInput
) {
  return (prisma as any).renewalCommunicationEvent.create({
    data: {
      ...data,
      direction: data.direction || 'OUTBOUND',
      occurred_at: new Date(),
    },
  });
}

/**
 * Get a communication event by ID.
 */
export async function getCommunicationEventById(id: number) {
  return (prisma as any).renewalCommunicationEvent.findUnique({
    where: { id },
    include: {
      renewal_account: true,
      service_instance: true,
      cycle: true,
      follow_up_task: true,
      channel_action: {
        include: {
          follow_up_task: true,
          reminder: true,
          recipient_contact: true,
        },
      },
      reminder: true,
      outbox: true,
      actor_user: true,
    },
  });
}

/**
 * Get communication events for a follow-up task.
 */
export async function getCommunicationEventsByTask(
  followUpTaskId: number,
  filters: {
    channel?: string;
    event_type?: string;
    direction?: string;
    limit?: number;
  } = {}
) {
  const where: any = {
    follow_up_task_id: followUpTaskId,
  };

  if (filters.channel) where.channel = filters.channel;
  if (filters.event_type) where.event_type = filters.event_type;
  if (filters.direction) where.direction = filters.direction;

  return (prisma as any).renewalCommunicationEvent.findMany({
    where,
    include: {
      channel_action: true,
      reminder: true,
      outbox: true,
      actor_user: true,
    },
    orderBy: { occurred_at: 'desc' },
    take: filters.limit || 100,
  });
}

/**
 * Get communication events for a channel action.
 */
export async function getCommunicationEventsByChannelAction(
  channelActionId: number,
  limit = 50
) {
  return (prisma as any).renewalCommunicationEvent.findMany({
    where: { channel_action_id: channelActionId },
    include: {
      renewal_account: true,
      service_instance: true,
      cycle: true,
      follow_up_task: true,
      reminder: true,
      outbox: true,
      actor_user: true,
    },
    orderBy: { occurred_at: 'desc' },
    take: limit,
  });
}

/**
 * Get communication events for a renewal account.
 */
export async function getCommunicationEventsByAccount(
  renewalAccountId: number,
  filters: {
    channel?: string;
    event_type?: string;
    direction?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  } = {}
) {
  const where: any = {
    renewal_account_id: renewalAccountId,
  };

  if (filters.channel) where.channel = filters.channel;
  if (filters.event_type) where.event_type = filters.event_type;
  if (filters.direction) where.direction = filters.direction;
  if (filters.from || filters.to) {
    where.occurred_at = {};
    if (filters.from) where.occurred_at.gte = filters.from;
    if (filters.to) where.occurred_at.lte = filters.to;
  }

  return (prisma as any).renewalCommunicationEvent.findMany({
    where,
    include: {
      service_instance: {
        include: {
          service_master: true,
        },
      },
      cycle: true,
      follow_up_task: true,
      channel_action: true,
      reminder: true,
      outbox: true,
      actor_user: true,
    },
    orderBy: { occurred_at: 'desc' },
    take: filters.limit || 100,
  });
}

/**
 * Get communication events for a service instance.
 */
export async function getCommunicationEventsByServiceInstance(
  serviceInstanceId: number,
  filters: {
    channel?: string;
    event_type?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  } = {}
) {
  const where: any = {
    service_instance_id: serviceInstanceId,
  };

  if (filters.channel) where.channel = filters.channel;
  if (filters.event_type) where.event_type = filters.event_type;
  if (filters.from || filters.to) {
    where.occurred_at = {};
    if (filters.from) where.occurred_at.gte = filters.from;
    if (filters.to) where.occurred_at.lte = filters.to;
  }

  return (prisma as any).renewalCommunicationEvent.findMany({
    where,
    include: {
      renewal_account: true,
      cycle: true,
      follow_up_task: true,
      channel_action: true,
      reminder: true,
      outbox: true,
      actor_user: true,
    },
    orderBy: { occurred_at: 'desc' },
    take: filters.limit || 100,
  });
}

/**
 * Get communication events for a reminder.
 */
export async function getCommunicationEventsByReminder(
  reminderId: number,
  limit = 50
) {
  return (prisma as any).renewalCommunicationEvent.findMany({
    where: { reminder_id: reminderId },
    include: {
      renewal_account: true,
      service_instance: true,
      cycle: true,
      follow_up_task: true,
      channel_action: true,
      outbox: true,
      actor_user: true,
    },
    orderBy: { occurred_at: 'desc' },
    take: limit,
  });
}

/**
 * Log a channel action started event.
 */
export async function logChannelActionStarted(
  channelActionId: number,
  actorUserId: number,
  actorType: string = 'SYSTEM'
) {
  const channelAction = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: {
      follow_up_task: true,
    },
  });

  if (!channelAction) throw new Error('Channel action not found');

  return createCommunicationEvent({
    renewal_account_id: channelAction.renewal_account_id,
    service_instance_id: channelAction.service_instance_id,
    cycle_id: channelAction.cycle_id,
    follow_up_task_id: channelAction.follow_up_task_id,
    channel_action_id: channelAction.id,
    reminder_id: channelAction.reminder_id,
    channel: channelAction.channel,
    event_type: 'ACTION_STARTED',
    execution_mode: channelAction.execution_mode,
    communication_purpose: channelAction.communication_purpose,
    status: 'STARTED',
    actor_type: actorType,
    actor_user_id: actorUserId,
    recipient: channelAction.recipient_address,
    template_id: channelAction.template_id,
  });
}

/**
 * Log a channel action completed event.
 */
export async function logChannelActionCompleted(
  channelActionId: number,
  outcome: {
    provider_message_id?: string;
    outcome_code?: string;
    customer_response?: string;
    notes?: string;
  },
  actorUserId: number,
  actorType: string = 'SYSTEM'
) {
  const channelAction = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: {
      follow_up_task: true,
      outbox_messages: {
        where: { channel_action_id: channelActionId },
        take: 1,
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!channelAction) throw new Error('Channel action not found');

  const outboxId = channelAction.outbox_messages[0]?.id;

  return createCommunicationEvent({
    renewal_account_id: channelAction.renewal_account_id,
    service_instance_id: channelAction.service_instance_id,
    cycle_id: channelAction.cycle_id,
    follow_up_task_id: channelAction.follow_up_task_id,
    channel_action_id: channelAction.id,
    reminder_id: channelAction.reminder_id,
    outbox_id: outboxId,
    channel_action_snapshot_id: channelAction.id,
    channel: channelAction.channel,
    event_type: 'ACTION_COMPLETED',
    execution_mode: channelAction.execution_mode,
    communication_purpose: channelAction.communication_purpose,
    status: 'COMPLETED',
    actor_type: actorType,
    actor_user_id: actorUserId,
    recipient: channelAction.recipient_address,
    provider_message_id: outcome.provider_message_id,
    metadata: JSON.stringify({
      outcome_code: outcome.outcome_code,
      customer_response: outcome.customer_response,
      notes: outcome.notes,
    }),
  });
}

/**
 * Log a channel action failed event.
 */
export async function logChannelActionFailed(
  channelActionId: number,
  error: {
    error_code?: string;
    error_message?: string;
  },
  actorUserId: number,
  actorType: string = 'SYSTEM'
) {
  const channelAction = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: {
      follow_up_task: true,
    },
  });

  if (!channelAction) throw new Error('Channel action not found');

  return createCommunicationEvent({
    renewal_account_id: channelAction.renewal_account_id,
    service_instance_id: channelAction.service_instance_id,
    cycle_id: channelAction.cycle_id,
    follow_up_task_id: channelAction.follow_up_task_id,
    channel_action_id: channelAction.id,
    reminder_id: channelAction.reminder_id,
    channel_action_snapshot_id: channelAction.id,
    channel: channelAction.channel,
    event_type: 'ACTION_FAILED',
    execution_mode: channelAction.execution_mode,
    communication_purpose: channelAction.communication_purpose,
    status: 'FAILED',
    actor_type: actorType,
    actor_user_id: actorUserId,
    recipient: channelAction.recipient_address,
    error_code: error.error_code,
    error_message: error.error_message,
  });
}

/**
 * Log a customer response event (incoming communication).
 */
export async function logCustomerResponse(
  channelActionId: number,
  response: {
    customer_response?: string;
    provider_message_id?: string;
  },
  actorUserId: number,
  actorType: string = 'CUSTOMER'
) {
  const channelAction = await (prisma as any).renewalFollowUpChannelAction.findUnique({
    where: { id: channelActionId },
    include: {
      follow_up_task: true,
    },
  });

  if (!channelAction) throw new Error('Channel action not found');

  return createCommunicationEvent({
    renewal_account_id: channelAction.renewal_account_id,
    service_instance_id: channelAction.service_instance_id,
    cycle_id: channelAction.cycle_id,
    follow_up_task_id: channelAction.follow_up_task_id,
    channel_action_id: channelAction.id,
    reminder_id: channelAction.reminder_id,
    channel_action_snapshot_id: channelAction.id,
    channel: channelAction.channel,
    event_type: 'CUSTOMER_RESPONSE',
    execution_mode: channelAction.execution_mode,
    communication_purpose: channelAction.communication_purpose,
    direction: 'INBOUND',
    status: 'RECEIVED',
    actor_type: actorType,
    actor_user_id: actorUserId,
    recipient: channelAction.recipient_address,
    provider_message_id: response.provider_message_id,
    metadata: JSON.stringify({
      customer_response: response.customer_response,
    }),
  });
}

/**
 * Get communication timeline for a renewal account (grouped by service/cycle).
 */
export async function getCommunicationTimeline(
  renewalAccountId: number,
  filters: {
    from?: Date;
    to?: Date;
    channel?: string;
    limit?: number;
  } = {}
) {
  const where: any = {
    renewal_account_id: renewalAccountId,
  };

  if (filters.from || filters.to) {
    where.occurred_at = {};
    if (filters.from) where.occurred_at.gte = filters.from;
    if (filters.to) where.occurred_at.lte = filters.to;
  }
  if (filters.channel) where.channel = filters.channel;

  return (prisma as any).renewalCommunicationEvent.findMany({
    where,
    include: {
      service_instance: {
        include: {
          service_master: true,
        },
      },
      cycle: true,
      follow_up_task: true,
      channel_action: {
        include: {
          reminder: true,
        },
      },
      reminder: true,
      outbox: true,
      actor_user: true,
    },
    orderBy: { occurred_at: 'desc' },
    take: filters.limit || 200,
  });
}

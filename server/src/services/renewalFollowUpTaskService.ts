import { prisma } from '../lib/prisma';
import { logAudit } from '../utils/renewalAudit';

/**
 * Service for managing RenewalFollowUpTask entities.
 * Parent follow-up tasks represent grouped follow-up activities for a service instance within a cycle.
 */
export interface CreateFollowUpTaskInput {
  renewal_account_id: number;
  service_instance_id: number;
  cycle_id: number;
  policy_version?: number;
  follow_up_group_key: string;
  scheduled_for: Date;
  overall_status?: string;
  assigned_user_id?: number;
  source_type?: string;
  source_reference_id?: number;
  migration_confidence?: string;
  source?: string;
}

export interface UpdateFollowUpTaskInput {
  overall_status?: string;
  assigned_user_id?: number;
  completed_at?: Date;
  cancelled_at?: Date;
  cancel_reason?: string;
  is_deleted?: boolean;
}

/**
 * Create a new parent follow-up task.
 * This represents a grouped follow-up activity for a service instance within a cycle.
 */
export async function createFollowUpTask(
  data: CreateFollowUpTaskInput,
  userId: number,
  ip?: string
) {
  const task = await (prisma as any).renewalFollowUpTask.create({
    data: {
      ...data,
      overall_status: data.overall_status || 'PENDING',
      source_type: data.source_type || 'POLICY_STEP',
    },
  });

  await logAudit({
    accountId: data.renewal_account_id,
    entityType: 'FOLLOW_UP_TASK',
    entityId: task.id,
    action: 'CREATED',
    newValue: JSON.stringify(data),
    performedById: userId,
    ip,
  });

  return task;
}

/**
 * Get a follow-up task by ID with relations.
 */
export async function getFollowUpTaskById(id: number) {
  return (prisma as any).renewalFollowUpTask.findUnique({
    where: { id },
    include: {
      renewal_account: true,
      service_instance: {
        include: {
          service_master: true,
          assigned_user: true,
          customer_contact: true,
        },
      },
      cycle: true,
      assigned_user: true,
      channel_actions: {
        include: {
          reminder: true,
          recipient_contact: true,
          template: true,
          created_by: true,
          completed_by: true,
          outbox_messages: true,
        },
        orderBy: { scheduled_at: 'asc' },
      },
      communication_events: {
        orderBy: { occurred_at: 'desc' },
        take: 50,
      },
    },
  });
}

/**
 * Get follow-up tasks for a service instance within a cycle.
 */
export async function getFollowUpTasksByServiceInstance(
  serviceInstanceId: number,
  cycleId: number,
  filters: {
    status?: string;
    assigned_user_id?: number;
    policy_version?: number;
  } = {}
) {
  const where: any = {
    service_instance_id: serviceInstanceId,
    cycle_id: cycleId,
    is_deleted: false,
  };

  if (filters.status) where.overall_status = filters.status;
  if (filters.assigned_user_id) where.assigned_user_id = filters.assigned_user_id;
  if (filters.policy_version) where.policy_version = filters.policy_version;

  return (prisma as any).renewalFollowUpTask.findMany({
    where,
    orderBy: { scheduled_for: 'asc' },
  });
}

/**
 * Get follow-up tasks assigned to a user.
 */
export async function getFollowUpTasksByUser(
  userId: number,
  filters: {
    status?: string;
    scheduled_from?: Date;
    scheduled_to?: Date;
  } = {}
) {
  const where: any = {
    assigned_user_id: userId,
    is_deleted: false,
  };

  if (filters.status) where.overall_status = filters.status;
  if (filters.scheduled_from || filters.scheduled_to) {
    where.scheduled_for = {};
    if (filters.scheduled_from) where.scheduled_for.gte = filters.scheduled_from;
    if (filters.scheduled_to) where.scheduled_for.lte = filters.scheduled_to;
  }

  return (prisma as any).renewalFollowUpTask.findMany({
    where,
    include: {
      renewal_account: {
        include: {
          client_company: true,
        },
      },
      service_instance: {
        include: {
          service_master: true,
        },
      },
      cycle: true,
      channel_actions: true,
    },
    orderBy: { scheduled_for: 'asc' },
  });
}

/**
 * Update a follow-up task.
 */
export async function updateFollowUpTask(
  id: number,
  data: UpdateFollowUpTaskInput,
  userId: number,
  ip?: string
) {
  const old = await (prisma as any).renewalFollowUpTask.findUnique({
    where: { id },
  });

  const updated = await (prisma as any).renewalFollowUpTask.update({
    where: { id },
    data,
  });

  await logAudit({
    accountId: old?.renewal_account_id,
    entityType: 'FOLLOW_UP_TASK',
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
 * Cancel a follow-up task.
 */
export async function cancelFollowUpTask(
  id: number,
  cancelReason: string,
  userId: number,
  ip?: string
) {
  return updateFollowUpTask(
    id,
    {
      overall_status: 'CANCELLED',
      cancelled_at: new Date(),
      cancel_reason: cancelReason,
    },
    userId,
    ip
  );
}

/**
 * Complete a follow-up task.
 */
export async function completeFollowUpTask(
  id: number,
  userId: number,
  ip?: string
) {
  return updateFollowUpTask(
    id,
    {
      overall_status: 'COMPLETED',
      completed_at: new Date(),
    },
    userId,
    ip
  );
}

/**
 * Soft delete a follow-up task.
 */
export async function deleteFollowUpTask(
  id: number,
  userId: number,
  ip?: string
) {
  const old = await (prisma as any).renewalFollowUpTask.findUnique({
    where: { id },
  });

  const updated = await (prisma as any).renewalFollowUpTask.update({
    where: { id },
    data: { is_deleted: true },
  });

  await logAudit({
    accountId: old?.renewal_account_id,
    entityType: 'FOLLOW_UP_TASK',
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
 * Get pending follow-up tasks that need to be executed.
 */
export async function getPendingFollowUpTasks(limit = 100) {
  return (prisma as any).renewalFollowUpTask.findMany({
    where: {
      overall_status: 'PENDING',
      is_deleted: false,
      scheduled_for: { lte: new Date() },
    },
    include: {
      renewal_account: true,
      service_instance: {
        include: {
          service_master: true,
          assigned_user: true,
        },
      },
      cycle: true,
      assigned_user: true,
      channel_actions: {
        where: { status: 'PENDING' },
      },
    },
    orderBy: { scheduled_for: 'asc' },
    take: limit,
  });
}

/**
 * Get follow-up tasks by group key (for policy version tracking).
 */
export async function getFollowUpTasksByGroupKey(
  renewalAccountId: number,
  serviceInstanceId: number,
  cycleId: number,
  followUpGroupKey: string
) {
  return (prisma as any).renewalFollowUpTask.findMany({
    where: {
      renewal_account_id: renewalAccountId,
      service_instance_id: serviceInstanceId,
      cycle_id: cycleId,
      follow_up_group_key: followUpGroupKey,
      is_deleted: false,
    },
    include: {
      channel_actions: true,
    },
    orderBy: { scheduled_for: 'asc' },
  });
}

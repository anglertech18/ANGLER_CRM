import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';
import { resolveReminderPolicy } from './reminderPolicyResolver';
import { dualWriteReminderCreated } from './renewalDualWriteService';

/**
 * Generate materialized RenewalReminder rows for a cycle.
 * Called on cycle activation and on expiry-date change.
 */
export async function generateRemindersForCycle(cycleId: number, externalTx?: any): Promise<void> {
  const db = externalTx || prisma;
  const cycle = await db.renewalCycle.findUnique({
    where: { id: cycleId },
    include: {
      service_instance: {
        include: { renewal_account: true },
      },
    },
  });

  if (!cycle || !cycle.expiry_date) return;

  const policy = await resolveReminderPolicy(cycle.service_instance_id);
  if (!policy || !policy.steps?.length) return;

  const expiryDate = dayjs(cycle.expiry_date);
  const assignedUserId = cycle.service_instance.assigned_user_id;
  const accountManagerId = cycle.service_instance.renewal_account?.account_manager_id;

  // Cancel any existing PENDING reminders for this cycle
  await db.renewalReminder.updateMany({
    where: { cycle_id: cycleId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });

  // Snapshot the policy
  const snapshot = JSON.stringify({ policy_id: policy.id, name: policy.name, version: policy.version, steps: policy.steps });

  await db.renewalCycle.update({
    where: { id: cycleId },
    data: { reminder_policy_snapshot: snapshot },
  });

  // Generate one reminder row per enabled step
  const reminderData = policy.steps
    .filter((s: any) => s.is_enabled)
    .map((step: any) => {
      const dueDate = expiryDate.add(step.offset_days, 'day').toDate();
      let resolvedUserId: number | null = null;
      if (step.recipient_type === 'ACCOUNT_MANAGER') {
        resolvedUserId = accountManagerId ?? assignedUserId ?? null;
      } else {
        // Reminders for CUSTOMER, CLIENT, CONTACT, BOTH, ASSIGNED_USER are owned by the assigned renewal executive
        resolvedUserId = assignedUserId ?? accountManagerId ?? null;
      }

      return {
        cycle_id: cycleId,
        step_number: step.step_number,
        offset_days: step.offset_days,
        due_date: dueDate,
        action_type: step.action_type,
        channel: step.channel,
        recipient_type: step.recipient_type,
        assigned_user_id: resolvedUserId,
        template_id: step.template_id ?? null,
        status: 'PENDING',
        is_mandatory: step.is_mandatory,
        escalation_after_days: step.escalate_after_days ?? null,
        policy_version: policy.version,
      };
    });

  if (reminderData.length > 0) {
    await db.renewalReminder.createMany({ data: reminderData });
    
    // Dual-write: Create follow-up tasks and channel actions for new reminders
    const createdReminders = await db.renewalReminder.findMany({
      where: {
        cycle_id: cycleId,
        status: 'PENDING',
        policy_version: policy.version,
      },
    });
    
    for (const reminder of createdReminders) {
      await dualWriteReminderCreated(reminder.id, cycle.service_instance.assigned_user_id || 1, undefined, db);
    }
  }
}

/**
 * Regenerate reminders for all PENDING/DUE cycles of a service instance.
 * Used when expiry date, assigned user, or reminder policy changes.
 */
export async function regenerateRemindersForInstance(serviceInstanceId: number, externalTx?: any): Promise<void> {
  const db = externalTx || prisma;
  const activeCycles = await db.renewalCycle.findMany({
    where: {
      service_instance_id: serviceInstanceId,
      status: { in: ['ACTIVE', 'DUE_SOON', 'FOLLOW_UP'] },
      is_active: true,
    },
  });

  for (const cycle of activeCycles) {
    await generateRemindersForCycle(cycle.id, db);
  }
}

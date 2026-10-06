import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';
import { generateRemindersForCycle } from './reminderGeneratorService';

/**
 * Open (activate) the first cycle for a newly activated service instance.
 * Accepts optional transaction client (tx) for atomic multi-service activation.
 */
export async function openFirstCycle(serviceInstanceId: number, externalTx?: any): Promise<any> {
  const db = externalTx || prisma;
  const instance = await db.renewalServiceInstance.findUnique({
    where: { id: serviceInstanceId },
  });
  if (!instance) throw new Error(`Service instance #${serviceInstanceId} not found`);

  // Prevent duplicate open cycles if cycle 1 already exists
  const existingCycle = await db.renewalCycle.findFirst({
    where: { service_instance_id: serviceInstanceId, cycle_number: 1, is_active: true },
  });
  if (existingCycle) return existingCycle;

  const cycle = await db.renewalCycle.create({
    data: {
      service_instance_id: serviceInstanceId,
      cycle_number: 1,
      activation_date: instance.activation_date,
      expiry_date: instance.expiry_date,
      amount_due: instance.amount_due,
      outstanding: instance.amount_due,
      status: 'ACTIVE',
      is_active: true,
    },
  });

  await generateRemindersForCycle(cycle.id, db);
  return cycle;
}

/**
 * Calculate accurate next activation & expiry dates for a renewal cycle.
 * Standardizes duration units (months, years, days, weeks) and handles leap-year/end-of-month math.
 */
export function calculateNextCycleDates(
  currentExpiryDate: Date | string,
  durationVal: number,
  durationUnitRaw: string
): { nextActivationDate: Date; nextExpiryDate: Date } {
  const currentExpiry = dayjs(currentExpiryDate).endOf('day');
  const nextActivation = currentExpiry.add(1, 'day').startOf('day');

  const unitLower = (durationUnitRaw || 'months').toLowerCase().trim();
  let unit: dayjs.ManipulateType = 'month';

  if (unitLower.includes('year')) unit = 'year';
  else if (unitLower.includes('day')) unit = 'day';
  else if (unitLower.includes('week')) unit = 'week';
  else unit = 'month';

  // next_expiry_date = next_activation_date + duration - 1 day
  const nextExpiry = nextActivation.add(durationVal, unit).subtract(1, 'day').endOf('day');

  return {
    nextActivationDate: nextActivation.toDate(),
    nextExpiryDate: nextExpiry.toDate(),
  };
}

/**
 * Mark a cycle as renewed and open the next cycle atomically inside a transaction.
 * Validates preceding cycle status and calculates exact date boundaries.
 */
export async function renewCycle(
  cycleId: number,
  userId: number,
  newAmount: number,
  externalTx?: any
): Promise<any> {
  const executeRenewal = async (tx: any) => {
    const cycle = await tx.renewalCycle.findUnique({
      where: { id: cycleId },
      include: { service_instance: true },
    });

    if (!cycle) throw new Error(`Renewal cycle #${cycleId} not found`);
    if (!cycle.is_active) throw new Error(`Renewal cycle #${cycleId} is not active`);
    if (cycle.status === 'RENEWED') throw new Error(`Renewal cycle #${cycleId} has already been renewed`);
    if (cycle.status === 'CANCELLED') throw new Error(`Cannot renew a cancelled cycle #${cycleId}`);

    const instance = cycle.service_instance;
    if (!instance || !instance.is_active) {
      throw new Error(`Associated service instance #${cycle.service_instance_id} is inactive or deleted`);
    }

    const durationVal = instance.duration_value ?? 12;
    const durationUnit = instance.duration_unit ?? 'months';

    const { nextActivationDate, nextExpiryDate } = calculateNextCycleDates(
      cycle.expiry_date,
      durationVal,
      durationUnit
    );

    // 1. Atomically claim the active cycle so concurrent renewals cannot both proceed.
    const claimed = await tx.renewalCycle.updateMany({
      where: {
        id: cycleId,
        is_active: true,
        status: cycle.status,
      },
      data: {
        status: 'RENEWED',
        renewed_at: new Date(),
        renewed_by_id: userId,
        is_active: false,
      },
    });

    if (claimed.count !== 1) {
      throw new Error(
        `Renewal cycle #${cycleId} changed before it could be renewed`
      );
    }

    // 2. Cancel pending/due reminders for current cycle
    await tx.renewalReminder.updateMany({
      where: { cycle_id: cycleId, status: { in: ['PENDING', 'DUE'] } },
      data: { status: 'CANCELLED' },
    });

    // 3. Update service instance dates to new cycle range
    await tx.renewalServiceInstance.update({
      where: { id: cycle.service_instance_id },
      data: {
        activation_date: nextActivationDate,
        expiry_date: nextExpiryDate,
        amount_due: newAmount,
        status: 'ACTIVE',
      },
    });

    // 4. Create the next cycle
    const nextCycle = await tx.renewalCycle.create({
      data: {
        service_instance_id: cycle.service_instance_id,
        cycle_number: cycle.cycle_number + 1,
        activation_date: nextActivationDate,
        expiry_date: nextExpiryDate,
        amount_due: newAmount,
        outstanding: newAmount,
        status: 'ACTIVE',
        is_active: true,
      },
    });

    // 5. Generate reminder schedule for the new cycle
    await generateRemindersForCycle(nextCycle.id, tx);

    return nextCycle;
  };

  if (externalTx) {
    return executeRenewal(externalTx);
  }

  return (prisma as any).$transaction(executeRenewal);
}

/**
 * Auto-update cycle status based on days to expiry.
 * Called by the hourly cron.
 */
export async function refreshCycleStatuses(): Promise<void> {
  const today = dayjs().startOf('day');

  const activeCycles = await (prisma as any).renewalCycle.findMany({
    where: { status: { in: ['ACTIVE', 'DUE_SOON', 'FOLLOW_UP'] }, is_active: true },
  });

  for (const cycle of activeCycles) {
    if (!cycle.expiry_date) continue;
    const expiry = dayjs(cycle.expiry_date);
    const daysLeft = expiry.diff(today, 'day');

    let newStatus = cycle.status;
    if (daysLeft < 0) newStatus = 'EXPIRED';
    else if (daysLeft <= 30) newStatus = 'DUE_SOON';

    if (newStatus !== cycle.status) {
      await (prisma as any).renewalCycle.update({
        where: { id: cycle.id },
        data: { status: newStatus },
      });
    }
  }
}


import { prisma } from '../lib/prisma';
import os from 'os';
import crypto from 'crypto';

export function generateInstanceOwnerId(prefix = 'instance'): string {
  const hostname = os.hostname();
  const pid = process.pid;
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${hostname}-${pid}-${rand}`;
}

export interface LockAcquisitionResult {
  acquired: boolean;
  lockOwner: string;
  jobName: string;
  lockedUntil?: Date;
  reason?: string;
}

/**
 * Acquire a MySQL/MariaDB compatible database lease lock for a background cron job.
 * Lock acquisition is atomic and race-condition free.
 * 
 * @param jobName Unique identifier for the cron job (e.g. 'renewal_reminder_cron')
 * @param lockOwner Unique ID of the instance attempting to claim lock
 * @param leaseDurationMs Duration in ms before lease automatically expires (default 10 mins)
 */
export async function acquireCronLock(
  jobName: string,
  lockOwner: string,
  leaseDurationMs: number = 600000
): Promise<LockAcquisitionResult> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + leaseDurationMs);

  try {
    return await (prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.cronJobLock.findUnique({
        where: { job_name: jobName },
      });

      if (!existing) {
        // Lock record does not exist yet; try to create it atomically
        try {
          await tx.cronJobLock.create({
            data: {
              job_name: jobName,
              lock_owner: lockOwner,
              locked_at: now,
              locked_until: lockedUntil,
              last_heartbeat_at: now,
            },
          });
          return { acquired: true, lockOwner, jobName, lockedUntil };
        } catch (err: any) {
          // Concurrent insert race condition caught by unique constraint on job_name
          return { acquired: false, lockOwner, jobName, reason: 'CONCURRENT_INSERT_RACE' };
        }
      }

      // Lock record exists. Check if expired or owned by us
      const isExpired = existing.locked_until < now;
      const isOwnedByUs = existing.lock_owner === lockOwner;

      if (isExpired || isOwnedByUs) {
        // Optimistic concurrency update matching existing updated_at timestamp
        const updated = await tx.cronJobLock.updateMany({
          where: {
            job_name: jobName,
            updated_at: existing.updated_at,
          },
          data: {
            lock_owner: lockOwner,
            locked_at: now,
            locked_until: lockedUntil,
            last_heartbeat_at: now,
          },
        });

        if (updated.count > 0) {
          return { acquired: true, lockOwner, jobName, lockedUntil };
        } else {
          // Another instance updated the lock in the microsecond between findUnique and updateMany
          return { acquired: false, lockOwner, jobName, reason: 'RACE_CONDITION_LOST' };
        }
      }

      // Active lock held by another instance
      return {
        acquired: false,
        lockOwner,
        jobName,
        reason: `LOCKED_BY_OTHER (Owner: ${existing.lock_owner}, Expires: ${existing.locked_until.toISOString()})`,
      };
    });
  } catch (err: any) {
    console.error(`[CronLockService] Error acquiring lock for ${jobName}:`, err);
    return { acquired: false, lockOwner, jobName, reason: err.message };
  }
}

/**
 * Renew/Extend an existing active lease (heartbeat).
 * Only the owner who currently holds the lease can extend it.
 */
export async function renewCronLock(
  jobName: string,
  lockOwner: string,
  extensionMs: number = 600000
): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + extensionMs);

  try {
    const updated = await (prisma as any).cronJobLock.updateMany({
      where: {
        job_name: jobName,
        lock_owner: lockOwner,
        locked_until: { gte: now }, // Must still be active
      },
      data: {
        locked_until: lockedUntil,
        last_heartbeat_at: now,
      },
    });

    return updated.count > 0;
  } catch (err) {
    console.error(`[CronLockService] Error renewing lock for ${jobName}:`, err);
    return false;
  }
}

/**
 * Release a lease lock upon job completion.
 * Only the owner who currently holds the lease can release it.
 */
export async function releaseCronLock(jobName: string, lockOwner: string): Promise<boolean> {
  const now = new Date();
  try {
    const updated = await (prisma as any).cronJobLock.updateMany({
      where: {
        job_name: jobName,
        lock_owner: lockOwner,
      },
      data: {
        locked_until: now, // Expire immediately so next scheduled run can claim
      },
    });

    return updated.count > 0;
  } catch (err) {
    console.error(`[CronLockService] Error releasing lock for ${jobName}:`, err);
    return false;
  }
}

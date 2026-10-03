import { acquireCronLock, renewCronLock, releaseCronLock, generateInstanceOwnerId } from '../services/cronLockService';
import { prisma } from '../lib/prisma';

describe('CronLockService — MySQL Database Lease Lock Unit Tests', () => {
  const TEST_JOB = 'test_renewal_cron_job_' + Date.now();
  const ownerA = 'owner-instance-A-' + Date.now();
  const ownerB = 'owner-instance-B-' + Date.now();

  afterAll(async () => {
    // Cleanup test lock rows
    try {
      await (prisma as any).cronJobLock.deleteMany({
        where: { job_name: { contains: 'test_renewal_cron_job_' } }
      });
    } catch {}
  });

  test('1. First instance acquires the lock successfully', async () => {
    const res = await acquireCronLock(TEST_JOB, ownerA, 10000); // 10s lease
    expect(res.acquired).toBe(true);
    expect(res.lockOwner).toBe(ownerA);
    expect(res.jobName).toBe(TEST_JOB);
  });

  test('2. Second instance cannot acquire an active lease', async () => {
    const res = await acquireCronLock(TEST_JOB, ownerB, 10000);
    expect(res.acquired).toBe(false);
    expect(res.reason).toContain('LOCKED_BY_OTHER');
  });

  test('3. Same owner can renew the active lease', async () => {
    const renewed = await renewCronLock(TEST_JOB, ownerA, 30000);
    expect(renewed).toBe(true);
  });

  test('4. Non-owner cannot release the lock', async () => {
    const released = await releaseCronLock(TEST_JOB, ownerB);
    expect(released).toBe(false);
  });

  test('5. Owner can release the lock', async () => {
    const released = await releaseCronLock(TEST_JOB, ownerA);
    expect(released).toBe(true);
  });

  test('6. Expired lease can be acquired by a new instance', async () => {
    const expiredJob = 'test_expired_job_' + Date.now();
    
    // Create an expired lock directly in DB
    const pastDate = new Date(Date.now() - 60000); // 1 minute in past
    await (prisma as any).cronJobLock.create({
      data: {
        job_name: expiredJob,
        lock_owner: ownerA,
        locked_at: pastDate,
        locked_until: pastDate,
        last_heartbeat_at: pastDate,
      }
    });

    // Owner B should acquire the expired lease cleanly
    const res = await acquireCronLock(expiredJob, ownerB, 10000);
    expect(res.acquired).toBe(true);
    expect(res.lockOwner).toBe(ownerB);
  });

  test('7. Crashed worker lock expires naturally after leaseDurationMs', async () => {
    const crashJob = 'test_crash_job_' + Date.now();
    // Simulate crashed worker that acquired lock with 1ms lease
    await acquireCronLock(crashJob, ownerA, 1); // 1ms duration

    // Small delay to ensure expiration
    await new Promise(r => setTimeout(r, 10));

    // Recovery worker B acquires expired lease
    const res = await acquireCronLock(crashJob, ownerB, 10000);
    expect(res.acquired).toBe(true);
    expect(res.lockOwner).toBe(ownerB);
  });

  test('8. Two concurrent acquisition attempts result in exactly one winner', async () => {
    const raceJob = 'test_race_job_' + Date.now();
    const [res1, res2] = await Promise.all([
      acquireCronLock(raceJob, ownerA, 10000),
      acquireCronLock(raceJob, ownerB, 10000),
    ]);

    const acquiredCount = [res1.acquired, res2.acquired].filter(Boolean).length;
    expect(acquiredCount).toBe(1); // Exactly 1 instance wins
  });

  test('9. Instance ID generator produces unique owner IDs', () => {
    const id1 = generateInstanceOwnerId('cron');
    const id2 = generateInstanceOwnerId('cron');
    expect(id1).not.toEqual(id2);
    expect(id1).toContain('cron-');
  });

  test('10. Lock release attempt after exception handles gracefully', async () => {
    const errorJob = 'test_error_job_' + Date.now();
    const lockRes = await acquireCronLock(errorJob, ownerA, 10000);
    expect(lockRes.acquired).toBe(true);

    try {
      throw new Error('Simulated cron job crash');
    } catch (err) {
      // Simulate finally block release
      const released = await releaseCronLock(errorJob, ownerA);
      expect(released).toBe(true);
    }
  });
});

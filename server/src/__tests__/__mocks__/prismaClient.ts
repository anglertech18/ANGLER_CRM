// Minimal mock of PrismaClient for unit tests
type CronJobLockRecord = {
  job_name: string;
  lock_owner: string;
  locked_at: Date;
  locked_until: Date;
  last_heartbeat_at: Date;
  updated_at: Date;
};

function asDate(value: unknown): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  return new Date(value as string | number);
}

function cloneCronJobLock(record: CronJobLockRecord): CronJobLockRecord {
  return {
    ...record,
    locked_at: asDate(record.locked_at),
    locked_until: asDate(record.locked_until),
    last_heartbeat_at: asDate(record.last_heartbeat_at),
    updated_at: asDate(record.updated_at),
  };
}

function cronJobLockMatchesWhere(
  record: CronJobLockRecord,
  where: any = {}
): boolean {
  if (where.job_name !== undefined) {
    if (typeof where.job_name === 'string') {
      if (record.job_name !== where.job_name) return false;
    } else {
      if (
        where.job_name.equals !== undefined &&
        record.job_name !== where.job_name.equals
      ) {
        return false;
      }

      if (
        where.job_name.contains !== undefined &&
        !record.job_name.includes(where.job_name.contains)
      ) {
        return false;
      }
    }
  }

  if (
    where.lock_owner !== undefined &&
    record.lock_owner !== where.lock_owner
  ) {
    return false;
  }

  if (
    where.updated_at !== undefined &&
    record.updated_at.getTime() !== asDate(where.updated_at).getTime()
  ) {
    return false;
  }

  if (where.locked_until !== undefined) {
    if (
      where.locked_until instanceof Date ||
      typeof where.locked_until === 'string' ||
      typeof where.locked_until === 'number'
    ) {
      if (
        record.locked_until.getTime() !==
        asDate(where.locked_until).getTime()
      ) {
        return false;
      }
    } else {
      if (
        where.locked_until.gte !== undefined &&
        record.locked_until.getTime() <
          asDate(where.locked_until.gte).getTime()
      ) {
        return false;
      }

      if (
        where.locked_until.gt !== undefined &&
        record.locked_until.getTime() <=
          asDate(where.locked_until.gt).getTime()
      ) {
        return false;
      }

      if (
        where.locked_until.lte !== undefined &&
        record.locked_until.getTime() >
          asDate(where.locked_until.lte).getTime()
      ) {
        return false;
      }

      if (
        where.locked_until.lt !== undefined &&
        record.locked_until.getTime() >=
          asDate(where.locked_until.lt).getTime()
      ) {
        return false;
      }
    }
  }

  return true;
}

function makeCronJobLockMethods() {
  const store = new Map<string, CronJobLockRecord>();

  return {
    findUnique: jest.fn(async ({ where }: any) => {
      const record = store.get(where.job_name);
      return record ? cloneCronJobLock(record) : null;
    }),

    create: jest.fn(async ({ data }: any) => {
      if (store.has(data.job_name)) {
        const error: any = new Error(
          'Unique constraint failed on the fields: (`job_name`)'
        );
        error.code = 'P2002';
        throw error;
      }

      const now = new Date();
      const record: CronJobLockRecord = {
        job_name: data.job_name,
        lock_owner: data.lock_owner,
        locked_at: asDate(data.locked_at),
        locked_until: asDate(data.locked_until),
        last_heartbeat_at: asDate(data.last_heartbeat_at),
        updated_at:
          data.updated_at !== undefined
            ? asDate(data.updated_at)
            : now,
      };

      store.set(record.job_name, record);
      return cloneCronJobLock(record);
    }),

    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;

      for (const [jobName, record] of store.entries()) {
        if (!cronJobLockMatchesWhere(record, where)) continue;

        const nextUpdatedAt = new Date(
          Math.max(Date.now(), record.updated_at.getTime() + 1)
        );

        const updated: CronJobLockRecord = {
          ...record,
          ...data,
          job_name: data.job_name ?? record.job_name,
          lock_owner: data.lock_owner ?? record.lock_owner,
          locked_at:
            data.locked_at !== undefined
              ? asDate(data.locked_at)
              : record.locked_at,
          locked_until:
            data.locked_until !== undefined
              ? asDate(data.locked_until)
              : record.locked_until,
          last_heartbeat_at:
            data.last_heartbeat_at !== undefined
              ? asDate(data.last_heartbeat_at)
              : record.last_heartbeat_at,
          updated_at:
            data.updated_at !== undefined
              ? asDate(data.updated_at)
              : nextUpdatedAt,
        };

        if (updated.job_name !== jobName) {
          store.delete(jobName);
        }

        store.set(updated.job_name, updated);
        count += 1;
      }

      return { count };
    }),

    deleteMany: jest.fn(async ({ where }: any = {}) => {
      let count = 0;

      for (const [jobName, record] of Array.from(store.entries())) {
        if (!cronJobLockMatchesWhere(record, where)) continue;

        store.delete(jobName);
        count += 1;
      }

      return { count };
    }),
  };
}

function txMock(): any {
  const tx: any = {};
  tx.$transaction = jest.fn((arg: any) => {
    if (Array.isArray(arg)) {
      return Promise.all(
        arg.map((q: any) => {
          if (typeof q === 'object' && q !== null) {
            const model = Object.keys(q)[0];
            const operation = Object.keys(q[model] || {})[0];
            return q[model][operation];
          }
          return q;
        })
      );
    }
    if (typeof arg === 'function') return arg(tx);
    return Promise.resolve([]);
  });
  return tx;
}

function makeRenewalCycleMethods() {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
}

function makeRenewalReminderMethods() {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
}

function makeRenewalServiceInstanceMethods() {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  };
}

function makeRenewalAccountMethods() {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
}

function makeRenewalAccountContactMethods() {
  return {
    upsert: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  };
}

function makeBasicModelMethods() {
  return {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
}

function makeRenewalAuditLogMethods() {
  return {
    create: jest.fn(),
  };
}

export class PrismaClient {
  $transaction = jest.fn((arg: any) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    if (typeof arg === 'function') return arg(this);
    return Promise.resolve([]);
  });

  weeklyReport = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  user = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };

  lead = {
    findMany: jest.fn(),
  };

  cashflowManagementCompany = {
    findMany: jest.fn(),
  };

  userProductTarget = {
    findMany: jest.fn(),
  };

  renewalCycle = makeRenewalCycleMethods();
  renewalReminder = makeRenewalReminderMethods();
  renewalServiceInstance = makeRenewalServiceInstanceMethods();
  renewalAccount = makeRenewalAccountMethods();
  renewalAccountContact = makeRenewalAccountContactMethods();
  renewalContact = makeBasicModelMethods();
  clientCompany = makeBasicModelMethods();
  renewalServiceCategory = makeBasicModelMethods();
  renewalServiceMaster = makeBasicModelMethods();
  renewalServicePlanMaster = makeBasicModelMethods();
  renewalReminderPolicy = makeBasicModelMethods();
  renewalProvider = makeBasicModelMethods();
  renewalAuditLog = makeRenewalAuditLogMethods();
  renewalFollowUpChannelAction = makeBasicModelMethods();
  renewalNotificationTemplate = makeBasicModelMethods();
  cronJobLock = makeCronJobLockMethods();

  $queryRawUnsafe = jest.fn();
  $executeRawUnsafe = jest.fn();
}

export const tx = txMock;

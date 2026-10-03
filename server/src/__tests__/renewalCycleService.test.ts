import dayjs from 'dayjs';
import { openFirstCycle, renewCycle, refreshCycleStatuses } from '../services/renewalCycleService';
import { generateRemindersForCycle } from '../services/reminderGeneratorService';
import { prisma } from '../lib/prisma';

jest.mock('../services/reminderGeneratorService', () => ({
  generateRemindersForCycle: jest.fn().mockResolvedValue(undefined),
}));

const prismaMock = prisma as any;
const generateRemindersForCycleMock =
  generateRemindersForCycle as jest.MockedFunction<typeof generateRemindersForCycle>;

function mockCycle(overrides: any = {}) {
  return {
    id: 1,
    service_instance_id: 1,
    cycle_number: 1,
    activation_date: new Date('2025-01-01'),
    expiry_date: new Date('2025-12-31'),
    status: 'ACTIVE',
    is_active: true,
    amount_due: 12000,
    outstanding: 12000,
    ...overrides,
  };
}

function mockServiceInstance(overrides: any = {}) {
  return {
    id: 1,
    renewal_account_id: 1,
    service_master_id: 1,
    duration_value: 12,
    duration_unit: 'months',
    activation_date: new Date('2025-01-01'),
    expiry_date: new Date('2025-12-31'),
    amount_due: 12000,
    status: 'ACTIVE',
    is_active: true,
    ...overrides,
  };
}

function prepareRenewal(
  instanceOverrides: any,
  cycleOverrides: any = {},
  cancelledReminderCount = 0
) {
  const instance = mockServiceInstance(instanceOverrides);
  const cycle = mockCycle(cycleOverrides);

  prismaMock.renewalCycle.findUnique.mockResolvedValue({
    ...cycle,
    service_instance: instance,
  });
  prismaMock.renewalCycle.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.renewalReminder.updateMany.mockResolvedValue({
    count: cancelledReminderCount,
  });
  prismaMock.renewalServiceInstance.update.mockResolvedValue(instance);
  prismaMock.renewalCycle.create.mockImplementation(async ({ data }: any) => ({
    id: cycle.id + 1,
    ...data,
  }));

  return { instance, cycle };
}

function expectDate(value: Date | string, expected: string) {
  expect(dayjs(value).format('YYYY-MM-DD')).toBe(expected);
}

function getLatestCreatedCycleData(): any {
  const calls = prismaMock.renewalCycle.create.mock.calls;
  return calls[calls.length - 1][0].data;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('openFirstCycle', () => {
  it('creates cycle with activation and expiry from instance', async () => {
    const instance = mockServiceInstance();

    prismaMock.renewalServiceInstance.findUnique.mockResolvedValue(instance);
    prismaMock.renewalCycle.findFirst.mockResolvedValue(null);
    prismaMock.renewalCycle.create.mockImplementation(async ({ data }: any) => ({
      id: 1,
      ...data,
    }));

    const result = await openFirstCycle(1);

    expect(prismaMock.renewalCycle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        service_instance_id: 1,
        cycle_number: 1,
        activation_date: instance.activation_date,
        expiry_date: instance.expiry_date,
        amount_due: 12000,
        outstanding: 12000,
        status: 'ACTIVE',
        is_active: true,
      }),
    });
    expect(result.id).toBe(1);
    expect(generateRemindersForCycleMock).toHaveBeenCalledWith(1, prismaMock);
  });

  it('returns the existing active first cycle instead of creating a duplicate', async () => {
    const instance = mockServiceInstance();
    const existingCycle = mockCycle();

    prismaMock.renewalServiceInstance.findUnique.mockResolvedValue(instance);
    prismaMock.renewalCycle.findFirst.mockResolvedValue(existingCycle);

    const result = await openFirstCycle(1);

    expect(result).toBe(existingCycle);
    expect(prismaMock.renewalCycle.create).not.toHaveBeenCalled();
    expect(generateRemindersForCycleMock).not.toHaveBeenCalled();
  });

  it('throws when instance not found', async () => {
    prismaMock.renewalServiceInstance.findUnique.mockResolvedValue(null);

    await expect(openFirstCycle(999)).rejects.toThrow(
      'Service instance #999 not found'
    );
  });
});

describe('renewCycle - date math and persistence', () => {
  it('calculates next cycle dates for 12-month (1-year) renewal', async () => {
    prepareRenewal(
      {
        duration_value: 12,
        duration_unit: 'months',
        expiry_date: new Date('2025-12-31'),
      },
      {
        expiry_date: new Date('2025-12-31'),
      },
      3
    );

    const result = await renewCycle(1, 1, 15000);
    const createdData = getLatestCreatedCycleData();

    expectDate(result.activation_date, '2026-01-01');
    expectDate(result.expiry_date, '2026-12-31');
    expectDate(createdData.activation_date, '2026-01-01');
    expectDate(createdData.expiry_date, '2026-12-31');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(
      prismaMock.$transaction.mock.invocationCallOrder[0]
    ).toBeLessThan(
      prismaMock.renewalCycle.findUnique.mock.invocationCallOrder[0]
    );
    expect(prismaMock.renewalCycle.updateMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        is_active: true,
        status: 'ACTIVE',
      },
      data: {
        status: 'RENEWED',
        renewed_at: expect.any(Date),
        renewed_by_id: 1,
        is_active: false,
      },
    });
    expect(prismaMock.renewalReminder.updateMany).toHaveBeenCalledWith({
      where: {
        cycle_id: 1,
        status: { in: ['PENDING', 'DUE'] },
      },
      data: { status: 'CANCELLED' },
    });
    expect(prismaMock.renewalServiceInstance.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        activation_date: expect.any(Date),
        expiry_date: expect.any(Date),
        amount_due: 15000,
        status: 'ACTIVE',
      },
    });
    expect(createdData).toEqual(
      expect.objectContaining({
        service_instance_id: 1,
        cycle_number: 2,
        amount_due: 15000,
        outstanding: 15000,
        status: 'ACTIVE',
        is_active: true,
      })
    );
    expect(generateRemindersForCycleMock).toHaveBeenCalledWith(2, prismaMock);
  });

  it('calculates next cycle dates for monthly renewal (1 month)', async () => {
    prepareRenewal(
      {
        duration_value: 1,
        duration_unit: 'months',
        expiry_date: new Date('2025-01-31'),
      },
      {
        expiry_date: new Date('2025-01-31'),
      }
    );

    const result = await renewCycle(1, 1, 1000);
    const createdData = getLatestCreatedCycleData();

    expectDate(result.activation_date, '2025-02-01');
    expectDate(result.expiry_date, '2025-02-28');
    expectDate(createdData.activation_date, '2025-02-01');
    expectDate(createdData.expiry_date, '2025-02-28');
  });

  it('handles leap year renewal correctly (feb 29)', async () => {
    prepareRenewal(
      {
        duration_value: 12,
        duration_unit: 'months',
        expiry_date: new Date('2023-02-28'),
      },
      {
        expiry_date: new Date('2023-02-28'),
      }
    );

    const result = await renewCycle(1, 1, 12000);
    const createdData = getLatestCreatedCycleData();

    expectDate(result.activation_date, '2023-03-01');
    expectDate(result.expiry_date, '2024-02-29');
    expectDate(createdData.activation_date, '2023-03-01');
    expectDate(createdData.expiry_date, '2024-02-29');
  });

  it('handles backdated (expired) renewal', async () => {
    prepareRenewal(
      {
        duration_value: 12,
        duration_unit: 'months',
        expiry_date: new Date('2024-06-15'),
      },
      {
        expiry_date: new Date('2024-06-15'),
      }
    );

    const result = await renewCycle(1, 1, 12000);
    const createdData = getLatestCreatedCycleData();

    expectDate(result.activation_date, '2024-06-16');
    expectDate(result.expiry_date, '2025-06-15');
    expectDate(createdData.activation_date, '2024-06-16');
    expectDate(createdData.expiry_date, '2025-06-15');
  });

  it('uses default duration (12 months) when instance has no duration', async () => {
    prepareRenewal(
      {
        duration_value: null,
        duration_unit: null,
        expiry_date: new Date('2025-06-30'),
      },
      {
        expiry_date: new Date('2025-06-30'),
      }
    );

    const result = await renewCycle(1, 1, 12000);
    const createdData = getLatestCreatedCycleData();

    expectDate(result.activation_date, '2025-07-01');
    expectDate(result.expiry_date, '2026-06-30');
    expectDate(createdData.activation_date, '2025-07-01');
    expectDate(createdData.expiry_date, '2026-06-30');
  });

  it('rejects a duplicate renewal when another transaction already claimed the cycle', async () => {
    prepareRenewal(
      {
        duration_value: 12,
        duration_unit: 'months',
        expiry_date: new Date('2025-12-31'),
      },
      {
        expiry_date: new Date('2025-12-31'),
      }
    );
    prismaMock.renewalCycle.updateMany.mockResolvedValue({ count: 0 });

    await expect(renewCycle(1, 1, 15000)).rejects.toThrow(
      'Renewal cycle #1 changed before it could be renewed'
    );

    expect(prismaMock.renewalReminder.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.renewalServiceInstance.update).not.toHaveBeenCalled();
    expect(prismaMock.renewalCycle.create).not.toHaveBeenCalled();
    expect(generateRemindersForCycleMock).not.toHaveBeenCalled();
  });

  it('rejects renewal when the associated service instance is inactive', async () => {
    const cycle = mockCycle();
    const instance = mockServiceInstance({ is_active: false });

    prismaMock.renewalCycle.findUnique.mockResolvedValue({
      ...cycle,
      service_instance: instance,
    });

    await expect(renewCycle(1, 1, 12000)).rejects.toThrow(
      'Associated service instance #1 is inactive or deleted'
    );

    expect(prismaMock.renewalCycle.update).not.toHaveBeenCalled();
  });
});

describe('refreshCycleStatuses', () => {
  it('marks expired cycles as EXPIRED', async () => {
    const pastCycle = mockCycle({
      id: 1,
      expiry_date: dayjs().subtract(5, 'day').toDate(),
      status: 'ACTIVE',
    });
    prismaMock.renewalCycle.findMany.mockResolvedValue([pastCycle]);
    prismaMock.renewalCycle.update.mockResolvedValue(pastCycle);

    await refreshCycleStatuses();

    expect(prismaMock.renewalCycle.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'EXPIRED' },
    });
  });

  it('marks cycles expiring within 30 days as DUE_SOON', async () => {
    const nearCycle = mockCycle({
      id: 2,
      expiry_date: dayjs().add(15, 'day').toDate(),
      status: 'ACTIVE',
    });
    prismaMock.renewalCycle.findMany.mockResolvedValue([nearCycle]);
    prismaMock.renewalCycle.update.mockResolvedValue(nearCycle);

    await refreshCycleStatuses();

    expect(prismaMock.renewalCycle.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { status: 'DUE_SOON' },
    });
  });

  it('leaves cycles with >30 days as ACTIVE', async () => {
    const farCycle = mockCycle({
      id: 3,
      expiry_date: dayjs().add(60, 'day').toDate(),
      status: 'ACTIVE',
    });
    prismaMock.renewalCycle.findMany.mockResolvedValue([farCycle]);

    await refreshCycleStatuses();

    expect(prismaMock.renewalCycle.update).not.toHaveBeenCalled();
  });

  it('handles cycles with no expiry_date gracefully', async () => {
    const noExpiry = mockCycle({
      id: 4,
      expiry_date: null,
      status: 'ACTIVE',
    });
    prismaMock.renewalCycle.findMany.mockResolvedValue([noExpiry]);

    await refreshCycleStatuses();

    expect(prismaMock.renewalCycle.update).not.toHaveBeenCalled();
  });
});
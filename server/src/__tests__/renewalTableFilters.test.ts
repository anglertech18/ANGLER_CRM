import { prisma } from '../lib/prisma';
import { getRenewalAccounts } from '../services/renewalService';

jest.mock('../utils/renewalAudit', () => ({ logAudit: jest.fn() }));

const prismaMock = prisma as any;

describe('renewal table server-side filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.renewalAccount.count.mockResolvedValue(0);
    prismaMock.renewalAccount.findMany.mockResolvedValue([]);
  });

  it('filters the renewal register to services with no assigned executive', async () => {
    await getRenewalAccounts({ assignedUser: 'UNASSIGNED', page: 2, limit: 25 }, 9, 'Admin');

    const query = prismaMock.renewalAccount.findMany.mock.calls[0][0];
    expect(query.skip).toBe(25);
    expect(query.take).toBe(25);
    expect(query.where.AND).toContainEqual({
      services: { some: { assigned_user_id: null, is_active: true } },
    });
    expect(prismaMock.renewalAccount.count).toHaveBeenCalledWith({ where: query.where });
  });

  it('keeps numeric executive filtering server-side', async () => {
    await getRenewalAccounts({ assignedUser: '42' }, 9, 'Admin');
    const where = prismaMock.renewalAccount.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ services: { some: { assigned_user_id: 42 } } });
  });
});

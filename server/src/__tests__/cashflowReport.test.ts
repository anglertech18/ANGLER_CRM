/**
 * Unit tests for the Cashflow Report controller — RBAC hierarchy, Management
 * Access company/BDE scoping, and numeric input validation.
 *
 * Prisma is fully mocked (see __mocks__/prismaClient.ts) so no database is
 * required. getFilteredMilestonesForLeads/resolveDateWindow are mocked out so
 * these tests focus purely on the access-control branch in
 * cashflowReportController.ts, not the shared milestone-math utilities (which
 * have their own responsibility and are exercised elsewhere).
 */

import { getCashflowReport, getCashflowReportBdes } from '../controllers/cashflowReportController';
import { prisma } from '../lib/prisma';

jest.mock('../utils/cashflowMilestones', () => ({
  getFilteredMilestonesForLeads: jest.fn(),
  computeMilestonePeriodAmounts: jest.fn(() => ({
    already_received: 0, period_expected: 0, period_collected: 0, period_pending: 0, is_fully_collected: false,
  })),
  parseStatusFilter: jest.fn(() => null),
  matchesStatusFilters: jest.fn(() => true),
}));

jest.mock('../utils/dateFilters', () => ({
  resolveDateWindow: jest.fn(() => null),
  resolveQuarterWindow: jest.fn(() => null),
  resolveDateRange: jest.fn(() => null),
}));

const { getFilteredMilestonesForLeads } = require('../utils/cashflowMilestones');

const prismaMock = prisma as any;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(overrides: { query?: any; user?: any } = {}) {
  return { query: overrides.query ?? {}, user: overrides.user ?? { id: 1, role: 'CEO' } } as any;
}

const SAMPLE_LEAD = (overrides: Partial<{ id: number; lead_owner_id: number; bu_company_id: number }> = {}) => ({
  id: 10, company_name: 'Acme', product_id: 1, lead_owner_id: 2, vertical_id: 1,
  owner_id: 2, owner_first: 'Bob', owner_last: 'BDE', product_name: 'Prod', bu_company_id: 5, bu_company_name: 'Trinetra', vertical_name: 'IT',
  ...overrides,
});

const SAMPLE_MILESTONE = { id: 100, lead_id: 10, pt_name: 'M1', expected_amount: 1000, edc: null, revised_edc: null, collection_status: null, poa_status: null, bant_poa: '' };

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.userProductTarget.findMany.mockResolvedValue([]);
  prismaMock.cashflowManagementCompany.findMany.mockResolvedValue([]);
  getFilteredMilestonesForLeads.mockResolvedValue({ milestones: [SAMPLE_MILESTONE] });
});

describe('getCashflowReport — role hierarchy', () => {
  it('restricts SalesPerson to their own leads regardless of a requested bde_id', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([SAMPLE_LEAD({ lead_owner_id: 1 })]);
    const req = makeReq({ query: { bde_id: '999' }, user: { id: 1, role: 'SalesPerson' } });
    const res = mockRes();

    await getCashflowReport(req, res);

    const [sql, ...args] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('l.lead_owner_id = ?');
    expect(args).toContain(1);
    expect(args).not.toContain(999);
  });

  it('returns empty response when a SalesManager requests a bde_id outside their team', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]); // self + one direct report
    const req = makeReq({ query: { bde_id: '999' }, user: { id: 1, role: 'SalesManager' } });
    const res = mockRes();

    await getCashflowReport(req, res);

    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ summary: { totalExpected: 0, totalCollected: 0, totalBalance: 0, totalStuck: 0 }, rows: [] });
  });

  it('lets a SalesManager view a direct report within their team', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prismaMock.$queryRawUnsafe.mockResolvedValue([SAMPLE_LEAD({ lead_owner_id: 2 })]);
    const req = makeReq({ query: { bde_id: '2' }, user: { id: 1, role: 'SalesManager' } });
    const res = mockRes();

    await getCashflowReport(req, res);

    const [sql, ...args] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('l.lead_owner_id = ?');
    expect(args).toContain(2);
  });

  it('does not restrict CEO by owner when no bde_id/company_id is supplied', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([SAMPLE_LEAD()]);
    const req = makeReq({ query: {}, user: { id: 1, role: 'CEO' } });
    const res = mockRes();

    await getCashflowReport(req, res);

    const [sql] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).not.toMatch(/l\.lead_owner_id\s*=\s*\?/);
    expect(sql).not.toMatch(/l\.lead_owner_id\s+IN/);
    expect(sql).not.toMatch(/p\.company_id\s*=\s*\?/);
    expect(sql).not.toMatch(/p\.company_id\s+IN/);
  });
});

describe('getCashflowReport — Management Access', () => {
  it('falls back to normal hierarchy when Management Access is disabled', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([SAMPLE_LEAD({ lead_owner_id: 1 })]);
    const req = makeReq({ query: {}, user: { id: 1, role: 'SalesPerson', cashflow_management_access: false } });
    const res = mockRes();

    await getCashflowReport(req, res);

    expect(prismaMock.cashflowManagementCompany.findMany).not.toHaveBeenCalled();
    const [sql, ...args] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('l.lead_owner_id = ?');
    expect(args).toContain(1);
  });

  it('returns empty response when the requested company_id is outside the assigned companies', async () => {
    prismaMock.cashflowManagementCompany.findMany.mockResolvedValue([{ company_id: 5 }]);
    const req = makeReq({
      query: { company_id: '7' },
      user: { id: 1, role: 'SalesManager', cashflow_management_access: true },
    });
    const res = mockRes();

    await getCashflowReport(req, res);

    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ summary: { totalExpected: 0, totalCollected: 0, totalBalance: 0, totalStuck: 0 }, rows: [] });
  });

  it('SECURITY FIX: returns empty response when a requested bde_id belongs to a company outside the assigned companies', async () => {
    prismaMock.cashflowManagementCompany.findMany.mockResolvedValue([{ company_id: 5 }]); // assigned: Trinetra only
    prismaMock.user.findUnique.mockResolvedValue({ company_id: 99 }); // requested BDE belongs to ABC Company
    const req = makeReq({
      query: { bde_id: '42' }, // no company_id — the gap this closes
      user: { id: 1, role: 'SalesManager', cashflow_management_access: true },
    });
    const res = mockRes();

    await getCashflowReport(req, res);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 42 }, select: { company_id: true } });
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ summary: { totalExpected: 0, totalCollected: 0, totalBalance: 0, totalStuck: 0 }, rows: [] });
  });

  it('allows a requested bde_id that belongs to one of the assigned companies', async () => {
    prismaMock.cashflowManagementCompany.findMany.mockResolvedValue([{ company_id: 5 }]);
    prismaMock.user.findUnique.mockResolvedValue({ company_id: 5 });
    prismaMock.$queryRawUnsafe.mockResolvedValue([SAMPLE_LEAD({ lead_owner_id: 42 })]);
    const req = makeReq({
      query: { bde_id: '42' },
      user: { id: 1, role: 'SalesManager', cashflow_management_access: true },
    });
    const res = mockRes();

    await getCashflowReport(req, res);

    const [sql, ...args] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('p.company_id IN (5)');
    expect(sql).toContain('l.lead_owner_id = ?');
    expect(args).toContain(42);
  });

  it('scopes to all assigned companies when no company_id is supplied', async () => {
    prismaMock.cashflowManagementCompany.findMany.mockResolvedValue([{ company_id: 5 }, { company_id: 6 }]);
    prismaMock.$queryRawUnsafe.mockResolvedValue([SAMPLE_LEAD()]);
    const req = makeReq({ query: {}, user: { id: 1, role: 'SalesPerson', cashflow_management_access: true } });
    const res = mockRes();

    await getCashflowReport(req, res);

    const [sql] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('p.company_id IN (5,6)');
  });
});

describe('getCashflowReport — input validation', () => {
  it.each(['company_id', 'product_id', 'vertical_id', 'bde_id'])('rejects a non-numeric %s with 400', async (field) => {
    const req = makeReq({ query: { [field]: 'abc' }, user: { id: 1, role: 'CEO' } });
    const res = mockRes();

    await getCashflowReport(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});

describe('getCashflowReportBdes — BDE filter (bde.md)', () => {
  it('queries only BDEs with at least one milestone via an INNER JOIN on lead_milestone', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: 2, first_name: 'Bob', last_name: 'BDE' }]);
    const req = makeReq({ query: {}, user: { id: 1, role: 'CEO' } });
    const res = mockRes();

    await getCashflowReportBdes(req, res);

    const [sql] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('INNER JOIN lead_milestone lm ON lm.lead_id = l.id');
    expect(sql).toContain("l.quadrant = 'Order Won'");
    expect(res.json).toHaveBeenCalledWith([{ id: 2, first_name: 'Bob', last_name: 'BDE' }]);
  });

  it('applies the product/vertical filters on top of the base scope', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    const req = makeReq({ query: { product_id: '3', vertical_id: '4' }, user: { id: 1, role: 'CEO' } });
    const res = mockRes();

    await getCashflowReportBdes(req, res);

    const [sql, ...args] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('l.product_id = ?');
    expect(sql).toContain('l.vertical_id = ?');
    expect(args).toEqual([3, 4]);
  });

  it('restricts a SalesPerson to their own leads', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    const req = makeReq({ query: {}, user: { id: 1, role: 'SalesPerson' } });
    const res = mockRes();

    await getCashflowReportBdes(req, res);

    const [sql, ...args] = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('l.lead_owner_id = ?');
    expect(args).toContain(1);
  });

  it('returns empty array when a Management Access user requests a company outside their grant', async () => {
    prismaMock.cashflowManagementCompany.findMany.mockResolvedValue([{ company_id: 5 }]);
    const req = makeReq({
      query: { company_id: '7' },
      user: { id: 1, role: 'SalesManager', cashflow_management_access: true },
    });
    const res = mockRes();

    await getCashflowReportBdes(req, res);

    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('rejects a non-numeric company_id with 400', async () => {
    const req = makeReq({ query: { company_id: 'abc' }, user: { id: 1, role: 'CEO' } });
    const res = mockRes();

    await getCashflowReportBdes(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});

describe('getCashflowReport — empty data', () => {
  it('returns empty response when no leads match', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    const req = makeReq({ query: {}, user: { id: 1, role: 'CEO' } });
    const res = mockRes();

    await getCashflowReport(req, res);

    expect(res.json).toHaveBeenCalledWith({ summary: { totalExpected: 0, totalCollected: 0, totalBalance: 0, totalStuck: 0 }, rows: [] });
  });

  it('returns empty response when leads exist but no milestones survive filtering', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([SAMPLE_LEAD()]);
    getFilteredMilestonesForLeads.mockResolvedValue({ milestones: [] });
    const req = makeReq({ query: {}, user: { id: 1, role: 'CEO' } });
    const res = mockRes();

    await getCashflowReport(req, res);

    expect(res.json).toHaveBeenCalledWith({ summary: { totalExpected: 0, totalCollected: 0, totalBalance: 0, totalStuck: 0 }, rows: [] });
  });
});

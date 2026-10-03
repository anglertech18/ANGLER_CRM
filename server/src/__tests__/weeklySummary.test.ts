/**
 * Unit tests for Weekly Summary (sealController) — weekly report CRUD + same-user duplicate scenario.
 *
 * Prisma is fully mocked so no database is required.
 */

import {
  getWeeklyReports,
  createWeeklyReport,
  updateWeeklyReport,
} from '../controllers/sealController';
import { prisma } from '../lib/prisma';

// ─── helpers ────────────────────────────────────────────────────────────────

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeAuthUser(overrides: Partial<{ id: number; role: string }> = {}) {
  return { id: 1, role: 'Admin', ...overrides };
}

function makeReq(overrides: { body?: any; query?: any; params?: any; user?: any } = {}) {
  return {
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    params: overrides.params ?? {},
    user: overrides.user ?? makeAuthUser(),
  } as any;
}

// Cast mocked prisma methods for type-safe assertions
const prismaMock = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /seal/weekly-reports ────────────────────────────────────────────────

describe('getWeeklyReports', () => {
  it('returns all reports for Admin with no filters', async () => {
    const fakeReports = [
      { id: 1, date: new Date('2025-06-01'), user_id: 1, user: { first_name: 'John', last_name: 'Doe' }, details: [] },
      { id: 2, date: new Date('2025-06-08'), user_id: 1, user: { first_name: 'John', last_name: 'Doe' }, details: [] },
    ];
    prismaMock.weeklyReport.findMany.mockResolvedValue(fakeReports);

    const req = makeReq({ query: {}, user: makeAuthUser({ role: 'Admin' }) });
    const res = mockRes();

    await getWeeklyReports(req, res);

    expect(prismaMock.weeklyReport.findMany).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(fakeReports);
  });

  it('restricts SalesPerson to their own reports', async () => {
    prismaMock.weeklyReport.findMany.mockResolvedValue([]);

    const req = makeReq({ query: {}, user: makeAuthUser({ id: 5, role: 'SalesPerson' }) });
    const res = mockRes();

    await getWeeklyReports(req, res);

    const whereClause = prismaMock.weeklyReport.findMany.mock.calls[0][0].where;
    expect(whereClause.user_id).toBe(5);
  });

  it('filters by date range when from_date and to_date are provided', async () => {
    prismaMock.weeklyReport.findMany.mockResolvedValue([]);

    const req = makeReq({
      query: { from_date: '2025-06-01', to_date: '2025-06-30' },
      user: makeAuthUser({ role: 'Admin' }),
    });
    const res = mockRes();

    await getWeeklyReports(req, res);

    const whereClause = prismaMock.weeklyReport.findMany.mock.calls[0][0].where;
    expect(whereClause.date).toBeDefined();
    expect(whereClause.date.gte).toBeDefined();
    expect(whereClause.date.lte).toBeDefined();
  });

  it('filters by user_id when provided as Admin', async () => {
    prismaMock.weeklyReport.findMany.mockResolvedValue([]);

    const req = makeReq({
      query: { user_id: '3' },
      user: makeAuthUser({ role: 'Admin' }),
    });
    const res = mockRes();

    await getWeeklyReports(req, res);

    const whereClause = prismaMock.weeklyReport.findMany.mock.calls[0][0].where;
    expect(whereClause.user_id).toBe(3);
  });

  it('returns 403 if SalesManager requests a non-subordinate user_id', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null); // not a subordinate

    const req = makeReq({
      query: { user_id: '99' },
      user: makeAuthUser({ id: 2, role: 'SalesManager' }),
    });
    const res = mockRes();

    await getWeeklyReports(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 500 on database error', async () => {
    prismaMock.weeklyReport.findMany.mockRejectedValue(new Error('DB failure'));

    const req = makeReq({ user: makeAuthUser({ role: 'Admin' }) });
    const res = mockRes();

    await getWeeklyReports(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── POST /seal/weekly-reports ───────────────────────────────────────────────

describe('createWeeklyReport', () => {
  const baseBody = {
    date: '2025-06-10',
    product_id: '1',
    prev_notes: 'Good progress',
    curr_notes: 'Plan for next week',
    curr_q3_to_q4: '10,11',
    curr_q2_to_q3: '20',
    prev_q4_to_order: '5',
  };

  it('creates a report successfully as Admin', async () => {
    const created = { id: 1, date: new Date('2025-06-10'), user_id: 1 };
    prismaMock.weeklyReport.create.mockResolvedValue(created);

    const req = makeReq({ body: { ...baseBody, user_id: 1 }, user: makeAuthUser({ role: 'Admin' }) });
    const res = mockRes();

    await createWeeklyReport(req, res);

    expect(prismaMock.weeklyReport.create).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it('creates a report with correct details (lead ids and notes)', async () => {
    const created = { id: 2, user_id: 1 };
    prismaMock.weeklyReport.create.mockResolvedValue(created);

    const req = makeReq({ body: baseBody, user: makeAuthUser({ role: 'Admin' }) });
    const res = mockRes();

    await createWeeklyReport(req, res);

    const createArg = prismaMock.weeklyReport.create.mock.calls[0][0];
    const details: any[] = createArg.data.details.create;

    // Expect lead-based detail rows
    expect(details.some((d: any) => d.lead_id === 10 && d.type === 'CURRENT' && d.metric === 'Q3_TO_Q4')).toBe(true);
    expect(details.some((d: any) => d.lead_id === 11 && d.type === 'CURRENT' && d.metric === 'Q3_TO_Q4')).toBe(true);
    expect(details.some((d: any) => d.lead_id === 20 && d.type === 'CURRENT' && d.metric === 'Q2_TO_Q3')).toBe(true);
    expect(details.some((d: any) => d.lead_id === 5  && d.type === 'PREVIOUS' && d.metric === 'Q4_TO_ORDER')).toBe(true);

    // Expect notes rows
    expect(details.some((d: any) => d.metric === 'NOTES' && d.type === 'CURRENT' && d.value === 'Plan for next week')).toBe(true);
    expect(details.some((d: any) => d.metric === 'NOTES' && d.type === 'PREVIOUS' && d.value === 'Good progress')).toBe(true);
  });

  it('uses authUser.id for SalesPerson (ignores body user_id)', async () => {
    prismaMock.weeklyReport.create.mockResolvedValue({ id: 3, user_id: 7 });

    const req = makeReq({
      body: { ...baseBody, user_id: '99' }, // attempted override
      user: makeAuthUser({ id: 7, role: 'SalesPerson' }),
    });
    const res = mockRes();

    await createWeeklyReport(req, res);

    const createArg = prismaMock.weeklyReport.create.mock.calls[0][0];
    expect(createArg.data.user_id).toBe(7); // must be auth user, not 99
  });

  it('returns 403 if SalesManager files for a non-subordinate', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null); // not subordinate

    const req = makeReq({
      body: { ...baseBody, user_id: '99' },
      user: makeAuthUser({ id: 2, role: 'SalesManager' }),
    });
    const res = mockRes();

    await createWeeklyReport(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.weeklyReport.create).not.toHaveBeenCalled();
  });

  // ── KEY SCENARIO: two reports for the same user ────────────────────────────
  it('allows creating TWO reports for the same user (no unique-per-user-date constraint)', async () => {
    const report1 = { id: 10, date: new Date('2025-06-10'), user_id: 1 };
    const report2 = { id: 11, date: new Date('2025-06-10'), user_id: 1 };

    prismaMock.weeklyReport.create
      .mockResolvedValueOnce(report1)
      .mockResolvedValueOnce(report2);

    const user = makeAuthUser({ id: 1, role: 'Admin' });

    // First report
    const req1 = makeReq({ body: { ...baseBody, curr_notes: 'First report' }, user });
    const res1 = mockRes();
    await createWeeklyReport(req1, res1);

    // Second report — same user, same date, different notes
    const req2 = makeReq({ body: { ...baseBody, curr_notes: 'Second report' }, user });
    const res2 = mockRes();
    await createWeeklyReport(req2, res2);

    expect(prismaMock.weeklyReport.create).toHaveBeenCalledTimes(2);
    expect(res1.status).toHaveBeenCalledWith(201);
    expect(res1.json).toHaveBeenCalledWith(report1);
    expect(res2.status).toHaveBeenCalledWith(201);
    expect(res2.json).toHaveBeenCalledWith(report2);
  });

  it('two reports for same user have independent detail sets', async () => {
    prismaMock.weeklyReport.create
      .mockResolvedValueOnce({ id: 20, user_id: 3 })
      .mockResolvedValueOnce({ id: 21, user_id: 3 });

    const user = makeAuthUser({ id: 3, role: 'Admin' });

    const req1 = makeReq({ body: { date: '2025-06-10', curr_q3_to_q4: '100', curr_notes: 'Alpha' }, user });
    const req2 = makeReq({ body: { date: '2025-06-17', curr_q3_to_q4: '200', curr_notes: 'Beta' }, user });
    const res1 = mockRes();
    const res2 = mockRes();

    await createWeeklyReport(req1, res1);
    await createWeeklyReport(req2, res2);

    const details1: any[] = prismaMock.weeklyReport.create.mock.calls[0][0].data.details.create;
    const details2: any[] = prismaMock.weeklyReport.create.mock.calls[1][0].data.details.create;

    // Report 1 contains lead 100, report 2 contains lead 200 — no cross-contamination
    expect(details1.some((d: any) => d.lead_id === 100)).toBe(true);
    expect(details1.some((d: any) => d.lead_id === 200)).toBe(false);

    expect(details2.some((d: any) => d.lead_id === 200)).toBe(true);
    expect(details2.some((d: any) => d.lead_id === 100)).toBe(false);
  });

  it('returns 500 on database error', async () => {
    prismaMock.weeklyReport.create.mockRejectedValue(new Error('Unique constraint failed'));

    const req = makeReq({ body: baseBody, user: makeAuthUser({ role: 'Admin' }) });
    const res = mockRes();

    await createWeeklyReport(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── PUT /seal/weekly-reports/:id ───────────────────────────────────────────

describe('updateWeeklyReport', () => {
  const baseBody = {
    curr_q4_to_order: '5',
    curr_q3_to_q4: '10',
    curr_q2_to_q3: '',
    curr_q1_to_q2: '',
    curr_notes: 'Updated plan',
    prev_q4_to_order: '',
    prev_q3_to_q4: '',
    prev_q2_to_q3: '',
    prev_q1_to_q2: '',
    prev_notes: 'Previous summary',
  };

  it('updates a report successfully as the owner', async () => {
    const existing = { id: 1, user_id: 1 };
    prismaMock.weeklyReport.findUnique.mockResolvedValue(existing);
    prismaMock.weeklyReport.update.mockResolvedValue({ ...existing, id: 1 });

    const req = makeReq({
      body: baseBody,
      params: { id: '1' },
      user: makeAuthUser({ id: 1, role: 'SalesPerson' }),
    });
    const res = mockRes();

    await updateWeeklyReport(req, res);

    expect(prismaMock.weeklyReport.update).toHaveBeenCalledTimes(1);
    const updateArg = prismaMock.weeklyReport.update.mock.calls[0][0];
    expect(updateArg.where.id).toBe(1);
    // deleteMany clears old details before recreating
    expect(updateArg.data.details.deleteMany).toBeDefined();
    expect(Array.isArray(updateArg.data.details.create)).toBe(true);
  });

  it('replaces details completely on update', async () => {
    prismaMock.weeklyReport.findUnique.mockResolvedValue({ id: 2, user_id: 1 });
    prismaMock.weeklyReport.update.mockResolvedValue({ id: 2 });

    const req = makeReq({
      body: { ...baseBody, curr_q3_to_q4: '30,31', curr_notes: 'New notes' },
      params: { id: '2' },
      user: makeAuthUser({ id: 1 }),
    });
    const res = mockRes();

    await updateWeeklyReport(req, res);

    const updateArg = prismaMock.weeklyReport.update.mock.calls[0][0];
    const details: any[] = updateArg.data.details.create;

    expect(details.some((d: any) => d.lead_id === 30 && d.metric === 'Q3_TO_Q4')).toBe(true);
    expect(details.some((d: any) => d.lead_id === 31 && d.metric === 'Q3_TO_Q4')).toBe(true);
    expect(details.some((d: any) => d.metric === 'NOTES' && d.value === 'New notes')).toBe(true);
  });

  it('returns 404 when report does not exist', async () => {
    prismaMock.weeklyReport.findUnique.mockResolvedValue(null);

    const req = makeReq({
      body: baseBody,
      params: { id: '999' },
      user: makeAuthUser(),
    });
    const res = mockRes();

    await updateWeeklyReport(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when non-admin updates another user\'s report', async () => {
    prismaMock.weeklyReport.findUnique.mockResolvedValue({ id: 1, user_id: 99 });
    prismaMock.user.findFirst.mockResolvedValue(null); // not a subordinate either

    const req = makeReq({
      body: baseBody,
      params: { id: '1' },
      user: makeAuthUser({ id: 2, role: 'SalesManager' }),
    });
    const res = mockRes();

    await updateWeeklyReport(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('Admin can update any user\'s report', async () => {
    prismaMock.weeklyReport.findUnique.mockResolvedValue({ id: 5, user_id: 42 });
    prismaMock.weeklyReport.update.mockResolvedValue({ id: 5 });

    const req = makeReq({
      body: baseBody,
      params: { id: '5' },
      user: makeAuthUser({ id: 1, role: 'Admin' }),
    });
    const res = mockRes();

    await updateWeeklyReport(req, res);

    expect(prismaMock.weeklyReport.update).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ id: 5 });
  });
});

// Regression test: the monthly consolidated digest must ONLY bundle
// auto-email policy reminders (EMAIL / EMAIL_DIRECT / BOTH with no
// user-selected template). Drafts, call tasks, WhatsApp, in-app, and
// steps with an explicit template stay in the per-step flow.

const prismaMock: any = {
  renewalReminder: { findMany: jest.fn(), update: jest.fn() },
  clientCompany: { findUnique: jest.fn() },
  digestNotification: { upsert: jest.fn() },
  user: { findMany: jest.fn() },
};

const queueNotificationMock = jest.fn().mockResolvedValue(undefined);

jest.mock('../lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('../services/notificationOutboxService', () => ({
  queueNotification: (...args: any[]) => queueNotificationMock(...args),
}));

const generateOrderFormPDFMock = jest.fn().mockResolvedValue({ filePath: 'C:/tmp/digest.pdf' });
jest.mock('../utils/orderFormPdfGenerator', () => ({
  generateOrderFormPDF: (...args: any[]) => generateOrderFormPDFMock(...args),
}));

import { processConsolidatedMonthlyReminders } from '../services/reminderConsolidationService';

function buildReminder(id: number, overrides: any) {
  return {
    id,
    status: 'PENDING',
    due_date: new Date('2026-09-01'),
    channel: 'EMAIL',
    template_id: null,
    cycle: {
      service_instance: {
        identifier: `svc-${id}`,
        amount_due: 1000,
        activation_date: new Date('2025-09-30'),
        expiry_date: new Date('2026-09-30'),
        duration_value: 12,
        duration_unit: 'Months',
        service_master: { name: `Service ${id}`, category: { name: 'DOMAIN' } },
        provider: { name: 'Provider' },
        renewal_account: {
          id: 7,
          order_number: 'ORD-1',
          client_company_id: 99,
          company: { name: 'ANGLER Technologies' },
          account_manager: { first_name: 'Mgr', email: 'mgr@angler.com' },
          renewal_executive: { first_name: 'Exec', email: 'exec@angler.com' },
          client_company: {
            name: 'ClientCo',
            renewal_contacts: [{ email: 'contact@clientco.com', is_active: true }],
          },
        },
      },
    },
    ...overrides,
  };
}

describe('consolidated digest channel/template filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.clientCompany.findUnique.mockResolvedValue({ id: 99, name: 'ClientCo' });
    prismaMock.digestNotification.upsert.mockResolvedValue({});
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.renewalReminder.update.mockResolvedValue({});
  });

  it('digests an EMAIL reminder without template_id', async () => {
    prismaMock.renewalReminder.findMany.mockResolvedValue([buildReminder(1, {})]);

    const processed = await processConsolidatedMonthlyReminders();

    expect(processed).toBe(1);
    expect(queueNotificationMock).toHaveBeenCalledTimes(1);
    expect(queueNotificationMock.mock.calls[0][0].channel).toBe('EMAIL');
    expect(prismaMock.renewalReminder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'SENT', action_type: 'CONSOLIDATED_DIGEST' }),
      })
    );
  });

  it('does NOT digest an EMAIL reminder that has a user-selected template_id', async () => {
    prismaMock.renewalReminder.findMany.mockResolvedValue([buildReminder(2, { template_id: 42 })]);

    const processed = await processConsolidatedMonthlyReminders();

    expect(processed).toBe(0);
    expect(queueNotificationMock).not.toHaveBeenCalled();
    expect(prismaMock.renewalReminder.update).not.toHaveBeenCalled();
  });

  it.each(['PHONE', 'EMAIL_DRAFT', 'WHATSAPP', 'IN_APP', 'CALL_TASK'])(
    'does NOT digest a %s reminder (reserved for per-step flow)',
    async (channel) => {
      prismaMock.renewalReminder.findMany.mockResolvedValue([buildReminder(3, { channel })]);

      const processed = await processConsolidatedMonthlyReminders();

      expect(processed).toBe(0);
      expect(queueNotificationMock).not.toHaveBeenCalled();
      expect(prismaMock.renewalReminder.update).not.toHaveBeenCalled();
    }
  );

  it('digests only the digestable reminders when mixed channels/templates are due', async () => {
    prismaMock.renewalReminder.findMany.mockResolvedValue([
      buildReminder(1, {}),                                  // EMAIL, no template -> digest
      buildReminder(2, { template_id: 42 }),                 // EMAIL + template -> skip
      buildReminder(3, { channel: 'EMAIL_DIRECT' }),         // EMAIL_DIRECT, no template -> digest
      buildReminder(4, { channel: 'PHONE' }),                // -> skip
      buildReminder(5, { channel: 'EMAIL_DRAFT' }),          // -> skip
    ]);

    const processed = await processConsolidatedMonthlyReminders();

    expect(processed).toBe(2);
    expect(queueNotificationMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.renewalReminder.update).toHaveBeenCalledTimes(2);
    // earliest reminder is the primary CONSOLIDATED_DIGEST, the other is COMBINED_SENT
    expect(prismaMock.renewalReminder.update.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ action_type: 'CONSOLIDATED_DIGEST' }),
      })
    );
    expect(prismaMock.renewalReminder.update.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        where: { id: 3 },
        data: expect.objectContaining({ action_type: 'COMBINED_SENT' }),
      })
    );
  });
});

import fs from 'fs';
import path from 'path';

const prismaMock: any = {
  renewalReminder: { findMany: jest.fn(), update: jest.fn() },
  applicationNotification: { findFirst: jest.fn(), create: jest.fn() },
  renewalContact: { findMany: jest.fn() },
  renewalFollowUpChannelAction: { findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  renewalFollowUpTask: { update: jest.fn() },
  renewalCommunicationEvent: { create: jest.fn() },
  renewalFollowUpLog: { create: jest.fn() },
  renewalServiceInstance: { update: jest.fn() },
  notificationOutbox: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
};
prismaMock.$transaction = jest.fn((callback: any) => callback(prismaMock));

jest.mock('../lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('../services/renewalCycleService', () => ({ refreshCycleStatuses: jest.fn() }));
jest.mock('../services/reminderConsolidationService', () => ({ processConsolidatedMonthlyReminders: jest.fn() }));
jest.mock('../services/cronLockService', () => ({
  acquireCronLock: jest.fn(), releaseCronLock: jest.fn(), generateInstanceOwnerId: jest.fn(() => 'test'),
}));
jest.mock('../services/renewalDualWriteService', () => ({ dualWriteReminderCreated: jest.fn() }));
jest.mock('../utils/renewalAudit', () => ({ logAudit: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../controllers/smtpConfigController', () => ({ getActiveSmtpConfigDecrypted: jest.fn() }));

const completeFromOutbox = jest.fn().mockResolvedValue(undefined);
const failFromOutbox = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/renewalFollowUpChannelActionService', () => ({
  completeChannelActionFromOutbox: (...args: any[]) => completeFromOutbox(...args),
  failChannelActionFromOutbox: (...args: any[]) => failFromOutbox(...args),
}));

import { processDueReminders } from '../cron/renewalReminderCron';
import { processOutbox } from '../services/notificationOutboxService';
import { getActiveSmtpConfigDecrypted } from '../controllers/smtpConfigController';
import { completeFollowUp } from '../controllers/renewalFollowUpController';

describe('renewal delivery and user logging regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MOCK_EMAIL_SEND;
  });

  it('queues automatic email to the customer and links its channel action', async () => {
    prismaMock.renewalReminder.findMany
      .mockResolvedValueOnce([{
        id: 81,
        cycle_id: 60,
        step_number: 1,
        offset_days: 30,
        action_type: 'SEND_EMAIL',
        channel: 'BOTH',
        assigned_user_id: 321,
        assigned_user: { id: 321, first_name: 'Renewal', last_name: 'Owner', email: 'internal@example.com' },
        template: { id: 8, subject: 'Renewal', body_html: 'Hello {{client_name}}' },
        cycle: {
          service_instance: {
            id: 50,
            identifier: 'customer.in',
            expiry_date: new Date('2026-10-30T00:00:00.000Z'),
            amount_due: 1000,
            customer_contact: { id: 4, name: 'Customer Contact', email: 'customer@example.com', email_consent: true, mobile: '1000000000', whatsapp_consent: true },
            provider: null,
            service_master: { name: 'Domain Renewal', category: { code: 'DOMAIN' } },
            renewal_account: {
              id: 10,
              client_company_id: 11,
              company_id: 1,
              order_number: 'RN-1',
              client_company: { name: 'Customer Ltd' },
              company: { id: 1, name: 'Angler' },
            },
          },
        },
      }])
      .mockResolvedValueOnce([]);
    prismaMock.renewalContact.findMany.mockResolvedValue([{
      id: 4, name: 'Customer Contact', email: 'customer@example.com', role: 'PRIMARY', email_consent: true,
    }]);
    prismaMock.renewalFollowUpChannelAction.findFirst.mockResolvedValue({ id: 701, created_by_id: 321, execution_mode: 'AUTOMATIC' });
    prismaMock.notificationOutbox.findFirst.mockResolvedValue(null);
    prismaMock.notificationOutbox.create.mockResolvedValue({ id: 900 });

    await processDueReminders();

    expect(prismaMock.notificationOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipient: 'customer@example.com',
        channel_action_id: 701,
        mapping_context: expect.stringContaining('"user_id":321'),
      }),
    });
    expect(prismaMock.notificationOutbox.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ recipient: 'internal@example.com' }),
    });
    expect(prismaMock.notificationOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        channel: 'WHATSAPP',
        recipient: '1000000000',
        channel_action_id: 701,
        mapping_context: expect.stringContaining('"channel_action_id":701'),
      }),
    });
  });

  it('does not automatically queue approval-required actions', async () => {
    prismaMock.renewalReminder.findMany
      .mockResolvedValueOnce([{
        id: 82, cycle_id: 61, step_number: 1, offset_days: 15,
        action_type: 'SEND_EMAIL', channel: 'EMAIL', assigned_user_id: 321,
        assigned_user: { id: 321, first_name: 'Owner', email: 'internal@example.com' },
        template: { id: 8, subject: 'Renewal', body_html: 'Hello' },
        cycle: { service_instance: {
          id: 51, expiry_date: new Date('2026-10-30'), amount_due: 1000,
          customer_contact: { email: 'customer@example.com', email_consent: true },
          provider: null, service_master: { name: 'Domain', category: { code: 'DOMAIN' } },
          renewal_account: { id: 11, client_company_id: 12, company_id: 1, client_company: { name: 'Customer' }, company: { id: 1, name: 'Angler' } },
        } } },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.renewalContact.findMany.mockResolvedValue([{ name: 'Customer', email: 'customer@example.com', role: 'PRIMARY', email_consent: true }]);
    prismaMock.renewalFollowUpChannelAction.findFirst.mockResolvedValue({ id: 702, execution_mode: 'APPROVAL_REQUIRED' });

    await processDueReminders();

    expect(prismaMock.notificationOutbox.create).not.toHaveBeenCalled();
  });

  it('records successful outbox delivery through the channel action service', async () => {
    process.env.MOCK_EMAIL_SEND = 'true';
    prismaMock.notificationOutbox.findMany.mockResolvedValue([{
      id: 900,
      channel: 'EMAIL',
      recipient: 'customer@example.com',
      subject: 'Renewal',
      rendered_body: 'Body',
      attempt_count: 0,
      channel_action_id: 701,
      mapping_context: JSON.stringify({ user_id: 321 }),
    }]);
    prismaMock.notificationOutbox.updateMany.mockResolvedValue({ count: 1 });
    (getActiveSmtpConfigDecrypted as jest.Mock).mockResolvedValue(null);

    await processOutbox();

    expect(completeFromOutbox).toHaveBeenCalledWith(701, expect.stringMatching(/^MOCK_SMTP_/), 321);
  });

  it('atomically claims an outbox row and skips delivery when another worker owns it', async () => {
    process.env.MOCK_EMAIL_SEND = 'true';
    prismaMock.notificationOutbox.findMany.mockResolvedValue([{
      id: 905, channel: 'EMAIL', recipient: 'customer@example.com', rendered_body: 'Body',
      attempt_count: 0, channel_action_id: 705, mapping_context: '{}',
    }]);
    prismaMock.notificationOutbox.updateMany.mockResolvedValue({ count: 0 });

    await processOutbox();

    expect(completeFromOutbox).not.toHaveBeenCalled();
    expect(prismaMock.notificationOutbox.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENT' }),
    }));
  });

  it('keeps provider-successful messages SENT when action logging fails', async () => {
    process.env.MOCK_EMAIL_SEND = 'true';
    prismaMock.notificationOutbox.findMany.mockResolvedValue([{
      id: 906, channel: 'EMAIL', recipient: 'customer@example.com', rendered_body: 'Body',
      attempt_count: 0, channel_action_id: 706, mapping_context: JSON.stringify({ user_id: 321 }),
    }]);
    prismaMock.notificationOutbox.updateMany.mockResolvedValue({ count: 1 });
    completeFromOutbox.mockRejectedValueOnce(new Error('action log failed'));

    await processOutbox();

    expect(prismaMock.notificationOutbox.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENT' }),
    }));
    expect(prismaMock.notificationOutbox.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'QUEUED' }),
    }));
  });

  it('records only final outbox failure through the channel action service', async () => {
    prismaMock.notificationOutbox.findMany.mockResolvedValue([{
      id: 901,
      channel: 'EMAIL',
      recipient: 'customer@example.com',
      subject: 'Renewal',
      rendered_body: 'Body',
      attempt_count: 2,
      channel_action_id: 702,
      mapping_context: JSON.stringify({ user_id: 322 }),
    }]);
    prismaMock.notificationOutbox.updateMany.mockResolvedValue({ count: 1 });
    (getActiveSmtpConfigDecrypted as jest.Mock).mockRejectedValue(new Error('SMTP unavailable'));

    await processOutbox();

    expect(failFromOutbox).toHaveBeenCalledWith(702, 'SMTP unavailable', 322);
  });

  it('submits the call result contract from both follow-up forms', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../client/src/pages/renewals/RenewalFollowUps.tsx'),
      'utf8'
    );

    expect(source.match(/next_follow_up_date:\s*nextFollowUpDate/g)).toHaveLength(2);
    expect(source.match(/contacted:\s*true/g)).toHaveLength(2);
    expect(source).not.toContain('next_followup_date: nextFollowUpDate');
    // Both forms should use the notes || customerResponse fallback
    expect(source.match(/notes:\s*notes \|\| customerResponse/g)).toHaveLength(2);
  });

  it('persists the authenticated user and call details in the follow-up log', async () => {
    prismaMock.renewalReminder.findUnique = jest.fn().mockResolvedValue({
      id: 81,
      cycle: {
        service_instance_id: 50,
        service_instance: { renewal_account_id: 10 },
      },
    });
    prismaMock.renewalReminder.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prismaMock.renewalFollowUpChannelAction.findMany.mockResolvedValue([{ follow_up_task_id: 700 }]);
    prismaMock.renewalFollowUpChannelAction.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.renewalFollowUpLog.create.mockResolvedValue({ id: 1001 });
    const req: any = {
      params: { reminderId: '81' },
      body: {
        outcome_code: 'CALLBACK',
        contacted: true,
        notes: 'Customer asked for a callback',
        next_follow_up_date: '2026-10-02',
      },
      user: { id: 321 },
      ip: '127.0.0.1',
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await completeFollowUp(req, res);

    expect(prismaMock.renewalReminder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ completed_by_id: 321 }),
    }));
    expect(prismaMock.renewalFollowUpLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        logged_by_id: 321,
        contacted: true,
        next_follow_up_date: new Date('2026-10-02'),
      }),
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.renewalFollowUpChannelAction.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ completed_by_id: 321, status: 'COMPLETED' }),
    }));
  });

  it('rejects a duplicate manual completion without creating another log', async () => {
    prismaMock.renewalReminder.findUnique = jest.fn().mockResolvedValue({
      id: 81, cycle: { service_instance_id: 50, service_instance: { renewal_account_id: 10 } },
    });
    prismaMock.renewalReminder.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const req: any = { params: { reminderId: '81' }, body: { outcome_code: 'CALLBACK' }, user: { id: 321 } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await completeFollowUp(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(prismaMock.renewalFollowUpLog.create).not.toHaveBeenCalled();
  });
});

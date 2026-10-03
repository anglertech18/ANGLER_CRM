import { prisma } from '../lib/prisma';
import { buildFollowUpQueueWhere } from '../controllers/renewalFollowUpController';
import {
  approveEmailForChannelAction,
  previewEmailForChannelAction,
  queueEmailForChannelAction,
  queueWhatsAppForChannelAction,
} from '../services/renewalFollowUpChannelActionService';
import { queueNotification } from '../services/notificationOutboxService';

jest.mock('../utils/renewalAudit', () => ({ logAudit: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/renewalCommunicationEventService', () => ({
  logChannelActionStarted: jest.fn().mockResolvedValue(undefined),
  logChannelActionCompleted: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/notificationOutboxService', () => ({
  queueNotification: jest.fn().mockResolvedValue(900),
}));

const prismaMock = prisma as any;

describe('renewal follow-up regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a MySQL-compatible search filter without Prisma mode', () => {
    const where = buildFollowUpQueueWhere({
      tab: 'today',
      search: 'Janatics',
      user: { id: 1, role: 'Admin' },
      now: new Date('2026-09-29T10:00:00.000Z'),
    });

    expect(JSON.stringify(where)).toContain('Janatics');
    expect(JSON.stringify(where)).not.toContain('"mode"');
  });

  it('uses an indexed reminder id and bypasses tab/search filters for a direct review link', () => {
    const where = buildFollowUpQueueWhere({
      tab: 'today',
      search: 'ignored',
      reminderId: '172',
      user: { id: 1, role: 'Admin' },
      now: new Date('2026-09-29T10:00:00.000Z'),
    });

    expect(where).toEqual({ id: 172 });
  });

  it('supports an explicit unassigned executive filter', () => {
    const where = buildFollowUpQueueWhere({
      tab: 'upcoming',
      assignedUser: 'UNASSIGNED',
      user: { id: 1, role: 'Admin' },
      now: new Date('2026-09-29T10:00:00.000Z'),
    });

    expect(where.assigned_user_id).toBeNull();
  });

  it('loads preview data through the follow_up_task relation and prefers the service category template', async () => {
    const action = {
      id: 22,
      channel: 'EMAIL',
      status: 'PENDING',
      renewal_account_id: 10,
      service_instance_id: 50,
      cycle_id: 60,
      reminder_id: null,
      follow_up_task_id: 70,
      template_id: null,
      recipient_address: 'kannan.p@angleritech.com',
      template: null,
      recipient_contact: null,
      follow_up_task: {
        service_instance_id: 50,
        renewal_account: { client_company: { name: 'Janatics India Pvt Ltd', email: null } },
        service_instance: {
          identifier: 'janatics.in',
          amount_due: 2200,
          expiry_date: new Date('2026-10-28T00:00:00.000Z'),
          service_master: {
            name: 'Domain Renewal',
            category: { code: 'DOMAIN' },
          },
        },
        cycle: { name: 'Annual Renewal' },
      },
    };
    prismaMock.renewalFollowUpChannelAction.findUnique.mockResolvedValue(action);
    prismaMock.renewalNotificationTemplate.findFirst.mockResolvedValue({
      id: 8,
      name: 'Domain Reminder',
      version: 3,
      subject: '{{service_name}} - {{identifier}}',
      body_html: 'Dear {{customer_name}}',
    });

    const preview = await previewEmailForChannelAction(22);

    expect(prismaMock.renewalFollowUpChannelAction.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ follow_up_task: expect.any(Object) }),
      })
    );
    expect(prismaMock.renewalNotificationTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category_code: 'DOMAIN' }),
      })
    );
    expect(preview.subject).toBe('Domain Renewal - janatics.in');
    expect(preview.customer_name).toBe('Janatics India Pvt Ltd');
  });

  it('queues the rendered category email instead of an empty generic payload', async () => {
    const action = {
      id: 22,
      channel: 'EMAIL',
      status: 'PENDING',
      renewal_account_id: 10,
      service_instance_id: 50,
      cycle_id: 60,
      reminder_id: null,
      follow_up_task_id: 70,
      template_id: null,
      recipient_address: 'kannan.p@angleritech.com',
      template: null,
      recipient_contact: null,
      follow_up_task: {
        renewal_account_id: 10,
        service_instance_id: 50,
        renewal_account: { client_company_id: 11, client_company: { name: 'Janatics India Pvt Ltd' } },
        service_instance: {
          identifier: 'janatics.in', amount_due: 2200,
          service_master: { name: 'Domain Renewal', category: { code: 'DOMAIN' } },
        },
        cycle: { name: 'Annual Renewal' },
      },
    };
    prismaMock.renewalFollowUpChannelAction.findUnique.mockResolvedValue(action);
    prismaMock.renewalFollowUpChannelAction.update.mockResolvedValue(action);
    prismaMock.renewalNotificationTemplate.findFirst.mockResolvedValue({
      id: 8, name: 'Domain Reminder', version: 3,
      subject: '{{service_name}} - {{identifier}}', body_html: 'Dear {{customer_name}}',
    });

    await queueEmailForChannelAction(22, 1);

    expect(queueNotification).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Domain Renewal - janatics.in',
      renderedBody: expect.stringContaining('Dear Janatics India Pvt Ltd'),
      templateId: 8,
    }));
  });

  it('queues the rendered category WhatsApp message', async () => {
    const action = {
      id: 23,
      channel: 'WHATSAPP',
      status: 'PENDING',
      renewal_account_id: 10,
      service_instance_id: 50,
      cycle_id: 60,
      reminder_id: null,
      follow_up_task_id: 71,
      template_id: null,
      recipient_address: '1000000000',
      template: null,
      recipient_contact: { mobile: '1000000000', whatsapp_consent: true },
      follow_up_task: {
        renewal_account: { client_company_id: 11, client_company: { name: 'Janatics India Pvt Ltd' } },
        service_instance: {
          service_master: { name: 'Domain Renewal', category: { code: 'DOMAIN' } },
        },
        cycle: { name: 'Annual Renewal' },
      },
    };
    prismaMock.renewalFollowUpChannelAction.findUnique.mockResolvedValue(action);
    prismaMock.renewalFollowUpChannelAction.update.mockResolvedValue(action);
    prismaMock.renewalNotificationTemplate.findFirst.mockResolvedValue({
      id: 9, name: 'Domain WhatsApp', version: 1,
      body_html: '<strong>{{service_name}}</strong> for {{customer_name}}',
    });

    await queueWhatsAppForChannelAction(23, 1);

    expect(queueNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipient: '1000000000',
      renderedBody: '*Domain Renewal* for Janatics India Pvt Ltd',
      templateId: 9,
    }));
  });

  it('does not queue WhatsApp when the customer number is missing', async () => {
    const action = {
      id: 24,
      channel: 'WHATSAPP',
      status: 'PENDING',
      renewal_account_id: 10,
      service_instance_id: 50,
      cycle_id: 60,
      reminder_id: null,
      follow_up_task_id: 72,
      template_id: null,
      recipient_address: null,
      template: null,
      recipient_contact: { mobile: null, whatsapp_consent: true },
      follow_up_task: {
        renewal_account: { client_company_id: 11, client_company: { name: 'Janatics India Pvt Ltd', phone: null } },
        service_instance: {
          service_master: { name: 'Domain Renewal', category: { code: 'DOMAIN' } },
        },
        cycle: { name: 'Annual Renewal' },
      },
    };
    prismaMock.renewalFollowUpChannelAction.findUnique.mockResolvedValue(action);
    prismaMock.renewalNotificationTemplate.findFirst.mockResolvedValue({
      id: 9, name: 'Domain WhatsApp', version: 1, body_html: 'Renewal reminder',
    });

    await expect(queueWhatsAppForChannelAction(24, 1)).rejects.toThrow('RECIPIENT_MISSING');
    expect(queueNotification).not.toHaveBeenCalled();
  });

  it('accepts APPROVAL_REQUIRED email actions and preserves the approving user', async () => {
    const action = {
      id: 25,
      channel: 'EMAIL',
      execution_mode: 'APPROVAL_REQUIRED',
      status: 'PENDING',
      renewal_account_id: 10,
      service_instance_id: 50,
      cycle_id: 60,
      reminder_id: 80,
      follow_up_task_id: 70,
      template_id: 8,
      recipient_address: 'customer@example.com',
      template: {
        id: 8,
        name: 'Approval Email',
        version: 1,
        subject: 'Renewal notice',
        body_html: 'Dear {{customer_name}}',
      },
      recipient_contact: null,
      follow_up_task: {
        renewal_account: { client_company_id: 11, client_company: { name: 'Customer Ltd' } },
        service_instance: {
          service_master: { name: 'Domain Renewal', category: { code: 'DOMAIN' } },
        },
        cycle: { name: 'Annual Renewal' },
      },
    };
    prismaMock.renewalFollowUpChannelAction.findUnique.mockResolvedValue(action);
    prismaMock.renewalFollowUpChannelAction.update.mockResolvedValue(action);

    await expect(queueEmailForChannelAction(25, 321)).rejects.toThrow(
      'requires approval before it can be queued'
    );
    expect(queueNotification).not.toHaveBeenCalled();

    await approveEmailForChannelAction(25, 321);

    expect(queueNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipient: 'customer@example.com',
      channelActionId: 25,
      mappingContext: expect.stringContaining('"user_id":321'),
    }));
  });
});

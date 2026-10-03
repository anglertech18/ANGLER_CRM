import { prisma } from '../lib/prisma';
import { seedBrandProfiles } from './seedBrandProfiles';
import { seedOrderFormTemplate } from './seedOrderFormTemplate';
import { seedTrinetraOrderFormTemplate } from './seedTrinetraOrderFormTemplate';
import { ensureResponsiveEmailHtml } from '../utils/emailHtmlCompatibility';

const TRINETRA_BANK_HTML = `
  <p><strong>Bank details for online payment transfer:</strong></p>
  <table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-size:11px;">
    <tr style="background:#d9d9d9;"><th colspan="2">TRINETRA BANK DETAILS</th></tr>
    <tr><td width="30%">Company Name</td><td>TRINETRA Wireless Pvt Ltd</td></tr>
    <tr><td>Name of Bank</td><td>State Bank of India</td></tr>
    <tr><td>Bank Branch Name</td><td>Red Fields Branch</td></tr>
    <tr><td>Branch Address</td><td>1114C, Trichy Road, Coimbatore - 641 045. India.</td></tr>
    <tr><td>IFSC CODE</td><td>SBIN0006577</td></tr>
    <tr><td>Account Number</td><td>30995705595</td></tr>
  </table>
  <p><strong>Offline payment:</strong> You can make the payment via Cheque or Demand draft in the name of TRINETRA Wireless Pvt Ltd.</p>
`;

const serviceTableHtml = (serviceFallback: string) => `
  <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:11px;text-align:center;">
    <tr style="background:#f2f2f2;">
      <th>Service</th><th>Device Id</th><th>No. of Device</th><th>Unit Cost (Rs.)</th>
      <th>Subtotal (Rs.)</th><th>GST @18%</th><th>Total (Rs.)</th><th>Expiry Date</th><th>Term</th><th>Days To Expiry</th>
    </tr>
    <tr>
      <td align="left">{{service_name}}</td>
      <td>{{device_id}}</td>
      <td>{{quantity}}</td>
      <td>{{unit_cost}}</td>
      <td>{{subtotal}}</td>
      <td>{{gst}}</td>
      <td>{{total}}</td>
      <td style="color:red;font-weight:bold;">{{expiry_date}}</td>
      <td>{{term}}</td>
      <td style="color:red;font-weight:bold;">{{days_left}} Day(s)</td>
    </tr>
  </table>
  <div style="display:none">${serviceFallback}</div>
`;

const trinetraShell = (title: string, subtitle: string, body: string) => `
  <div style="max-width:750px;margin:0 auto;font-family:Arial,sans-serif;border:1px solid #ccc;padding:15px;background:#fff;color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="{{logo_url}}" alt="Trinetra" style="max-height:45px;display:block;" />
          <div style="font-weight:bold;font-size:18px;color:#002060;">trinetra</div>
          <div style="font-size:10px;color:#555;">Fleet Management, Mobility & IoT Solutions</div>
        </td>
        <td align="right" style="font-size:12px;color:#002060;">
          <a href="mailto:renewals@trinetrawireless.com">renewals@trinetrawireless.com</a><br/>
          <strong>+91-422-2321307</strong>
        </td>
      </tr>
    </table>
    <div style="background:#0f2942;color:#fff;padding:12px;margin-top:10px;">
      <h2 style="margin:0;font-size:18px;">${title}</h2>
      <h3 style="margin:4px 0 0 0;font-size:16px;">${subtitle}</h3>
    </div>
    ${body}
  </div>
`;

const mailTemplates = [
  {
    name: 'Trinetra Renewal Reminder - FMS License',
    category_code: 'REMINDER',
    subject: 'Renewal Reminder: Your FMS Software License is about to expire',
    body_html: trinetraShell('Renewal Reminder', 'Your FMS Software License is about to expire.', `
      <p>Dear <strong>{{contact_person}}</strong>,</p>
      <p><strong>M/s. {{company_name}}</strong></p>
      <p>FMS software license details are listed below and due for renewal within next <strong>{{days_left}} Days</strong>.</p>
      ${serviceTableHtml('Trinetra FMS Software License Usage Charges for Vehicle Tracking Device')}
      <p>Please find the attached Order Form for Trinetra FMS Software License Renewal and kindly request you to send the order form duly signed along with the payment.</p>
      ${TRINETRA_BANK_HTML}
      <p><strong>What if I don't renew the services?</strong><br/>
      1. Your Trinetra FMS account will be deactivated automatically and you may not be able to view the application.<br/>
      2. If the software license has not been renewed before the due date, your license will be deactivated and reactivation charges may apply.</p>
    `),
  },
  {
    name: 'Trinetra Renewal Reminder - iWay License',
    category_code: 'REMINDER',
    subject: 'Renewal Reminder: Your Trinetra iWay services are about to expire',
    body_html: trinetraShell('Renewal Reminder', 'Your services are about to expire.', `
      <p>Dear <strong>{{contact_person}}</strong>,</p>
      <p>The services listed below are due for renewal within next <strong>{{days_left}} Days</strong>.</p>
      ${serviceTableHtml('Trinetra iWay Software License Usage Charges for Vehicle Tracking Device')}
      <p>Please find the attached Order Form for Trinetra iWay Software License Renewal and kindly request you to send the order form duly signed along with the payment.</p>
      ${TRINETRA_BANK_HTML}
      <p><strong>Kindly do the needful.</strong></p>
      <p><strong>What if I don't renew the services?</strong><br/>
      1. Your Trinetra iWay account will be deactivated automatically and you may not be able to view the application.<br/>
      2. If the software license has not been renewed before the due date, your license will be deactivated and reactivation charges may apply.</p>
    `),
  },
  {
    name: 'Trinetra Renewal Deactivation Notice',
    category_code: 'URGENT',
    subject: 'Deactivation Notice: Your services are about to deactivate',
    body_html: trinetraShell('Deactivation Notice', 'Your services are about to deactivate.', `
      <p>Dear <strong>{{contact_person}}</strong>,</p>
      <p>The services listed below will be deactivated soon. Kindly renew them to avoid deactivation.</p>
      ${serviceTableHtml('Trinetra service renewal')}
      ${TRINETRA_BANK_HTML}
      <p><strong>What if I don't renew the services?</strong><br/>
      1. Your Trinetra account will be deactivated automatically and you may not be able to view the application.<br/>
      2. If the software license has not been renewed before the due date, reactivation charges may apply.</p>
    `),
  },
  {
    name: 'Trinetra Renewal Suspension Notice',
    category_code: 'CRITICAL',
    subject: 'URGENT: Suspension Notice - Your Trinetra GPS software license has been suspended',
    body_html: trinetraShell('Suspension Notice', 'Your Trinetra GPS vehicle tracking software license has been suspended.', `
      <p>Dear <strong>{{contact_person}}</strong>,</p>
      <p>This is to inform you that your service has now been suspended.</p>
      <p>The details of the suspended service are as given below:</p>
      <p><strong>Product/Service:</strong> {{service_name}}<br/>
      <strong>Due Date:</strong> {{expiry_date}}<br/>
      <strong>Suspension Reason:</strong> Due to Non Payment</p>
      <p><strong>How do I reactivate my service?</strong><br/>
      In order to get this service reactivated, kindly drop a mail to
      <a href="mailto:renewals@trinetrawireless.com">renewals@trinetrawireless.com</a>
      as soon as possible and confirm payment expected date for renewal.</p>
      <p style="color:#b91c1c;"><strong>IMPORTANT:</strong> If your services are not reactivated, we may remove your data from our system and will not be responsible for data loss thereafter.</p>
      <table width="100%" style="margin-top:20px;"><tr>
        <td width="48%" style="border:1px solid #333;padding:10px;text-align:center;font-weight:bold;">Call: 91-0422-2321307</td>
        <td width="4%"></td>
        <td width="48%" style="border:1px solid #333;padding:10px;text-align:center;font-weight:bold;">e-mail: renewals@trinetrawireless.com</td>
      </tr></table>
    `),
  },
];

const variables = JSON.stringify([
  'logo_url',
  'contact_person',
  'company_name',
  'service_name',
  'device_id',
  'quantity',
  'unit_cost',
  'subtotal',
  'gst',
  'total',
  'expiry_date',
  'term',
  'days_left',
]);

async function findCompany(name: string) {
  return (prisma as any).company.findFirst({
    where: { name, is_active: true },
    select: { id: true, name: true, order_form_template_id: true },
  });
}

async function findAnglerCompany() {
  return (prisma as any).company.findFirst({
    where: {
      is_active: true,
      OR: [
        { name: 'Angler Technologies' },
        { name: 'ANGLER' },
        { name: { contains: 'Angler' } },
      ],
    },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, order_form_template_id: true },
  });
}

async function findTemplate(name: string) {
  return (prisma as any).renewalNotificationTemplate.findFirst({ where: { name } });
}

async function upsertTemplate(template: typeof mailTemplates[number], brandProfileId: number | null) {
  const existing = await findTemplate(template.name);
  const data = {
    category_code: template.category_code,
    channel: 'EMAIL',
    subject: template.subject,
    body_html: ensureResponsiveEmailHtml(template.body_html),
    body_text: template.body_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    compiled_html: ensureResponsiveEmailHtml(template.body_html),
    variables,
    brand_profile_id: brandProfileId,
    is_published: true,
    is_active: true,
  };

  if (existing) {
    return (prisma as any).renewalNotificationTemplate.update({
      where: { id: existing.id },
      data,
    });
  }

  return (prisma as any).renewalNotificationTemplate.create({
    data: { name: template.name, ...data },
  });
}

async function upsertPolicy(
  name: string,
  companyId: number,
  serviceCategoryId: number | null,
  serviceMasterId: number | null,
  steps: Array<{ step_number: number; offset_days: number; template_id: number | null; attach_order_form: boolean }>
) {
  const existing = await (prisma as any).renewalReminderPolicy.findFirst({ where: { name } });
  const policy = existing
    ? await (prisma as any).renewalReminderPolicy.update({
        where: { id: existing.id },
        data: {
          company_id: companyId,
          service_category_id: serviceCategoryId,
          service_master_id: serviceMasterId,
          is_default: serviceMasterId === null,
          timezone: 'Asia/Kolkata',
          is_active: true,
        },
      })
    : await (prisma as any).renewalReminderPolicy.create({
        data: {
          name,
          company_id: companyId,
          service_category_id: serviceCategoryId,
          service_master_id: serviceMasterId,
          is_default: serviceMasterId === null,
          timezone: 'Asia/Kolkata',
          is_active: true,
        },
      });

  await (prisma as any).renewalReminderStep.deleteMany({ where: { policy_id: policy.id } });
  for (const step of steps) {
    await (prisma as any).renewalReminderStep.create({
      data: {
        policy_id: policy.id,
        step_number: step.step_number,
        offset_days: step.offset_days,
        relative_to: 'EXPIRY_DATE',
        action_type: 'SEND_NOTIFICATION',
        channel: 'EMAIL',
        recipient_type: 'CLIENT',
        template_id: step.template_id,
        attach_order_form: step.attach_order_form,
        is_mandatory: step.offset_days >= 0,
        is_enabled: true,
      },
    });
  }

  return policy;
}

async function main() {
  await seedBrandProfiles();
  await seedOrderFormTemplate();
  await seedTrinetraOrderFormTemplate();

  const angler = await findAnglerCompany();
  const trinetra = await findCompany('Trinetra');
  if (!angler) throw new Error('Angler Technologies parent company not found');
  if (!trinetra) throw new Error('Trinetra parent company not found');

  const anglerOrderForm = await findTemplate('ANGLER Order Form & Customer Contract');
  const trinetraOrderForm = await findTemplate('Trinetra Order Form & Customer Contract');
  if (!anglerOrderForm) throw new Error('ANGLER order form template not found after seed');
  if (!trinetraOrderForm) throw new Error('Trinetra order form template not found after seed');

  const anglerBrand = await (prisma as any).renewalBrandProfile.findFirst({
    where: { company_id: angler.id, is_default: true, is_active: true },
    select: { id: true },
  });
  const trinetraBrand = await (prisma as any).renewalBrandProfile.findFirst({
    where: { company_id: trinetra.id, is_default: true, is_active: true },
    select: { id: true },
  });

  await (prisma as any).renewalNotificationTemplate.update({
    where: { id: anglerOrderForm.id },
    data: {
      brand_profile_id: anglerBrand?.id ?? null,
      is_published: true,
      is_active: true,
    },
  });
  await (prisma as any).renewalNotificationTemplate.update({
    where: { id: trinetraOrderForm.id },
    data: {
      brand_profile_id: trinetraBrand?.id ?? null,
      is_published: true,
      is_active: true,
    },
  });

  await (prisma as any).company.update({
    where: { id: angler.id },
    data: { order_form_template_id: anglerOrderForm.id },
  });
  await (prisma as any).company.update({
    where: { id: trinetra.id },
    data: { order_form_template_id: trinetraOrderForm.id },
  });

  const seededTemplates = new Map<string, any>();
  for (const template of mailTemplates) {
    const saved = await upsertTemplate(template, trinetraBrand?.id ?? null);
    seededTemplates.set(template.name, saved);
  }

  const trinetraCategories = await (prisma as any).renewalServiceCategory.findMany({
    where: { company_id: trinetra.id, is_active: true },
    select: { id: true, name: true },
  });
  const categoryByName: Map<string, any> = new Map(trinetraCategories.map((category: any) => [category.name, category]));
  const trinetraServices = await (prisma as any).renewalServiceMaster.findMany({
    where: { company_id: trinetra.id, is_active: true },
    select: { id: true, name: true, category_id: true },
  });
  const serviceByName: Map<string, any> = new Map(trinetraServices.map((service: any) => [service.name, service]));

  const deactivationTemplate = seededTemplates.get('Trinetra Renewal Deactivation Notice');
  const suspensionTemplate = seededTemplates.get('Trinetra Renewal Suspension Notice');
  const standardPolicy = await upsertPolicy('TRINETRA Standard Follow-up Queue', trinetra.id, null, null, [
    { step_number: 1, offset_days: -45, template_id: seededTemplates.get('Trinetra Renewal Reminder - FMS License')?.id ?? null, attach_order_form: true },
    { step_number: 2, offset_days: -15, template_id: seededTemplates.get('Trinetra Renewal Reminder - FMS License')?.id ?? null, attach_order_form: true },
    { step_number: 3, offset_days: 0, template_id: deactivationTemplate?.id ?? null, attach_order_form: true },
  ]);

  const fmsPolicy = await upsertPolicy(
    'TRINETRA FMS Renewal Mailer Policy',
    trinetra.id,
    categoryByName.get('FMS')?.id ?? null,
    serviceByName.get('Trinetra Software Renewal for Vehicle Tracking Device')?.id ?? null,
    [
      { step_number: 1, offset_days: -40, template_id: seededTemplates.get('Trinetra Renewal Reminder - FMS License')?.id ?? null, attach_order_form: true },
      { step_number: 2, offset_days: 0, template_id: deactivationTemplate?.id ?? null, attach_order_form: true },
      { step_number: 3, offset_days: 5, template_id: suspensionTemplate?.id ?? null, attach_order_form: false },
    ]
  );

  const iwayPolicy = await upsertPolicy(
    'TRINETRA iWay Renewal Mailer Policy',
    trinetra.id,
    categoryByName.get('iWay')?.id ?? null,
    serviceByName.get('Trinetra Software Renewal for iWay License')?.id ?? null,
    [
      { step_number: 1, offset_days: -45, template_id: seededTemplates.get('Trinetra Renewal Reminder - iWay License')?.id ?? null, attach_order_form: true },
      { step_number: 2, offset_days: 0, template_id: deactivationTemplate?.id ?? null, attach_order_form: true },
      { step_number: 3, offset_days: 5, template_id: suspensionTemplate?.id ?? null, attach_order_form: false },
    ]
  );

  const fmsService = serviceByName.get('Trinetra Software Renewal for Vehicle Tracking Device');
  const iwayService = serviceByName.get('Trinetra Software Renewal for iWay License');
  if (fmsService) {
    await (prisma as any).renewalServiceMaster.update({
      where: { id: fmsService.id },
      data: { default_reminder_policy_id: fmsPolicy.id },
    });
  }
  if (iwayService) {
    await (prisma as any).renewalServiceMaster.update({
      where: { id: iwayService.id },
      data: { default_reminder_policy_id: iwayPolicy.id },
    });
  }

  await (prisma as any).renewalServiceMaster.updateMany({
    where: {
      company_id: trinetra.id,
      id: { notIn: [fmsService?.id, iwayService?.id].filter(Boolean) },
      default_reminder_policy_id: null,
    },
    data: { default_reminder_policy_id: standardPolicy.id },
  });

  console.log('[seedTrinetraOrderFormsAndFollowups] Seed complete', {
    companies: {
      angler: { id: angler.id, order_form_template_id: anglerOrderForm.id },
      trinetra: { id: trinetra.id, order_form_template_id: trinetraOrderForm.id },
    },
    templates: Array.from(seededTemplates.values()).map((template: any) => ({
      id: template.id,
      name: template.name,
      brand_profile_id: template.brand_profile_id,
      is_published: template.is_published,
    })),
    policies: {
      standard: standardPolicy.id,
      fms: fmsPolicy.id,
      iway: iwayPolicy.id,
    },
  });
}

main()
  .catch((error) => {
    console.error('[seedTrinetraOrderFormsAndFollowups] Failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

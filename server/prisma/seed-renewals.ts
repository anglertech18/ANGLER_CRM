/**
 * Seed script for Renewals module master data.
 * Run: npx ts-node prisma/seed-renewals.ts
 *
 * Seeds:
 *  - renewal_service_category
 *  - renewal_service_master
 *  - renewal_provider
 *  - renewal_reminder_policy (Global default with 9 steps matching the Excel tracker)
 */

import { PrismaClient } from './v2-client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding renewal masters...');

  // ── Parent Categories ────────────────────────────────────────────────────
  const parentCategories = [
    { name: 'Infrastructure', code: 'INFRA', color: '#1E293B', sort_order: 1 },
    { name: 'Software',       code: 'SOFT',  color: '#475569', sort_order: 2 },
  ];

  const parentMap: Record<string, number> = {};
  for (const cat of parentCategories) {
    const c = await (prisma as any).renewalServiceCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, color: cat.color, sort_order: cat.sort_order },
      create: { ...cat, is_active: true },
    });
    parentMap[cat.code] = c.id;
    console.log(`  Parent Category: ${cat.name} (id=${c.id})`);
  }

  // ── Subcategories ────────────────────────────────────────────────────────
  const subCategories = [
    { name: 'Domain',          code: 'DOMAIN',  color: '#3B82F6', sort_order: 1, parent_code: 'INFRA' },
    { name: 'Server',          code: 'SERVER',  color: '#8B5CF6', sort_order: 2, parent_code: 'INFRA' },
    { name: 'SSL Certificate', code: 'SSL',     color: '#10B981', sort_order: 3, parent_code: 'INFRA' },
    { name: 'Email',           code: 'EMAIL',   color: '#F59E0B', sort_order: 4, parent_code: 'SOFT' },
    { name: 'AMC',             code: 'AMC',     color: '#EF4444', sort_order: 5, parent_code: 'SOFT' },
    { name: 'Support Package', code: 'SUPPORT', color: '#6366F1', sort_order: 6, parent_code: 'SOFT' },
  ];

  const subCatMap: Record<string, number> = {};
  for (const cat of subCategories) {
    const c = await (prisma as any).renewalServiceCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, color: cat.color, sort_order: cat.sort_order, parent_id: parentMap[cat.parent_code] },
      create: { name: cat.name, code: cat.code, color: cat.color, sort_order: cat.sort_order, parent_id: parentMap[cat.parent_code], is_active: true },
    });
    subCatMap[cat.code] = c.id;
    console.log(`  Subcategory: ${cat.name} (id=${c.id}, parent=${cat.parent_code})`);
  }

  // ── Service Masters ───────────────────────────────────────────────────────
  const services = [
    // Domain
    { name: '.com Domain',          code: 'DOMAIN',  identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 1 },
    { name: '.in Domain',           code: 'DOMAIN',  identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 2 },
    { name: '.org Domain',          code: 'DOMAIN',  identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 3 },
    { name: '.co.in Domain',        code: 'DOMAIN',  identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 4 },
    // Server
    { name: 'Budget Starter Server',code: 'SERVER',  identifier_label: 'Server Name',  requires_identifier: false, default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: true,  supports_support_package: true,  sort_order: 1 },
    { name: 'Basic Server',         code: 'SERVER',  identifier_label: 'Server Name',  requires_identifier: false, default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: true,  supports_support_package: true,  sort_order: 2 },
    { name: 'Value Starter Server', code: 'SERVER',  identifier_label: 'Server Name',  requires_identifier: false, default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: true,  supports_support_package: true,  sort_order: 3 },
    { name: 'Business Server',      code: 'SERVER',  identifier_label: 'Server Name',  requires_identifier: false, default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: true,  supports_support_package: true,  sort_order: 4 },
    { name: 'Angler 99 Server',     code: 'SERVER',  identifier_label: 'Server Name',  requires_identifier: false, default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: true,  supports_support_package: true,  sort_order: 5 },
    // SSL
    { name: 'Basic SSL Certificate',code: 'SSL',     identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 1 },
    { name: 'Wildcard SSL',         code: 'SSL',     identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 2 },
    // Email
    { name: 'G Suite Email Server', code: 'EMAIL',   identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: true,  supports_amc: false, supports_support_package: false, sort_order: 1 },
    { name: 'Office 365 Email',     code: 'EMAIL',   identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: true,  supports_amc: false, supports_support_package: false, sort_order: 2 },
    { name: 'Email Server (5GB)',   code: 'EMAIL',   identifier_label: 'Domain Name',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: true,  supports_amc: false, supports_support_package: false, sort_order: 3 },
    // AMC
    { name: 'CMS Website AMC',      code: 'AMC',     identifier_label: 'Website URL',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 1 },
    { name: 'Application AMC',      code: 'AMC',     identifier_label: 'Application',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 2 },
    { name: 'Timecheck AMC',        code: 'AMC',     identifier_label: 'Application',  requires_identifier: false, default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 3 },
    { name: 'Product AMC',          code: 'AMC',     identifier_label: 'Product Name', requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 4 },
    { name: 'Website AMC',          code: 'AMC',     identifier_label: 'Website URL',  requires_identifier: true,  default_duration_value: 12, default_duration_unit: 'months', supports_provider: true,  supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 5 },
    // Support
    { name: 'Gold Support Package', code: 'SUPPORT', identifier_label: 'Service',      requires_identifier: false, default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 1 },
    { name: 'Silver Support Package',code:'SUPPORT', identifier_label: 'Service',      requires_identifier: false, default_duration_value: 12, default_duration_unit: 'months', supports_provider: false, supports_quantity: false, supports_amc: false, supports_support_package: false, sort_order: 2 },
  ];

  const subToParentCode: Record<string, string> = {
    DOMAIN: 'INFRA', SERVER: 'INFRA', SSL: 'INFRA',
    EMAIL: 'SOFT', AMC: 'SOFT', SUPPORT: 'SOFT',
  };

  for (const svc of services) {
    const { code, ...rest } = svc;
    const subCategoryId = subCatMap[code];
    const parentCategoryId = parentMap[subToParentCode[code]];
    await (prisma as any).renewalServiceMaster.upsert({
      where: { id: (await (prisma as any).renewalServiceMaster.findFirst({ where: { name: svc.name, sub_category_id: subCategoryId } }))?.id ?? 0 },
      update: { ...rest, category_id: parentCategoryId, sub_category_id: subCategoryId },
      create: { ...rest, category_id: parentCategoryId, sub_category_id: subCategoryId, is_active: true },
    });
    console.log(`  Service: ${svc.name}`);
  }

  // ── Providers ─────────────────────────────────────────────────────────────
  const providers = ['GoDaddy', 'Google', 'Microsoft', 'Angler Hosting', 'ResellerClub', 'BigRock', 'Namecheap', 'Zoho Email Server'];
  for (const name of providers) {
    await (prisma as any).renewalProvider.upsert({
      where: { name },
      update: {},
      create: { name, is_active: true },
    });
    console.log(`  Provider: ${name}`);
  }

  // ── Global Default Reminder Policy (Domain pattern from tracker) ──────────
  const existingPolicy = await (prisma as any).renewalReminderPolicy.findFirst({
    where: { is_default: true, company_id: null, service_category_id: null },
  });

  if (!existingPolicy) {
    const policy = await (prisma as any).renewalReminderPolicy.create({
      data: {
        name: 'Global Default Policy',
        is_default: true,
        use_business_days: false,
        skip_weekends: false,
        timezone: 'Asia/Kolkata',
        version: 1,
        is_active: true,
        steps: {
          create: [
            { step_number: 1, offset_days: -30, relative_to: 'EXPIRY_DATE', action_type: 'SEND_QUOTATION',  channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 2, offset_days: -28, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 3, offset_days: -20, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 4, offset_days: -15, relative_to: 'EXPIRY_DATE', action_type: 'FOLLOW_UP_EMAIL', channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 5, offset_days: -13, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 6, offset_days: -7,  relative_to: 'EXPIRY_DATE', action_type: 'FOLLOW_UP_EMAIL', channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: true,  is_enabled: true },
            { step_number: 7, offset_days: -5,  relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: true,  is_enabled: true },
            { step_number: 8, offset_days: 0,   relative_to: 'EXPIRY_DATE', action_type: 'EXPIRY_ALERT',    channel: 'IN_APP', recipient_type: 'BOTH',          is_mandatory: true,  is_enabled: true, escalate_after_days: 1 },
            { step_number: 9, offset_days: 3,   relative_to: 'EXPIRY_DATE', action_type: 'DEACTIVATION',    channel: 'IN_APP', recipient_type: 'BOTH',          is_mandatory: true,  is_enabled: true },
          ],
        },
      },
    });
    console.log(`  Policy: Global Default (id=${policy.id})`);
  } else {
    console.log(`  Policy: Global Default already exists (id=${existingPolicy.id})`);
  }

  // ── Domain-specific policy (matches Domain sheet from tracker) ────────────
  const existingDomainPolicy = await (prisma as any).renewalReminderPolicy.findFirst({
    where: { name: 'Domain Default Policy', service_category_id: subCatMap['DOMAIN'] },
  });

  if (!existingDomainPolicy) {
    const dp = await (prisma as any).renewalReminderPolicy.create({
      data: {
        name: 'Domain Default Policy',
        service_category_id: subCatMap['DOMAIN'],
        is_default: true,
        timezone: 'Asia/Kolkata',
        version: 1,
        is_active: true,
        steps: {
          create: [
            { step_number: 1, offset_days: -30, relative_to: 'EXPIRY_DATE', action_type: 'SEND_QUOTATION',  channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 2, offset_days: -28, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 3, offset_days: -20, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 4, offset_days: -15, relative_to: 'EXPIRY_DATE', action_type: 'FOLLOW_UP_EMAIL', channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 5, offset_days: -13, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 6, offset_days: -7,  relative_to: 'EXPIRY_DATE', action_type: 'FOLLOW_UP_EMAIL', channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: true,  is_enabled: true },
            { step_number: 7, offset_days: -5,  relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: true,  is_enabled: true },
            { step_number: 8, offset_days: 0,   relative_to: 'EXPIRY_DATE', action_type: 'EXPIRY_ALERT',    channel: 'IN_APP', recipient_type: 'BOTH',          is_mandatory: true,  is_enabled: true },
            { step_number: 9, offset_days: 3,   relative_to: 'EXPIRY_DATE', action_type: 'DEACTIVATION',    channel: 'IN_APP', recipient_type: 'BOTH',          is_mandatory: true,  is_enabled: true },
          ],
        },
      },
    });
    console.log(`  Policy: Domain Default (id=${dp.id})`);
  }

  // ── Server-specific policy (matches Server sheet from tracker) ────────────
  const existingServerPolicy = await (prisma as any).renewalReminderPolicy.findFirst({
    where: { name: 'Server Default Policy', service_category_id: subCatMap['SERVER'] },
  });

  if (!existingServerPolicy) {
    const sp = await (prisma as any).renewalReminderPolicy.create({
      data: {
        name: 'Server Default Policy',
        service_category_id: subCatMap['SERVER'],
        is_default: true,
        timezone: 'Asia/Kolkata',
        version: 1,
        is_active: true,
        steps: {
          create: [
            { step_number: 1, offset_days: -30, relative_to: 'EXPIRY_DATE', action_type: 'FOLLOW_UP_EMAIL', channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 2, offset_days: -28, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 3, offset_days: -25, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 4, offset_days: -15, relative_to: 'EXPIRY_DATE', action_type: 'FOLLOW_UP_EMAIL', channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 5, offset_days: -13, relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: false, is_enabled: true },
            { step_number: 6, offset_days: -7,  relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: true,  is_enabled: true },
            { step_number: 7, offset_days: -5,  relative_to: 'EXPIRY_DATE', action_type: 'CALL_REMINDER',   channel: 'IN_APP', recipient_type: 'ASSIGNED_USER', is_mandatory: true,  is_enabled: true },
            { step_number: 8, offset_days: 0,   relative_to: 'EXPIRY_DATE', action_type: 'EXPIRY_ALERT',    channel: 'IN_APP', recipient_type: 'BOTH',          is_mandatory: true,  is_enabled: true },
            { step_number: 9, offset_days: 3,   relative_to: 'EXPIRY_DATE', action_type: 'DEACTIVATION',    channel: 'IN_APP', recipient_type: 'BOTH',          is_mandatory: true,  is_enabled: true },
          ],
        },
      },
    });
    console.log(`  Policy: Server Default (id=${sp.id})`);
  }

  console.log('\nRenewal master data seeded successfully.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

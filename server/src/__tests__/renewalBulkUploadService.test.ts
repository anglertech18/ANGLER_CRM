import path from 'path';
import ExcelJS from 'exceljs';
import { generateBulkUploadTemplate, processBulkUpload } from '../services/renewalBulkUploadService';
import { openFirstCycle } from '../services/renewalCycleService';
import { prisma } from '../lib/prisma';

jest.mock('../services/renewalCycleService', () => ({
  openFirstCycle: jest.fn().mockResolvedValue({ id: 9001 }),
}));

const prismaMock = prisma as any;
const openFirstCycleMock = openFirstCycle as jest.MockedFunction<typeof openFirstCycle>;

const parentAnglerId = 10;
const parentTrinetraId = 20;
const userId = 99;

const companies = [
  { id: 1, name: 'Shared Customer Pvt Ltd', address: 'Master Address', gstin: '29ABCDE1234F1Z5' },
  { id: 2, name: 'Fleet Customer Pvt Ltd', address: 'Fleet Yard', gstin: '29TRINETRA1234F1Z5' },
];

const categories = [
  { id: 11, name: 'Domain Services', code: 'DOMAIN', company_id: parentAnglerId },
  { id: 12, name: 'Vehicle Tracking', code: 'VEHICLE', company_id: parentTrinetraId },
];

const services = [
  {
    id: 101,
    name: 'Domain Renewal',
    category_id: 11,
    company_id: parentAnglerId,
    supports_quantity: true,
    requires_identifier: true,
    default_duration_value: 12,
    default_duration_unit: 'months',
    default_reminder_policy_id: 301,
  },
  {
    id: 102,
    name: 'FMS / Vehicle Tracking',
    category_id: 12,
    company_id: parentTrinetraId,
    supports_quantity: true,
    requires_identifier: false,
    default_duration_value: 12,
    default_duration_unit: 'months',
    default_reminder_policy_id: 302,
  },
];

const policies = [
  { id: 301, name: 'Domain Default' },
  { id: 302, name: 'Trinetra Default' },
];

const providers = [{ id: 401, name: 'Godaddy' }];
const plans = [{ id: 451, name: 'Gold Plan' }];
const users = [
  { id: 501, first_name: 'Asha', last_name: 'Manager' },
  { id: 502, first_name: 'Ravi', last_name: 'Executive' },
];

function setupReferenceData() {
  prismaMock.clientCompany.findMany.mockResolvedValue(companies);
  prismaMock.renewalServiceCategory.findMany.mockResolvedValue(categories);
  prismaMock.renewalServiceMaster.findMany.mockResolvedValue(services);
  prismaMock.renewalReminderPolicy.findMany.mockResolvedValue(policies);
  prismaMock.renewalProvider.findMany.mockResolvedValue(providers);
  prismaMock.renewalServicePlanMaster.findMany.mockResolvedValue(plans);
  prismaMock.user.findMany.mockResolvedValue(users);
}

function setupCreateDefaults() {
  let contactId = 600;
  let accountId = 700;
  let instanceId = 800;
  let companyId = 1000;

  prismaMock.clientCompany.findFirst.mockResolvedValue(null);
  prismaMock.clientCompany.create.mockImplementation(async ({ data }: any) => ({ id: ++companyId, ...data }));
  prismaMock.renewalContact.findFirst.mockResolvedValue(null);
  prismaMock.renewalServiceCategory.create.mockImplementation(async ({ data }: any) => ({
    id: 900 + prismaMock.renewalServiceCategory.create.mock.calls.length,
    sort_order: 0,
    ...data,
  }));
  prismaMock.renewalServiceMaster.create.mockImplementation(async ({ data }: any) => ({
    id: 950 + prismaMock.renewalServiceMaster.create.mock.calls.length,
    sort_order: 0,
    default_reminder_policy_id: null,
    ...data,
  }));
  prismaMock.renewalContact.create.mockImplementation(async ({ data }: any) => ({
    id: ++contactId,
    ...data,
  }));
  prismaMock.renewalAccount.findFirst.mockResolvedValue(null);
  prismaMock.renewalAccount.create.mockImplementation(async ({ data }: any) => ({
    id: ++accountId,
    status: data.status,
    ...data,
  }));
  prismaMock.renewalAccount.update.mockImplementation(async ({ where, data }: any) => ({
    id: where.id,
    ...data,
  }));
  prismaMock.renewalAccountContact.upsert.mockResolvedValue({});
  prismaMock.renewalServiceInstance.findFirst.mockResolvedValue(null);
  prismaMock.renewalServiceInstance.create.mockImplementation(async ({ data }: any) => ({
    id: ++instanceId,
    ...data,
  }));
  prismaMock.renewalServiceInstance.update.mockImplementation(async ({ where, data }: any) => ({
    id: where.id,
    ...data,
  }));
  prismaMock.renewalCycle.findFirst.mockResolvedValue(null);
  prismaMock.renewalCycle.updateMany.mockResolvedValue({ count: 1 });
}

async function workbookBuffer(sheetName: string, headers: string[], rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const anglerHeaders = [
  'Client Company Name *',
  'Address',
  'GST Number',
  'Account Manager Name',
  'Renewal Executive Name',
  'Order Number',
  'Order Date (YYYY-MM-DD)',
  'PO Reference',
  'Invoice Number',
  'Invoice Date (YYYY-MM-DD)',
  'Contact Name *',
  'Contact Email',
  'Contact Mobile',
  'Contact Role',
  'Service Category *',
  'Service Master Name *',
  'Domain / Server Identifier *',
  'Status',
  'Service Provider Name',
  'Login User Name',
  'Server Name',
  'Service Plan Name',
  'Activation Date (YYYY-MM-DD)',
  'Expiry Date (YYYY-MM-DD)',
  'Period (Months)',
  'No. of Email IDs',
  'Amount Due',
  'Amount Collected',
  'Cycle Status',
  'Reminder Policy Name',
  'Notes',
];

const trinetraHeaders = [
  'Client Company Name *',
  'Address',
  'GST Number',
  'Account Manager Name',
  'Renewal Executive Name',
  'Order Number',
  'Order Date (YYYY-MM-DD)',
  'PO Reference',
  'Invoice Number',
  'Invoice Date (YYYY-MM-DD)',
  'Contact Name *',
  'Contact Email',
  'Contact Mobile',
  'Contact Role',
  'Service Category *',
  'Service Master Name *',
  'Status',
  'Quantity',
  'Activation Date (YYYY-MM-DD)',
  'Expiry Date (YYYY-MM-DD)',
  'Period (Months)',
  'Amount Due',
  'Amount Collected',
  'Cycle Status',
  'Reminder Policy Name',
  'Notes',
];

const uploadedTrinetraReferenceHeaders = [
  'Client Company Name *',
  'Account Manager Name',
  'Renewal Executive Name',
  'Order Number',
  'Order Date',
  'PO Reference',
  'Invoice Number',
  'Contact Name *',
  'Contact Email',
  'Contact Mobile',
  'Contact Role',
  'Service Category *',
  'Service Master Name *',
  'Domain / Server Identifier *',
  'Provider Name',
  'Server Account / Sub-Item',
  'Service Plan Name',
  'Activation Date (YYYY-MM-DD)',
  'Expiry Date * (YYYY-MM-DD)',
  'Quantity',
  'Amount Due (INR) *',
  'Month',
  'Amount Collected (INR)',
  'Cycle Status',
  'Reminder Policy Name',
  'Notes',
];

function anglerRow(overrides: Partial<Record<string, unknown>> = {}) {
  const row: Record<string, unknown> = {
    'Client Company Name *': 'Shared Customer Pvt Ltd',
    Address: 'Master Address',
    'GST Number': '29ABCDE1234F1Z5',
    'Account Manager Name': 'Asha Manager',
    'Renewal Executive Name': 'Ravi Executive',
    'Order Number': 'ANG-ORD-001',
    'Order Date (YYYY-MM-DD)': '2026-01-15',
    'PO Reference': 'PO-ANG-1',
    'Invoice Number': 'INV-ANG-1',
    'Invoice Date (YYYY-MM-DD)': '2026-01-16',
    'Contact Name *': 'Priya Contact',
    'Contact Email': 'priya@example.com',
    'Contact Mobile': '9876543210',
    'Contact Role': 'PRIMARY',
    'Service Category *': 'Domain Services',
    'Service Master Name *': 'Domain Renewal',
    'Domain / Server Identifier *': 'example.com',
    Status: 'Renewal',
    'Service Provider Name': 'Godaddy',
    'Login User Name': 'admin@example.com',
    'Server Name': 'web-01',
    'Service Plan Name': 'Gold Plan',
    'Activation Date (YYYY-MM-DD)': '2026-02-01',
    'Expiry Date (YYYY-MM-DD)': '2027-01-31',
    'Period (Months)': 18,
    'No. of Email IDs': 15,
    'Amount Due': 'INR 12,500.50',
    'Amount Collected': '2,500.50',
    'Cycle Status': 'ACTIVE',
    'Reminder Policy Name': 'Domain Default',
    Notes: 'ANGLER import row',
    ...overrides,
  };

  return anglerHeaders.map((header) => row[header] ?? '');
}

function trinetraRow(overrides: Partial<Record<string, unknown>> = {}) {
  const row: Record<string, unknown> = {
    'Client Company Name *': 'Fleet Customer Pvt Ltd',
    Address: 'Fleet Yard',
    'GST Number': '29TRINETRA1234F1Z5',
    'Account Manager Name': 'Asha Manager',
    'Renewal Executive Name': 'Ravi Executive',
    'Order Number': 'TRN-ORD-001',
    'Order Date (YYYY-MM-DD)': '2026-03-01',
    'PO Reference': 'PO-TRN-1',
    'Invoice Number': 'INV-TRN-1',
    'Invoice Date (YYYY-MM-DD)': '2026-03-02',
    'Contact Name *': 'Kumar Contact',
    'Contact Email': 'kumar@example.com',
    'Contact Mobile': '9123456780',
    'Contact Role': 'PRIMARY',
    'Service Category *': 'Vehicle Tracking',
    'Service Master Name *': 'FMS / Vehicle Tracking',
    Status: 'Renewal',
    Quantity: 25,
    'Activation Date (YYYY-MM-DD)': '2026-04-01',
    'Expiry Date (YYYY-MM-DD)': '2027-03-31',
    'Period (Months)': 12,
    'Amount Due': 150000,
    'Amount Collected': 50000,
    'Cycle Status': 'ACTIVE',
    'Reminder Policy Name': 'Trinetra Default',
    Notes: 'TRINETRA import row',
    ...overrides,
  };

  return trinetraHeaders.map((header) => row[header] ?? '');
}

function uploadedTrinetraReferenceRow(overrides: Partial<Record<string, unknown>> = {}) {
  const row: Record<string, unknown> = {
    'Client Company Name *': 'Fleet Customer Pvt Ltd',
    'Account Manager Name': 'Asha Manager',
    'Renewal Executive Name': 'Ravi Executive',
    'Order Number': 'TRN-REF-001',
    'Order Date': '2026-03-01',
    'PO Reference': 'PO-TRN-REF',
    'Invoice Number': 'INV-TRN-REF',
    'Contact Name *': 'Kumar Contact',
    'Contact Email': 'kumar@example.com',
    'Contact Mobile': '9123456780',
    'Contact Role': 'PRIMARY',
    'Service Category *': 'Vehicle Tracking',
    'Service Master Name *': 'FMS / Vehicle Tracking',
    'Domain / Server Identifier *': 'VEHICLE-FLEET-01',
    'Provider Name': 'Godaddy',
    'Server Account / Sub-Item': 'Fleet Device Batch',
    'Service Plan Name': 'Vehicle Annual',
    'Activation Date (YYYY-MM-DD)': '2026-04-01',
    'Expiry Date * (YYYY-MM-DD)': '2027-03-31',
    Quantity: 25,
    'Amount Due (INR) *': 150000,
    Month: 'March',
    'Amount Collected (INR)': 50000,
    'Cycle Status': 'ACTIVE',
    'Reminder Policy Name': 'Trinetra Default',
    Notes: 'TRINETRA uploaded reference row',
    ...overrides,
  };

  return uploadedTrinetraReferenceHeaders.map((header) => row[header] ?? '');
}

function printableCell(value: any) {
  if (value?.richText) {
    return value.richText.map((part: any) => part.text || '').join('');
  }
  return value;
}

async function generatedTemplateValidationModel(type: 'FULL_RENEWAL' | 'TRINETRA_V2') {
  const buffer = await generateBulkUploadTemplate(type, type === 'FULL_RENEWAL' ? parentAnglerId : parentTrinetraId);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheetName = type === 'FULL_RENEWAL' ? 'Full Renewals Bulk Upload' : 'Trinetra Renewals Bulk Upload';
  return workbook.getWorksheet(sheetName)!;
}

function validationFormulae(sheet: ExcelJS.Worksheet, cellAddress: string) {
  return (sheet.getCell(cellAddress).dataValidation as any)?.formulae;
}

beforeEach(() => {
  jest.clearAllMocks();
  setupReferenceData();
  setupCreateDefaults();
});

describe('processBulkUpload', () => {
  it('generates ANGLER template dropdown validations on the matching upload columns', async () => {
    const sheet = await generatedTemplateValidationModel('FULL_RENEWAL');

    expect(validationFormulae(sheet, 'A2')).toEqual(['Master_References!$A$2:$A$3']);
    expect(validationFormulae(sheet, 'D2')).toEqual(['Master_References!$G$2:$G$3']);
    expect(validationFormulae(sheet, 'E2')).toEqual(['Master_References!$G$2:$G$3']);
    expect(validationFormulae(sheet, 'N2')).toEqual(['"PRIMARY,TECHNICAL,BILLING,DECISION_MAKER"']);
    expect(validationFormulae(sheet, 'O2')).toEqual(['Master_References!$B$2:$B$3']);
    expect(validationFormulae(sheet, 'P2')).toEqual(['Master_References!$C$2:$C$3']);
    expect(validationFormulae(sheet, 'S2')).toEqual(['Master_References!$D$2:$D$2']);
    expect(validationFormulae(sheet, 'V2')).toEqual(['Master_References!$E$2:$E$2']);
    expect(validationFormulae(sheet, 'AC2')).toEqual(['"ACTIVE,DUE_SOON,FOLLOW_UP,RENEWED,EXPIRED,NOT_RENEWING"']);
    expect(validationFormulae(sheet, 'AD2')).toEqual(['Master_References!$F$2:$F$3']);
  });

  it('generates TRINETRA template dropdown validations on the matching upload columns', async () => {
    const sheet = await generatedTemplateValidationModel('TRINETRA_V2');

    expect(validationFormulae(sheet, 'A2')).toEqual(['Master_References!$A$2:$A$3']);
    expect(validationFormulae(sheet, 'D2')).toEqual(['Master_References!$G$2:$G$3']);
    expect(validationFormulae(sheet, 'E2')).toEqual(['Master_References!$G$2:$G$3']);
    expect(validationFormulae(sheet, 'N2')).toEqual(['"PRIMARY,TECHNICAL,BILLING,DECISION_MAKER"']);
    expect(validationFormulae(sheet, 'O2')).toEqual(['Master_References!$B$2:$B$3']);
    expect(validationFormulae(sheet, 'P2')).toEqual(['Master_References!$C$2:$C$3']);
    expect(validationFormulae(sheet, 'X2')).toEqual(['"ACTIVE,DUE_SOON,FOLLOW_UP,RENEWED,EXPIRED,NOT_RENEWING"']);
    expect(validationFormulae(sheet, 'Y2')).toEqual(['Master_References!$F$2:$F$3']);
  });

  it('imports ANGLER rows using the 31-column user workbook format', async () => {
    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [anglerRow()]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result).toEqual(expect.objectContaining({
      success: true,
      totalRows: 1,
      importedCount: 1,
      failedCount: 0,
    }));
    expect(prismaMock.renewalAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        client_company_id: 1,
        company_id: parentAnglerId,
        order_number: 'ANG-ORD-001',
        created_by_id: userId,
      }),
    });
    expect(prismaMock.renewalServiceInstance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        renewal_account_id: expect.any(Number),
        service_master_id: 101,
        identifier: 'example.com',
        provider_id: 401,
        login_username: 'admin@example.com',
        server_name: 'web-01',
        plan_name: 'Gold Plan',
        quantity: 15,
        amount_due: 12500.5,
        duration_value: 18,
        duration_unit: 'months',
        service_transaction_type: 'RENEWAL',
      }),
    });
    expect(openFirstCycleMock).toHaveBeenCalledWith(expect.any(Number));
  });

  it('normalizes active-user names and propagates the executive assignment', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 501, first_name: 'Asha', last_name: 'Manager' },
      { id: 502, first_name: 'Ravi  ', last_name: '  Executive' },
    ]);
    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow({ 'Renewal Executive Name': '  RAVI    EXECUTIVE  ' }),
    ]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result.success).toBe(true);
    expect(result.warnings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('Renewal Executive') }),
    ]));
    expect(prismaMock.renewalAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ renewal_executive_id: 502 }),
    });
    expect(prismaMock.renewalServiceInstance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ assigned_user_id: 502 }),
    });
    expect(openFirstCycleMock).toHaveBeenCalledWith(expect.any(Number));
  });

  it('warns when a supplied renewal executive does not match an active user', async () => {
    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow({ 'Renewal Executive Name': 'Unknown Executive' }),
    ]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result.success).toBe(true);
    expect(result.warnings).toEqual(expect.arrayContaining([
      {
        rowNumber: 2,
        message: 'Renewal Executive "Unknown Executive" did not match an active user; account, service, reminders and follow-up tasks will remain unassigned',
      },
    ]));
    expect(prismaMock.renewalAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ renewal_executive_id: null }),
    });
    expect(prismaMock.renewalServiceInstance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ assigned_user_id: null }),
    });
  });

  it('imports TRINETRA rows using the 26-column user workbook format without ANGLER technical fields', async () => {
    const buffer = await workbookBuffer('Trinetra Renewals Bulk Upload', trinetraHeaders, [trinetraRow()]);

    const result = await processBulkUpload(buffer, 'TRINETRA_V2', userId, parentTrinetraId);

    expect(result.success).toBe(true);
    expect(prismaMock.renewalAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        client_company_id: 2,
        company_id: parentTrinetraId,
        order_number: 'TRN-ORD-001',
      }),
    });
    expect(prismaMock.renewalServiceInstance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        service_master_id: 102,
        identifier: null,
        provider_id: null,
        login_username: null,
        server_name: null,
        plan_name: null,
        quantity: 25,
        amount_due: 150000,
        reminder_policy_id: 302,
        duration_value: 12,
        duration_unit: 'months',
      }),
    });
  });

  it('imports the uploaded TRINETRA reference layout when Master_References is the first sheet', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Master_References').addRow(['Companies', 'Categories']);
    const uploadSheet = workbook.addWorksheet('Full Renewals Bulk Upload');
    uploadSheet.addRow(uploadedTrinetraReferenceHeaders);
    uploadSheet.addRow(uploadedTrinetraReferenceRow());
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await processBulkUpload(buffer, 'TRINETRA_V2', userId, parentTrinetraId);

    expect(result.success).toBe(true);
    expect(prismaMock.renewalAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        client_company_id: 2,
        company_id: parentTrinetraId,
        order_number: 'TRN-REF-001',
      }),
    });
    expect(prismaMock.renewalServiceInstance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        service_master_id: 102,
        identifier: 'VEHICLE-FLEET-01',
        provider_id: 401,
        server_name: 'Fleet Device Batch',
        plan_name: 'Vehicle Annual',
        quantity: 25,
        amount_due: 150000,
      }),
    });
  });

  it('creates missing category and service masters only for the selected parent company', async () => {
    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow({
        'Order Number': 'ANG-NEW-MASTER-001',
        'Service Category *': 'ANGLER Custom Security',
        'Service Master Name *': 'ANGLER SOC Renewal',
        'Domain / Server Identifier *': 'soc.example.com',
      }),
    ]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result.success).toBe(true);
    expect(prismaMock.renewalServiceCategory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'ANGLER Custom Security',
        company_id: parentAnglerId,
        is_active: true,
      }),
    });
    expect(prismaMock.renewalServiceMaster.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'ANGLER SOC Renewal',
        category_id: expect.any(Number),
        company_id: parentAnglerId,
        supports_provider: true,
        supports_login_username: true,
        quantity_label: 'No. of Email IDs',
      }),
    });
    expect(result.warnings?.map((warning) => warning.message)).toEqual(expect.arrayContaining([
      'Service Category "ANGLER Custom Security" was created for selected parent company',
      'Service Master "ANGLER SOC Renewal" was created for selected parent company',
    ]));
  });

  it('updates the existing client account regardless of the service order number', async () => {
    prismaMock.renewalContact.findFirst.mockResolvedValue({ id: 610 });
    prismaMock.renewalAccount.findFirst.mockResolvedValue({ id: 710, status: 'ACTIVE' });
    prismaMock.renewalServiceInstance.findFirst.mockResolvedValue({ id: 810 });
    prismaMock.renewalCycle.findFirst.mockResolvedValue({ id: 910 });

    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [anglerRow()]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result.success).toBe(true);
    expect(prismaMock.renewalAccount.findFirst).toHaveBeenCalledWith({
      where: { client_company_id: 1, company_id: parentAnglerId, is_active: true },
      orderBy: { id: 'asc' },
      select: { id: true, status: true, order_number: true },
    });
    expect(prismaMock.renewalAccount.create).not.toHaveBeenCalled();
    expect(prismaMock.renewalAccount.update).toHaveBeenCalledWith({
      where: { id: 710 },
      data: expect.objectContaining({
        company_id: parentAnglerId,
      }),
    });
    expect(prismaMock.renewalServiceInstance.update).toHaveBeenCalledWith({
      where: { id: 810 },
      data: expect.objectContaining({
        amount_due: 12500.5,
        order_number: 'ANG-ORD-001',
        po_reference: 'PO-ANG-1',
      }),
    });
    expect(prismaMock.renewalCycle.update).toHaveBeenCalledWith({
      where: { id: 910 },
      data: expect.objectContaining({
        amount_due: 12500.5,
        amount_collected: 2500.5,
        outstanding: 10000,
      }),
    });
  });

  it('uses contact email before mobile to avoid linking stale shared-mobile contacts', async () => {
    prismaMock.renewalContact.findFirst.mockResolvedValue(null);
    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow({ 'Contact Email': 'unique-contact@example.com', 'Contact Mobile': '9876543210' }),
    ]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result.success).toBe(true);
    expect(prismaMock.renewalContact.findFirst).toHaveBeenCalledWith({
      where: {
        client_company_id: 1,
        email: 'unique-contact@example.com',
      },
      select: { id: true },
    });
    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('DELETE rac'),
      expect.any(Number),
      1
    );
  });

  it('falls back to contact mobile only when email is blank', async () => {
    prismaMock.renewalContact.findFirst.mockResolvedValue({ id: 610 });
    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow({ 'Contact Email': '', 'Contact Mobile': '9876543210' }),
    ]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result.success).toBe(true);
    expect(prismaMock.renewalContact.findFirst).toHaveBeenCalledWith({
      where: {
        client_company_id: 1,
        mobile: '9876543210',
      },
      select: { id: true },
    });
  });

  it('groups one client into one account while preserving different service order numbers', async () => {
    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow({ 'Order Number': 'ORDER-SVC-001', 'Domain / Server Identifier *': 'one.example.com' }),
      anglerRow({ 'Order Number': 'ORDER-SVC-002', 'Domain / Server Identifier *': 'two.example.com' }),
    ]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(prismaMock.renewalAccount.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.renewalServiceInstance.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.renewalServiceInstance.create.mock.calls.map((call: any) => call[0].data.order_number))
      .toEqual(['ORDER-SVC-001', 'ORDER-SVC-002']);
  });


  it('keeps separate client accounts for different parent companies', async () => {
    const firstBuffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow({ 'Order Number': '', 'Domain / Server Identifier *': 'blank-one.example.com' }),
    ]);
    const secondBuffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow({ 'Order Number': '', 'Domain / Server Identifier *': 'blank-two.example.com' }),
    ]);

    const first = await processBulkUpload(firstBuffer, 'FULL_RENEWAL', userId, parentAnglerId);
    const second = await processBulkUpload(secondBuffer, 'FULL_RENEWAL', userId, parentTrinetraId);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(prismaMock.renewalAccount.findFirst).toHaveBeenCalledTimes(2);
    expect(prismaMock.renewalAccount.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.renewalAccount.create.mock.calls[0][0].data).toEqual(expect.objectContaining({
      client_company_id: 1,
      company_id: parentAnglerId,
      order_number: null,
    }));
    expect(prismaMock.renewalAccount.create.mock.calls[1][0].data).toEqual(expect.objectContaining({
      client_company_id: 1,
      company_id: parentTrinetraId,
      order_number: null,
    }));
  });

  it('fails only invalid rows and keeps importing valid rows from mixed bulk files', async () => {
    const buffer = await workbookBuffer('Full Renewals Bulk Upload', anglerHeaders, [
      anglerRow(),
      anglerRow({ 'Client Company Name *': 'Missing Company Pvt Ltd', 'Order Number': 'BAD-001' }),
      anglerRow({ 'Service Category *': '', 'Service Master Name *': 'Unknown Service', 'Order Number': 'BAD-002' }),
      anglerRow({ 'Order Number': 'ANG-ORD-002', Address: 'Different Address', 'GST Number': 'WRONGGST' }),
    ]);

    const result = await processBulkUpload(buffer, 'FULL_RENEWAL', userId, parentAnglerId);

    expect(result.success).toBe(false);
    expect(result.totalRows).toBe(4);
    expect(result.importedCount).toBe(3);
    expect(result.failedCount).toBe(1);
    expect(result.errors.map((error) => error.message)).toEqual(expect.arrayContaining([
      'Service Category is mandatory when creating a new Service Master',
    ]));
    expect(result.warnings?.map((warning) => warning.message)).toEqual(expect.arrayContaining([
      'Address mismatch: Client Master has "Master Address"',
      'GST mismatch: Client Master has "29ABCDE1234F1Z5"',
    ]));
  });

  it('rejects imports without parent company context', async () => {
    const buffer = await workbookBuffer('Trinetra Renewals Bulk Upload', trinetraHeaders, [trinetraRow()]);

    const result = await processBulkUpload(buffer, 'TRINETRA_V2', userId);

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toBe('Parent company context is required for bulk upload');
    expect(prismaMock.renewalAccount.create).not.toHaveBeenCalled();
  });

  it('keeps uploaded workbook headers aligned with the ANGLER and TRINETRA reference files', async () => {
    const root = path.resolve(__dirname, '../../..');
    const uploadedAnglerHeaders = [
      'Client Company Name *',
      'Address',
      'GST Number',
      'Account Manager Name',
      'Renewal Executive Name',
      'Order Number',
      'Order Date',
      'PO Reference',
      'Invoice Number',
      'Invoice Date',
      'Contact Name *',
      'Contact Email',
      'Contact Mobile',
      'Contact Role',
      'Service Category *',
      'Service Master Name *',
      'Domain / Server Identifier *',
      'Status',
      'Provider Name to be changed to Service Provider Name',
      'Login User  Name',
      'Server Account / Sub-Item to be changed to Server Name',
      'Service Plan Name',
      'Activation Date (YYYY-MM-DD)',
      'Expiry Date * (YYYY-MM-DD)',
      'Quantity to be renamed as No. of Email ids',
      'Amount Due (INR) *',
      'Amount Collected (INR)',
      'Cycle Status',
      'Reminder Policy Name',
      'Notes',
    ];
    const references: Array<{ file: string; expected: string[] }> = [
      { file: 'ANGLER_Full_Renewal_Bulk_Import_Template.xlsx', expected: uploadedAnglerHeaders },
      { file: 'TRINETRA_Full_Renewal_Bulk_Import_Template.xlsx', expected: uploadedTrinetraReferenceHeaders },
    ];

    for (const reference of references) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(path.join(root, reference.file));
      const uploadSheet = workbook.getWorksheet('Full Renewals Bulk Upload');
      expect(uploadSheet).toBeDefined();
      const actualHeaders = (uploadSheet!.getRow(1).values as unknown[])
        .slice(1, reference.expected.length + 1)
        .map(printableCell);

      expect(actualHeaders).toEqual(reference.expected);
    }
  });
});

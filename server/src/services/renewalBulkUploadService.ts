import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';


export type TemplateType = 'FULL_RENEWAL' | 'MASTERS' | 'TRINETRA_V2';

export interface RowError {
  rowNumber: number;
  column: string;
  value: any;
  message: string;
}

export interface BulkUploadProcessResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  errors: RowError[];
  warnings?: { rowNumber: number; message: string }[];
  createdSummary?: {
    accountsCreated: number;
    instancesCreated: number;
    cyclesCreated: number;
    contactsCreated: number;
  };
}

const normalizeHeader = (value: any): string => {
  const raw = value?.richText
    ? value.richText.map((part: any) => part.text || '').join('')
    : String(value || '');

  return raw
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

const cellText = (value: any): string => {
  if (value?.richText) {
    return value.richText.map((part: any) => part.text || '').join('').trim();
  }
  if (value?.text) return String(value.text).trim();
  if (value?.result !== undefined) return String(value.result).trim();
  return String(value || '').trim();
};

const cellNumber = (value: any, fallback = 0): number => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(cellText(value).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(parsed) ? fallback : parsed;
};

const findHeaderIndex = (headers: any[], aliases: string[]): number | null => {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (let index = 1; index < headers.length; index++) {
    const normalized = normalizeHeader(headers[index]);
    if (!normalized) continue;
    if (normalizedAliases.some(alias => normalized === alias || normalized.includes(alias))) {
      return index;
    }
  }
  return null;
};

const normalizeMasterName = (value: string): string => value.trim().toLowerCase();

const normalizeUserName = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const makeCategoryCode = (name: string, companyId: number): string => {
  let hash = 0;
  for (const char of name) {
    hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  }
  const suffix = hash.toString(36).toUpperCase().slice(0, 6);
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 8) || 'CAT';
  return `${base}_${companyId}_${suffix}`.slice(0, 20);
};

function pickScopedMaster<T extends { company_id?: number | null; name: string }>(
  rows: T[],
  name: string,
  companyId: number
): T | null {
  const normalizedName = normalizeMasterName(name);
  const matches = rows.filter(row => normalizeMasterName(row.name) === normalizedName);
  return matches.find(row => row.company_id === companyId) ||
    matches.find(row => row.company_id === null || row.company_id === undefined) ||
    null;
}

/**
 * Generates an Excel workbook buffer populated with reference dropdown lists.
 */
export const generateBulkUploadTemplate = async (type: TemplateType = 'FULL_RENEWAL', parentCompanyId?: number, templateVersion?: string): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ANGLER CRM Renewal Module';
  workbook.lastModifiedBy = 'ANGLER CRM System';
  workbook.created = new Date();

  // ── SHEET 2: Master References ───────────────────────────────────────────
  const masterSheet = workbook.addWorksheet('Master_References');
  masterSheet.columns = [
    { header: 'Client Company', key: 'company', width: 30 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Service Master', key: 'service', width: 30 },
    { header: 'Provider', key: 'provider', width: 25 },
    { header: 'Plan', key: 'plan', width: 25 },
    { header: 'Reminder Policy', key: 'policy', width: 30 },
    { header: 'User Name', key: 'user', width: 30 }
  ];

  const headerRow = masterSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Fetch Master Reference Data
  const companies = await prisma.clientCompany.findMany({
    where: { is_active: true },
    select: { name: true, address: true, gstin: true },
    orderBy: { name: 'asc' },
    take: 500
  });

  const categories = await (prisma as any).renewalServiceCategory.findMany({
    where: { is_active: true },
    select: { name: true, code: true },
    orderBy: { name: 'asc' }
  });

  // Filter services by parent company if provided
  let servicesQuery: any = { where: { is_active: true }, select: { name: true }, orderBy: { name: 'asc' } };
  
  if (parentCompanyId) {
    servicesQuery = {
      where: {
        is_active: true,
        OR: [{ company_id: parentCompanyId }, { company_id: null }]
      },
      select: { name: true },
      orderBy: { name: 'asc' }
    };
  }

  const services = await prisma.renewalServiceMaster.findMany(servicesQuery);

  const providers = await prisma.renewalProvider.findMany({
    where: { is_active: true },
    select: { name: true },
    orderBy: { name: 'asc' }
  });

  const plans = await prisma.renewalServicePlanMaster.findMany({
    where: { is_active: true },
    select: { name: true },
    orderBy: { name: 'asc' }
  });

  const policies = await prisma.renewalReminderPolicy.findMany({
    where: { is_active: true },
    select: { name: true },
    orderBy: { name: 'asc' }
  });

  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { first_name: true, last_name: true },
    orderBy: { first_name: 'asc' },
    take: 500
  });

  // Populate Master Sheet
  const maxCount = Math.max(companies.length, categories.length, services.length, providers.length, plans.length, policies.length, users.length, 1);
  for (let i = 0; i < maxCount; i++) {
    masterSheet.addRow({
      company: companies[i]?.name || '',
      category: categories[i]?.name || '',
      service: services[i]?.name || '',
      provider: providers[i]?.name || '',
      plan: plans[i]?.name || '',
      policy: policies[i]?.name || '',
      user: users[i] ? `${users[i].first_name} ${users[i].last_name}`.trim() : ''
    });
  }

  // ── SHEET 1: Main Upload Sheet ──────────────────────────────────────────────
  const sheetName = type === 'FULL_RENEWAL' ? 'Full Renewals Bulk Upload' : (type === 'TRINETRA_V2' ? 'Trinetra Renewals Bulk Upload' : 'Masters Bulk Upload');
  const mainSheet = workbook.addWorksheet(sheetName);

  if (type === 'FULL_RENEWAL') {
    // ANGLER V2 Template with latest business requirements
    const headers = [
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
      'Notes'
    ];

    mainSheet.addRow(headers);
    const headerRow = mainSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Sample Row
    mainSheet.addRow([
      companies[0]?.name || 'ACME Corporation',
      companies[0]?.address || '123 Business Street, City',
      companies[0]?.gstin || '29ABCDE1234F1Z5',
      users[0] ? `${users[0].first_name} ${users[0].last_name}`.trim() : '',
      '',
      'ORD-2026-001',
      dayjs().subtract(11, 'month').format('YYYY-MM-DD'),
      'PO-9912',
      'INV-8812',
      dayjs().subtract(11, 'month').format('YYYY-MM-DD'),
      'John Doe',
      'john@acme.com',
      '9876543210',
      'PRIMARY',
      categories[0]?.name || 'Domain Services',
      services[0]?.name || 'Domain Renewal',
      'acme-tech.com',
      'Renewal',
      providers[0]?.name || 'Godaddy',
      'admin@acme.com',
      '',
      plans[0]?.name || 'Basic Server',
      dayjs().subtract(11, 'month').format('YYYY-MM-DD'),
      dayjs().add(1, 'month').format('YYYY-MM-DD'),
      12,
      10,
      5000.00,
      0.00,
      'ACTIVE',
      policies[0]?.name || 'Domain Default',
      'Bulk imported renewal entry'
    ]);

    // Data Validations for ANGLER V2
    const compCount = Math.max(companies.length, 1);
    const catCount = Math.max(categories.length, 1);
    const servCount = Math.max(services.length, 1);
    const provCount = Math.max(providers.length, 1);
    const planCount = Math.max(plans.length, 1);
    const polCount = Math.max(policies.length, 1);
    const userCount = Math.max(users.length, 1);

    const applyValidation = (colLetter: string, formulae: string[]) => {
      (mainSheet as any).dataValidations.add(`${colLetter}2:${colLetter}501`, {
        type: 'list',
        allowBlank: true,
        showErrorMessage: true,
        error: 'Please select a value from the dropdown list',
        errorTitle: 'Invalid Selection',
        formulae
      });
    };

    if (companies.length > 0) applyValidation('A', [`Master_References!$A$2:$A$${compCount + 1}`]);
    if (users.length > 0) {
      applyValidation('D', [`Master_References!$G$2:$G$${userCount + 1}`]);
      applyValidation('E', [`Master_References!$G$2:$G$${userCount + 1}`]);
    }
    applyValidation('N', ['"PRIMARY,TECHNICAL,BILLING,DECISION_MAKER"']);
    if (categories.length > 0) applyValidation('O', [`Master_References!$B$2:$B$${catCount + 1}`]);
    if (services.length > 0) applyValidation('P', [`Master_References!$C$2:$C$${servCount + 1}`]);
    if (providers.length > 0) applyValidation('S', [`Master_References!$D$2:$D$${provCount + 1}`]);
    if (plans.length > 0) applyValidation('V', [`Master_References!$E$2:$E$${planCount + 1}`]);
    applyValidation('AC', ['"ACTIVE,DUE_SOON,FOLLOW_UP,RENEWED,EXPIRED,NOT_RENEWING"']);
    if (policies.length > 0) applyValidation('AD', [`Master_References!$F$2:$F$${polCount + 1}`]);

  } else if (type === 'TRINETRA_V2') {
    // TRINETRA V2 Template - hides technical fields (identifier, provider, server, plan)
    const headers = [
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
      'Quantity', // For FMS: No. of Vehicles, Camera: No. of Cameras, etc.
      'Activation Date (YYYY-MM-DD)',
      'Expiry Date (YYYY-MM-DD)',
      'Period (Months)',
      'Amount Due',
      'Amount Collected',
      'Cycle Status',
      'Reminder Policy Name',
      'Notes'
    ];

    mainSheet.addRow(headers);
    const headerRow = mainSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    mainSheet.columns = headers.map(() => ({ width: 24 }));

    // TRINETRA Sample Row
    mainSheet.addRow([
      companies[0]?.name || 'Transport Corporation',
      companies[0]?.address || '456 Transport Hub, Industrial Area',
      companies[0]?.gstin || '29TRINETRA1234F1Z5',
      users[0] ? `${users[0].first_name} ${users[0].last_name}`.trim() : '',
      '',
      'TRN-2026-001',
      dayjs().subtract(2, 'month').format('YYYY-MM-DD'),
      'PO-TRN-8812',
      'INV-TRN-9912',
      dayjs().subtract(2, 'month').format('YYYY-MM-DD'),
      'Rajesh Kumar',
      'rajesh@transport.com',
      '9876543210',
      'PRIMARY',
      categories[0]?.name || 'Vehicle Tracking',
      services[0]?.name || 'FMS / Vehicle Tracking',
      'Renewal',
      25, // Quantity - No. of Vehicles
      dayjs().subtract(2, 'month').format('YYYY-MM-DD'),
      dayjs().add(10, 'month').format('YYYY-MM-DD'),
      12,
      150000.00,
      0.00,
      'ACTIVE',
      policies[0]?.name || 'Trinetra Default',
      'Bulk imported Trinetra renewal entry'
    ]);

    // Data Validations for TRINETRA V2
    const compCount = Math.max(companies.length, 1);
    const catCount = Math.max(categories.length, 1);
    const servCount = Math.max(services.length, 1);
    const polCount = Math.max(policies.length, 1);
    const userCount = Math.max(users.length, 1);

    const applyValidation = (colLetter: string, formulae: string[]) => {
      (mainSheet as any).dataValidations.add(`${colLetter}2:${colLetter}501`, {
        type: 'list',
        allowBlank: true,
        showErrorMessage: true,
        error: 'Please select a value from the dropdown list',
        errorTitle: 'Invalid Selection',
        formulae
      });
    };

    if (companies.length > 0) applyValidation('A', [`Master_References!$A$2:$A$${compCount + 1}`]);
    if (users.length > 0) {
      applyValidation('D', [`Master_References!$G$2:$G$${userCount + 1}`]);
      applyValidation('E', [`Master_References!$G$2:$G$${userCount + 1}`]);
    }
    applyValidation('N', ['"PRIMARY,TECHNICAL,BILLING,DECISION_MAKER"']);
    if (categories.length > 0) applyValidation('O', [`Master_References!$B$2:$B$${catCount + 1}`]);
    if (services.length > 0) applyValidation('P', [`Master_References!$C$2:$C$${servCount + 1}`]);
    applyValidation('X', ['"ACTIVE,DUE_SOON,FOLLOW_UP,RENEWED,EXPIRED,NOT_RENEWING"']);
    if (policies.length > 0) applyValidation('Y', [`Master_References!$F$2:$F$${polCount + 1}`]);

  } else {
    // Masters Template
    const headers = [
      'Record Type * (COMPANY / CONTACT / SERVICE / PLAN / PROVIDER)',
      'Name / Title *',
      'Category Code (DOMAIN/SERVER/EMAIL/SSL/AMC/SUPPORT)',
      'Sub Category / Provider Name',
      'Contact Email',
      'Contact Phone',
      'Designation / Role',
      'Base Price / Amount',
      'Description / Notes'
    ];

    mainSheet.addRow(headers);
    const headerRow = mainSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    mainSheet.columns = headers.map(() => ({ width: 26 }));

    mainSheet.addRow([
      'COMPANY', 'New Horizon Technologies', '', '', 'info@newhorizon.com', '9876543210', 'Primary Client', '', 'Added via masters bulk import'
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/**
 * Preview bulk upload without writing to database
 */
export const previewBulkUpload = async (fileBuffer: Buffer): Promise<any> => {
  // TODO: Implement preview logic
  return { validCount: 0, warningCount: 0, errorCount: 0, rows: [] };
};

/**
 * Process bulk upload with parent company context and field rule resolution
 */
export const processBulkUpload = async (
  fileBuffer: Buffer,
  type: TemplateType = 'FULL_RENEWAL',
  userId: number,
  requestParentCompanyId?: number
): Promise<BulkUploadProcessResult> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);

  const mainSheet = workbook.worksheets.find(sheet => {
    const headers = sheet.getRow(1).values as any[];
    return findHeaderIndex(headers, ['Client Company Name']) !== null &&
      findHeaderIndex(headers, ['Service Master Name']) !== null;
  }) || workbook.worksheets[0];
  if (!mainSheet) {
    return {
      success: false,
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ rowNumber: 0, column: 'System', value: null, message: 'No data sheet found in workbook' }],
      warnings: []
    };
  }

  // Require parent company context for bulk upload
  if (!requestParentCompanyId) {
    return {
      success: false,
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ rowNumber: 0, column: 'System', value: null, message: 'Parent company context is required for bulk upload' }],
      warnings: []
    };
  }

  const errors: RowError[] = [];
  const warnings: { rowNumber: number; message: string }[] = [];
  let importedCount = 0;
  let failedCount = 0;
  const summary = { accountsCreated: 0, instancesCreated: 0, cyclesCreated: 0, contactsCreated: 0 };

  // Determine column mapping based on template type
  const isTrinetraV2 = type === 'TRINETRA_V2';
  const headerRow = mainSheet.getRow(1);
  const headers = headerRow.values as string[];

  // Column indices (1-based ExcelJS values, index 0 = null so 1-based works directly)
  // TRINETRA V2: 26 cols — same as base (no technical fields), with Period (Months) at 21.
  // ANGLER V2: 31 cols — adds identifier(17), status(18), provider(19), login(20), server(21), plan(22)
  //   then activationDate(23), expiryDate(24), period(25), emailCount(26), amountDue(27), amountCollected(28)
  //   cycleStatus(29), reminderPolicy(30), notes(31)
  const cols: any = {
    companyName: 1,
    address: 2,
    gstin: 3,
    accountManager: 4,
    renewalExecutive: 5,
    orderNumber: 6,
    orderDate: 7,
    poReference: 8,
    invoiceNumber: 9,
    invoiceDate: 10,
    contactName: 11,
    contactEmail: 12,
    contactMobile: 13,
    contactRole: 14,
    serviceCategory: 15,
    serviceName: 16,
    // TRINETRA V2 has status at 17, quantity at 18 (no technical fields)
    status: 17,
    quantity: 18,
    activationDate: 19,
    expiryDate: 20,
    period: null,
    amountDue: 22,
    amountCollected: 23,
    cycleStatus: 24,
    reminderPolicy: 25,
    notes: 26,
    // ANGLER-only technical fields (will be set below for ANGLER V2)
    identifier: null,
    provider: null,
    loginUser: null,
    serverName: null,
    planName: null,
    transactionType: null // "Status" col in ANGLER = Registration/Renewal type
  };

  // ANGLER V2 column layout (31 columns):
  // Col 17 = Domain/Server Identifier, Col 18 = Status(transaction type)
  // Col 19 = Service Provider, Col 20 = Login User Name
  // Col 21 = Server Name, Col 22 = Service Plan Name
  // Col 23 = Activation Date, Col 24 = Expiry Date
  // Col 25 = Period (Months), Col 26 = No. of Email IDs (quantity)
  // Col 27 = Amount Due, Col 28 = Amount Collected
  // Col 29 = Cycle Status, Col 30 = Reminder Policy, Col 31 = Notes
  if (!isTrinetraV2) {
    cols.identifier = 17;
    cols.transactionType = 18; // "Status" = Registration/Renewal (NOT lifecycle status)
    cols.provider = 19;
    cols.loginUser = 20;
    cols.serverName = 21;
    cols.planName = 22;
    cols.activationDate = 23; // ✓ correct
    cols.expiryDate = 24;     // ✓ correct
    cols.period = null;
    cols.quantity = 26;       // No. of Email IDs
    cols.amountDue = 27;
    cols.amountCollected = 28;
    cols.cycleStatus = 29;
    cols.reminderPolicy = 30;
    cols.notes = 31;
    cols.status = null; // ANGLER V2 uses transactionType, not lifecycle status from upload
  }

  const applyHeaderMapping = () => {
    const mapped: Record<string, number | null> = {
      companyName: findHeaderIndex(headers, ['Client Company Name']),
      address: findHeaderIndex(headers, ['Address']),
      gstin: findHeaderIndex(headers, ['GST Number', 'GST']),
      accountManager: findHeaderIndex(headers, ['Account Manager Name']),
      renewalExecutive: findHeaderIndex(headers, ['Renewal Executive Name']),
      orderNumber: findHeaderIndex(headers, ['Order Number']),
      orderDate: findHeaderIndex(headers, ['Order Date']),
      poReference: findHeaderIndex(headers, ['PO Reference']),
      invoiceNumber: findHeaderIndex(headers, ['Invoice Number']),
      invoiceDate: findHeaderIndex(headers, ['Invoice Date']),
      contactName: findHeaderIndex(headers, ['Contact Name']),
      contactEmail: findHeaderIndex(headers, ['Contact Email']),
      contactMobile: findHeaderIndex(headers, ['Contact Mobile']),
      contactRole: findHeaderIndex(headers, ['Contact Role']),
      serviceCategory: findHeaderIndex(headers, ['Service Category']),
      serviceName: findHeaderIndex(headers, ['Service Master Name']),
      identifier: findHeaderIndex(headers, ['Domain Server Identifier']),
      transactionType: findHeaderIndex(headers, ['Status']),
      provider: findHeaderIndex(headers, ['Service Provider Name', 'Provider Name']),
      loginUser: findHeaderIndex(headers, ['Login User Name']),
      serverName: findHeaderIndex(headers, ['Server Name', 'Server Account Sub Item']),
      planName: findHeaderIndex(headers, ['Service Plan Name']),
      activationDate: findHeaderIndex(headers, ['Activation Date']),
      expiryDate: findHeaderIndex(headers, ['Expiry Date']),
      period: findHeaderIndex(headers, ['Period Months', 'Period', 'Term Duration', 'Duration Months']),
      quantity: findHeaderIndex(headers, ['No of Email IDs', 'No of Email ids', 'Quantity']),
      amountDue: findHeaderIndex(headers, ['Amount Due']),
      amountCollected: findHeaderIndex(headers, ['Amount Collected']),
      cycleStatus: findHeaderIndex(headers, ['Cycle Status']),
      reminderPolicy: findHeaderIndex(headers, ['Reminder Policy Name']),
      notes: findHeaderIndex(headers, ['Notes']),
    };

    Object.entries(mapped).forEach(([key, value]) => {
      if (value !== null) cols[key] = value;
    });
  };

  applyHeaderMapping();

  // Load reference data
  const companiesList = await prisma.clientCompany.findMany({
    where: { is_active: true },
    select: { id: true, name: true, address: true, gstin: true }
  });

  const companyMap = new Map(companiesList.map(c => [c.name.toLowerCase(), c.id]));
  const categories = await (prisma as any).renewalServiceCategory.findMany({
    where: {
      is_active: true,
      OR: [{ company_id: requestParentCompanyId }, { company_id: null }]
    },
    select: { id: true, name: true, code: true, company_id: true }
  });

  const services = await (prisma as any).renewalServiceMaster.findMany({
    where: {
      is_active: true,
      OR: [{ company_id: requestParentCompanyId }, { company_id: null }]
    },
    select: { id: true, name: true, category_id: true, company_id: true,
      supports_quantity: true, requires_identifier: true,
      default_duration_value: true, default_duration_unit: true,
      default_reminder_policy_id: true }
  });

  const policies = await prisma.renewalReminderPolicy.findMany({
    where: {
      is_active: true,
      OR: [{ company_id: requestParentCompanyId }, { company_id: null }]
    },
    select: { id: true, name: true }
  });
  const policyMap = new Map(policies.map(p => [p.name.toLowerCase(), p.id]));

  // Load provider map
  const providerList = await (prisma as any).renewalProvider.findMany({
    where: { is_active: true },
    select: { id: true, name: true }
  });
  const providerMap = new Map(providerList.map((p: any) => [p.name.toLowerCase(), p.id]));

  // Load user map (for account manager / renewal executive resolution)
  const userList = await (prisma as any).user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, first_name: true, last_name: true }
  });
  const userMap = new Map(userList.map((u: any) => [
    normalizeUserName(`${u.first_name || ''} ${u.last_name || ''}`), u.id
  ]));
  const renewalAccountMap = new Map<string, any>();

  // Process each data row
  for (let rowNumber = 2; rowNumber <= mainSheet.rowCount; rowNumber++) {
    const row = mainSheet.getRow(rowNumber);
    const values = row.values as any[];

    if (!values || values.length === 0) continue;

    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];

    // Extract values
    const companyName = cellText(values[cols.companyName]);
    const address = cellText(values[cols.address]);
    const gstin = cellText(values[cols.gstin]);
    const orderNumber = cellText(values[cols.orderNumber]);
    const orderDate = values[cols.orderDate];
    const poReference = cellText(values[cols.poReference]);
    const invoiceNumber = cellText(values[cols.invoiceNumber]);
    const invoiceDate = values[cols.invoiceDate];
    const accountManagerName = cellText(values[cols.accountManager]);
    const renewalExecutiveName = cellText(values[cols.renewalExecutive]);
    const contactName = cellText(values[cols.contactName]);
    const contactEmail = cellText(values[cols.contactEmail]);
    const contactMobile = cellText(values[cols.contactMobile]);
    const contactRole = cellText(values[cols.contactRole]);
    const categoryName = cellText(values[cols.serviceCategory]);
    const serviceName = cellText(values[cols.serviceName]);
    // ANGLER-specific technical fields (null for TRINETRA V2)
    const identifier = cols.identifier ? cellText(values[cols.identifier]) : '';
    const transactionType = cols.transactionType ? cellText(values[cols.transactionType] || 'RENEWAL').toUpperCase() : 'RENEWAL';
    const providerName = cols.provider ? cellText(values[cols.provider]) : '';
    const loginUser = cols.loginUser ? cellText(values[cols.loginUser]) : '';
    const serverName = cols.serverName ? cellText(values[cols.serverName]) : '';
    const planName = cols.planName ? cellText(values[cols.planName]) : '';
    const quantityRaw = cols.quantity ? values[cols.quantity] : null;
    const activationDateRaw = cols.activationDate ? values[cols.activationDate] : null;
    const expiryDateRaw = cols.expiryDate ? values[cols.expiryDate] : null;
    const periodRaw = cols.period ? values[cols.period] : null;
    const amountDueRaw = cols.amountDue ? values[cols.amountDue] : null;
    const amountCollectedRaw = cols.amountCollected ? values[cols.amountCollected] : null;
    const cycleStatusRaw = cols.cycleStatus ? cellText(values[cols.cycleStatus] || 'ACTIVE') : 'ACTIVE';
    const policyName = cols.reminderPolicy ? cellText(values[cols.reminderPolicy]) : '';
    const notes = cols.notes ? cellText(values[cols.notes]) : '';

    const hasImportData = [
      companyName,
      orderNumber,
      contactName,
      contactEmail,
      contactMobile,
      categoryName,
      serviceName,
      identifier,
      providerName,
      loginUser,
      serverName,
      planName,
      notes,
    ].some(Boolean) || Boolean(quantityRaw || activationDateRaw || expiryDateRaw || periodRaw || amountDueRaw || amountCollectedRaw);

    if (!hasImportData) continue;

    // Validation
    if (!companyName) rowErrors.push('Client Company Name is mandatory');
    if (!contactName) rowErrors.push('Contact Name is mandatory');
    if (!serviceName) rowErrors.push('Service Master Name is mandatory');

    // Address/GST validation against Client Master
    if (companyName && companyMap.has(companyName.toLowerCase())) {
      const companyId = companyMap.get(companyName.toLowerCase());
      const clientCompany = companiesList.find((c: any) => c.id === companyId);
      
      if (clientCompany) {
        if (address && clientCompany.address && address !== clientCompany.address) {
          rowWarnings.push(`Address mismatch: Client Master has "${clientCompany.address}"`);
        }
        if (gstin && clientCompany.gstin && gstin !== clientCompany.gstin) {
          rowWarnings.push(`GST mismatch: Client Master has "${clientCompany.gstin}"`);
        }
      }
    } else if (companyName) {
      rowWarnings.push(`Client Company "${companyName}" not found in master data - will be auto-created`);
    }

    // Contact role validation (no silent PRIMARY fallback)
    if (contactRole && !['PRIMARY', 'TECHNICAL', 'BILLING', 'DECISION_MAKER'].includes(contactRole.toUpperCase())) {
      rowWarnings.push(`Unknown contact role "${contactRole}" - will be preserved for manual review`);
    }

    // Parse dates
    let activationDate: Date | null = null;
    if (activationDateRaw) {
      const d = dayjs(activationDateRaw);
      if (d.isValid()) activationDate = d.toDate();
      else rowErrors.push('Invalid Activation Date format');
    }

    let expiryDate: Date | null = null;
    if (expiryDateRaw) {
      const d = dayjs(expiryDateRaw);
      if (d.isValid()) expiryDate = d.toDate();
      else rowErrors.push('Invalid Expiry Date format');
    }

    const parsedOrderDate = orderDate && dayjs(orderDate).isValid() ? dayjs(orderDate).toDate() : null;
    const parsedInvoiceDate = invoiceDate && dayjs(invoiceDate).isValid() ? dayjs(invoiceDate).toDate() : null;

    // Parse amounts
    const amountDue = cellNumber(amountDueRaw, 0);
    const amountCollected = cellNumber(amountCollectedRaw, 0);
    const quantity = Math.trunc(cellNumber(quantityRaw, 1)) || 1;
    let periodMonths: number | null = null;
    if (periodRaw !== null && periodRaw !== undefined && cellText(periodRaw) !== '') {
      const parsedPeriod = Number(cellText(periodRaw));
      if (!Number.isInteger(parsedPeriod) || parsedPeriod <= 0) {
        rowErrors.push('Period (Months) must be a positive whole number');
      } else {
        periodMonths = parsedPeriod;
      }
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach(msg => {
        errors.push({
          rowNumber,
          column: 'Validation',
          value: null,
          message: msg
        });
      });
      failedCount++;
      continue;
    }

    // Resolve or create company-scoped category and service masters.
    let categoryRecord: any = null;
    if (categoryName) {
      categoryRecord = pickScopedMaster(categories, categoryName, requestParentCompanyId);
      if (!categoryRecord) {
        categoryRecord = await (prisma as any).renewalServiceCategory.create({
          data: {
            name: categoryName,
            code: makeCategoryCode(categoryName, requestParentCompanyId),
            company_id: requestParentCompanyId,
            is_active: true,
          }
        });
        categories.push(categoryRecord);
        warnings.push({
          rowNumber,
          message: `Service Category "${categoryName}" was created for selected parent company`
        });
      }
    }

    let serviceMasterRecord: any = null;
    let serviceMasterId: number | null = null;
    if (serviceName) {
      serviceMasterRecord = pickScopedMaster(services, serviceName, requestParentCompanyId);
      if (!serviceMasterRecord) {
        if (!categoryRecord) {
          rowErrors.push('Service Category is mandatory when creating a new Service Master');
        } else {
          serviceMasterRecord = await (prisma as any).renewalServiceMaster.create({
            data: {
              name: serviceName,
              category_id: categoryRecord.id,
              company_id: requestParentCompanyId,
              identifier_label: isTrinetraV2 ? 'Identifier' : 'Domain / Server Identifier',
              requires_identifier: !isTrinetraV2,
              supports_provider: !isTrinetraV2,
              requires_provider: false,
              supports_server_name: !isTrinetraV2,
              requires_server_name: false,
              supports_plan_name: !isTrinetraV2,
              requires_plan_name: false,
              supports_login_username: !isTrinetraV2,
              requires_login_username: false,
              supports_quantity: true,
              requires_quantity: isTrinetraV2,
              quantity_label: isTrinetraV2 ? 'Quantity' : 'No. of Email IDs',
              default_duration_value: 12,
              default_duration_unit: 'months',
              is_active: true,
            }
          });
          services.push(serviceMasterRecord);
          warnings.push({
            rowNumber,
            message: `Service Master "${serviceName}" was created for selected parent company`
          });
        }
      }
    }

    if (serviceMasterRecord) {
      serviceMasterId = serviceMasterRecord?.id || null;
    }

    // Resolve reminder policy
    let policyId: number | null = null;
    if (policyName && policyMap.has(policyName.toLowerCase())) {
      policyId = policyMap.get(policyName.toLowerCase()) || null;
    } else if (!policyName && serviceMasterRecord?.default_reminder_policy_id) {
      policyId = serviceMasterRecord.default_reminder_policy_id;
    }

    // Resolve provider (ANGLER V2 only)
    let providerId: number | null = null;
    if (providerName && providerMap.has(providerName.toLowerCase())) {
      providerId = Number(providerMap.get(providerName.toLowerCase())) || null;
    }

    // Resolve account manager and renewal executive
    let accountManagerId: number | null = null;
    let renewalExecutiveId: number | null = null;
    const accountManagerKey = normalizeUserName(accountManagerName);
    const renewalExecutiveKey = normalizeUserName(renewalExecutiveName);
    if (accountManagerName && userMap.has(accountManagerKey)) {
      accountManagerId = Number(userMap.get(accountManagerKey)) || null;
    }
    if (renewalExecutiveName && userMap.has(renewalExecutiveKey)) {
      renewalExecutiveId = Number(userMap.get(renewalExecutiveKey)) || null;
    } else if (renewalExecutiveName) {
      rowWarnings.push(
        `Renewal Executive "${renewalExecutiveName}" did not match an active user; account, service, reminders and follow-up tasks will remain unassigned`
      );
    }

    // Add row errors if any
    if (rowErrors.length > 0) {
      rowErrors.forEach(msg => {
        errors.push({
          rowNumber,
          column: 'Validation',
          value: null,
          message: msg
        });
      });
      failedCount++;
      continue;
    }

    // Add row warnings
    rowWarnings.forEach(msg => {
      warnings.push({ rowNumber, message: msg });
    });

    // ── DB WRITE PIPELINE ─────────────────────────────────────────────────────
    try {
      let clientCompanyId = companyMap.get(companyName.toLowerCase());
      if (!clientCompanyId) {
        let existing = await prisma.clientCompany.findFirst({
          where: { name: companyName },
          select: { id: true }
        });
        if (!existing) {
          existing = await prisma.clientCompany.create({
            data: {
              name: companyName,
              address: address || null,
              gstin: gstin || null,
              is_active: true,
            },
            select: { id: true }
          });
          warnings.push({
            rowNumber,
            message: `Client Company "${companyName}" was automatically created in Master Data`
          });
        }
        clientCompanyId = existing.id;
        companyMap.set(companyName.toLowerCase(), clientCompanyId);
      }

      // 1. Upsert Contact (find by email OR mobile within this client company)
      let contactId: number | null = null;
      if (contactName) {
        const contactWhere: any = { client_company_id: clientCompanyId };
        if (contactEmail) {
          contactWhere.email = contactEmail;
        } else if (contactMobile) {
          contactWhere.mobile = contactMobile;
        }

        const existingContact = await (prisma as any).renewalContact.findFirst({
          where: contactWhere,
          select: { id: true }
        });

        if (existingContact) {
          // Update contact if name/role has changed
          await (prisma as any).renewalContact.update({
            where: { id: existingContact.id },
            data: {
              name: contactName,
              email: contactEmail || undefined,
              mobile: contactMobile || undefined,
              role: contactRole?.toUpperCase() || undefined,
            }
          });
          contactId = existingContact.id;
        } else {
          // Create new contact
          const newContact = await (prisma as any).renewalContact.create({
            data: {
              client_company_id: clientCompanyId,
              name: contactName,
              email: contactEmail || null,
              mobile: contactMobile || null,
              role: contactRole?.toUpperCase() || 'PRIMARY',
              is_primary: true,
              is_renewal_contact: true,
            }
          });
          contactId = newContact.id;
          summary.contactsCreated++;
        }
      }

      // 2. Upsert the client renewal account. Order/invoice references belong to
      // each service instance because one client account can contain services
      // purchased under different order numbers.
      const accountKey = `${requestParentCompanyId}:${clientCompanyId}`;
      let renewalAccount: any = renewalAccountMap.get(accountKey) || null;
      if (!renewalAccount) {
        renewalAccount = await (prisma as any).renewalAccount.findFirst({
          where: {
            client_company_id: clientCompanyId,
            company_id: requestParentCompanyId,
            is_active: true,
          },
          orderBy: { id: 'asc' },
          select: { id: true, status: true, order_number: true },
        });
      }

      if (renewalAccount) {
        // Update account fields if needed
        await (prisma as any).renewalAccount.update({
          where: { id: renewalAccount.id },
          data: {
            company_id: requestParentCompanyId || undefined,
            account_manager_id: accountManagerId || undefined,
            renewal_executive_id: renewalExecutiveId || undefined,
            notes: notes || undefined,
          }
        });
      } else {
        renewalAccount = await (prisma as any).renewalAccount.create({
          data: {
            client_company_id: clientCompanyId,
            company_id: requestParentCompanyId || null,
            account_manager_id: accountManagerId || null,
            renewal_executive_id: renewalExecutiveId || null,
            order_number: orderNumber || null,
            order_date: parsedOrderDate,
            po_reference: poReference || null,
            invoice_number: invoiceNumber || null,
            invoice_date: parsedInvoiceDate,
            notes: notes || null,
            status: 'DRAFT',
            created_by_id: userId,
          }
        });
        summary.accountsCreated++;
      }
      renewalAccountMap.set(accountKey, renewalAccount);

      // 3. Link Contact to Account
      if (contactId) {
        await (prisma as any).renewalAccountContact.upsert({
          where: {
            renewal_account_id_contact_id: {
              renewal_account_id: renewalAccount.id,
              contact_id: contactId,
            }
          },
          create: { renewal_account_id: renewalAccount.id, contact_id: contactId },
          update: {}
        });

        await (prisma as any).$executeRawUnsafe(
          `DELETE rac
           FROM renewal_account_contact rac
           JOIN renewal_contact rc ON rc.id = rac.contact_id
           WHERE rac.renewal_account_id = ?
             AND rc.client_company_id <> ?`,
          renewalAccount.id,
          clientCompanyId
        );
      }

      // 4. Upsert Service Instance. Prefer a stable identifier, then the
      // service-level order number, then service + expiry for legacy sheets.
      const instanceWhere: any = {
        renewal_account_id: renewalAccount.id,
        service_master_id: serviceMasterId!,
        is_active: true
      };
      if (identifier) {
        instanceWhere.identifier = identifier;
      } else if (orderNumber) {
        instanceWhere.order_number = orderNumber;
      } else if (expiryDate) {
        instanceWhere.expiry_date = expiryDate;
      } else {
        instanceWhere.id = -1;
      }

      let serviceInstance = await (prisma as any).renewalServiceInstance.findFirst({
        where: instanceWhere,
        select: { id: true }
      });

      const instanceData: any = {
        service_master_id: serviceMasterId!,
        identifier: identifier || null,
        provider_id: providerId || null,
        login_username: loginUser || null,
        server_name: serverName || null,
        plan_name: planName || null,
        quantity: quantity,
        activation_date: activationDate,
        expiry_date: expiryDate,
        amount_due: amountDue,
        reminder_policy_id: policyId || null,
        status: 'ACTIVE',
        remarks: notes || null,
        service_transaction_type: transactionType || 'RENEWAL',
        order_number: orderNumber || null,
        order_date: parsedOrderDate,
        po_reference: poReference || null,
        invoice_number: invoiceNumber || null,
        invoice_date: parsedInvoiceDate,
        customer_contact_id: contactId || null,
        assigned_user_id: renewalExecutiveId || null,
        duration_value: periodMonths ?? serviceMasterRecord?.default_duration_value ?? 12,
        duration_unit: periodMonths !== null ? 'months' : (serviceMasterRecord?.default_duration_unit || 'months'),
      };

      if (serviceInstance) {
        await (prisma as any).renewalServiceInstance.update({
          where: { id: serviceInstance.id },
          data: instanceData
        });
      } else {
        const newInstance = await (prisma as any).renewalServiceInstance.create({
          data: { ...instanceData, renewal_account_id: renewalAccount.id }
        });
        serviceInstance = newInstance;
        summary.instancesCreated++;
      }

      // 5. Open First Cycle if not already present and we have expiry date
      if (expiryDate) {
        const { openFirstCycle } = await import('./renewalCycleService');
        const existingCycle = await (prisma as any).renewalCycle.findFirst({
          where: { service_instance_id: serviceInstance.id, is_active: true },
          select: { id: true }
        });
        if (!existingCycle) {
          const createdCycle = await openFirstCycle(serviceInstance.id);
          await (prisma as any).renewalCycle.update({
            where: { id: createdCycle.id },
            data: {
              amount_due: amountDue,
              outstanding: amountDue - amountCollected,
              amount_collected: amountCollected,
              expiry_date: expiryDate || undefined,
              activation_date: activationDate || undefined,
            }
          });
          summary.cyclesCreated++;
        } else {
          // Update cycle amounts if data changed
          await (prisma as any).renewalCycle.update({
            where: { id: existingCycle.id },
            data: {
              amount_due: amountDue,
              outstanding: amountDue - amountCollected,
              amount_collected: amountCollected,
              expiry_date: expiryDate || undefined,
              activation_date: activationDate || undefined,
            }
          });
        }
      }

      // 6. Activate account if still DRAFT and we imported a service with expiry
      if (renewalAccount.status === 'DRAFT' && expiryDate) {
        await (prisma as any).renewalAccount.update({
          where: { id: renewalAccount.id },
          data: { status: 'ACTIVE' }
        });
      }

      importedCount++;
    } catch (dbErr: any) {
      errors.push({
        rowNumber,
        column: 'Database',
        value: null,
        message: `DB write failed: ${dbErr.message}`
      });
      failedCount++;
    }
  }

  return {
    success: errors.length === 0,
    totalRows: mainSheet.rowCount - 1,
    importedCount,
    failedCount,
    errors,
    warnings,
    createdSummary: summary
  };
};

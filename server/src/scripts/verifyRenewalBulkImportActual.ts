import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { PrismaClient } from '../../prisma/v2-client';
import { processBulkUpload } from '../services/renewalBulkUploadService';

const prisma = new PrismaClient();
const runTag = `VERIFY-${Date.now()}`;

async function columnExists(tableName: string, columnName: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    tableName,
    columnName
  );
  return rows.length > 0;
}

async function indexExists(tableName: string, indexName: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    tableName,
    indexName
  );
  return rows.length > 0;
}

async function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  if (!(await columnExists(tableName, columnName))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
}

async function ensureCompanyScopedMasterSchema() {
  await addColumnIfMissing('renewal_service_master', 'requires_provider', 'BOOLEAN NOT NULL DEFAULT 0');
  await addColumnIfMissing('renewal_service_master', 'supports_server_name', 'BOOLEAN NOT NULL DEFAULT 1');
  await addColumnIfMissing('renewal_service_master', 'requires_server_name', 'BOOLEAN NOT NULL DEFAULT 0');
  await addColumnIfMissing('renewal_service_master', 'supports_plan_name', 'BOOLEAN NOT NULL DEFAULT 1');
  await addColumnIfMissing('renewal_service_master', 'requires_plan_name', 'BOOLEAN NOT NULL DEFAULT 0');
  await addColumnIfMissing('renewal_service_master', 'supports_login_username', 'BOOLEAN NOT NULL DEFAULT 0');
  await addColumnIfMissing('renewal_service_master', 'requires_login_username', 'BOOLEAN NOT NULL DEFAULT 0');
  await addColumnIfMissing('renewal_service_master', 'requires_quantity', 'BOOLEAN NOT NULL DEFAULT 0');
  await addColumnIfMissing('renewal_service_master', 'quantity_label', 'VARCHAR(100) NULL');
  await addColumnIfMissing('renewal_service_master', 'sub_category_id', 'INTEGER NULL');
  await addColumnIfMissing('renewal_service_master', 'company_id', 'INTEGER NULL');
  await addColumnIfMissing('renewal_service_instance', 'email_count', 'INTEGER NULL');
  await addColumnIfMissing('renewal_service_instance', 'provider_type', 'VARCHAR(191) NULL');
  await addColumnIfMissing('renewal_service_instance', 'server_name', 'VARCHAR(191) NULL');
  await addColumnIfMissing('renewal_service_instance', 'plan_name', 'VARCHAR(191) NULL');
  await addColumnIfMissing('renewal_service_instance', 'billing_term', 'VARCHAR(191) NULL DEFAULT "Yearly"');
  await addColumnIfMissing('renewal_service_instance', 'unit_price', 'DECIMAL(12,2) NULL DEFAULT 0.00');
  await addColumnIfMissing('renewal_service_instance', 'login_username', 'VARCHAR(200) NULL');
  await addColumnIfMissing('renewal_service_instance', 'service_transaction_type', 'VARCHAR(50) NULL');
  await addColumnIfMissing('renewal_service_category', 'parent_id', 'INTEGER NULL');
  await addColumnIfMissing('renewal_service_category', 'company_id', 'INTEGER NULL');

  for (const indexName of ['renewal_service_category_name_key', 'renewal_service_category_code_key']) {
    if (await indexExists('renewal_service_category', indexName)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`renewal_service_category\` DROP INDEX \`${indexName}\``);
    }
  }

  const indexes: Array<[string, string, string]> = [
    ['renewal_service_category', 'renewal_service_category_company_id_idx', 'ADD INDEX `renewal_service_category_company_id_idx` (`company_id`)'],
    ['renewal_service_category', 'renewal_service_category_company_id_name_idx', 'ADD INDEX `renewal_service_category_company_id_name_idx` (`company_id`, `name`)'],
    ['renewal_service_category', 'renewal_service_category_company_id_code_key', 'ADD UNIQUE INDEX `renewal_service_category_company_id_code_key` (`company_id`, `code`)'],
    ['renewal_service_master', 'renewal_service_master_company_id_idx', 'ADD INDEX `renewal_service_master_company_id_idx` (`company_id`)'],
    ['renewal_service_master', 'renewal_service_master_company_id_name_idx', 'ADD INDEX `renewal_service_master_company_id_name_idx` (`company_id`, `name`)'],
  ];

  for (const [tableName, indexName, ddl] of indexes) {
    if (!(await indexExists(tableName, indexName))) {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` ${ddl}`);
    }
  }
}

async function ensureCompany(name: string) {
  return prisma.company.upsert({
    where: { name },
    update: { is_active: true },
    create: { name, is_active: true },
  });
}

async function ensureClientCompany(name: string, gstin: string) {
  return prisma.clientCompany.upsert({
    where: { name },
    update: { is_active: true, address: `${name} address`, gstin },
    create: { name, is_active: true, address: `${name} address`, gstin },
  });
}

async function ensureCategory(name: string, code: string, companyId: number) {
  const existing = await prisma.renewalServiceCategory.findFirst({
    where: { name, company_id: companyId, is_active: true } as any,
  });
  if (existing) return existing;
  return (prisma as any).renewalServiceCategory.create({
    data: { name, code, company_id: companyId, is_active: true },
  });
}

async function ensureService(name: string, categoryId: number, companyId: number, trinetra = false) {
  const existing = await prisma.renewalServiceMaster.findFirst({
    where: { name, company_id: companyId, is_active: true } as any,
  });
  if (existing) return existing;
  return (prisma as any).renewalServiceMaster.create({
    data: {
      name,
      category_id: categoryId,
      company_id: companyId,
      identifier_label: trinetra ? 'Vehicle / Device ID' : 'Domain / Server Identifier',
      requires_identifier: !trinetra,
      supports_provider: !trinetra,
      supports_server_name: !trinetra,
      supports_plan_name: !trinetra,
      supports_login_username: !trinetra,
      supports_quantity: true,
      requires_quantity: trinetra,
      quantity_label: trinetra ? 'No. of Vehicles' : 'No. of Email IDs',
      default_duration_value: 12,
      default_duration_unit: 'months',
      is_active: true,
    },
  });
}

function headerText(value: any) {
  if (value?.richText) return value.richText.map((part: any) => part.text || '').join('');
  return String(value || '');
}

function setRowByHeader(sheet: ExcelJS.Worksheet, rowNumber: number, values: Record<string, any>) {
  const headers = (sheet.getRow(1).values as any[]).map(headerText);
  const row = sheet.getRow(rowNumber);
  headers.forEach((header, index) => {
    if (index > 0 && Object.prototype.hasOwnProperty.call(values, header)) {
      row.getCell(index).value = values[header];
    }
  });
  row.commit();
}

async function workbookFromReference(fileName: string, values: Record<string, any>) {
  const reference = new ExcelJS.Workbook();
  await reference.xlsx.readFile(path.resolve(__dirname, '../../..', fileName));
  const referenceSheet = reference.getWorksheet('Full Renewals Bulk Upload') || reference.worksheets[1];
  if (!referenceSheet) throw new Error(`Upload sheet not found in ${fileName}`);

  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Master_References').addRow(['Companies', 'Categories', 'Services']);
  const sheet = workbook.addWorksheet('Full Renewals Bulk Upload');
  sheet.addRow((referenceSheet.getRow(1).values as any[]).slice(1).map(headerText));
  setRowByHeader(sheet, 2, values);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function printAccounts(label: string, orderNumbers: string[]) {
  const accounts = await prisma.renewalAccount.findMany({
    where: { order_number: { in: orderNumbers } },
    include: {
      client_company: { select: { name: true } },
      services: {
        include: {
          service_master: { select: { name: true, company_id: true } },
          cycles: { select: { id: true, amount_due: true, amount_collected: true, outstanding: true, expiry_date: true } },
        },
      },
      contacts: { include: { contact: { select: { name: true, email: true, mobile: true, role: true } } } },
    },
    orderBy: { id: 'asc' },
  });
  console.log(`\n${label}`);
  console.dir(accounts.map(account => ({
    account_id: account.id,
    parent_company_id: account.company_id,
    client_company: account.client_company.name,
    order_number: account.order_number,
    status: account.status,
    contacts: account.contacts.map(link => link.contact),
    services: account.services.map(service => ({
      instance_id: service.id,
      service_name: service.service_master.name,
      service_master_company_id: (service.service_master as any).company_id,
      identifier: service.identifier,
      quantity: service.quantity,
      amount_due: String(service.amount_due),
      expiry_date: service.expiry_date,
      cycles: service.cycles.map(cycle => ({
        id: cycle.id,
        amount_due: String(cycle.amount_due),
        amount_collected: String(cycle.amount_collected),
        outstanding: String(cycle.outstanding),
        expiry_date: cycle.expiry_date,
      })),
    })),
  })), { depth: null });

  const rawLinks = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ra.id AS account_id, ra.order_number, rac.contact_id, rc.name, rc.email, rc.mobile
     FROM renewal_account ra
     JOIN renewal_account_contact rac ON rac.renewal_account_id = ra.id
     JOIN renewal_contact rc ON rc.id = rac.contact_id
     WHERE ra.order_number IN (${orderNumbers.map(() => '?').join(',')})
     ORDER BY ra.id, rac.contact_id`,
    ...orderNumbers
  );
  console.log('\nRaw renewal_account_contact links');
  console.dir(rawLinks, { depth: null });
}

async function main() {
  await ensureCompanyScopedMasterSchema();

  const angler = await ensureCompany('ANGLER');
  const trinetra = await ensureCompany('TRINETRA');
  const user = await prisma.user.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } });
  const userId = user?.id || 1;

  const anglerClient = await ensureClientCompany(`ZZ Test ANGLER Client ${runTag}`, `29ANG${runTag.slice(-6)}Z5`);
  const trinetraClient = await ensureClientCompany(`ZZ Test TRINETRA Client ${runTag}`, `29TRN${runTag.slice(-6)}Z5`);

  const anglerCat = await ensureCategory(`ANGLER Domain ${runTag}`, `ANG_DOMAIN_${runTag.slice(-8)}`, angler.id);
  const trinetraCat = await ensureCategory(`TRINETRA Fleet ${runTag}`, `TRN_FLEET_${runTag.slice(-8)}`, trinetra.id);
  await ensureService(`ANGLER Domain Renewal ${runTag}`, anglerCat.id, angler.id, false);
  await ensureService(`TRINETRA Fleet Renewal ${runTag}`, trinetraCat.id, trinetra.id, true);

  const anglerOrder = `ANG-${runTag}`;
  const trinetraOrder = `TRN-${runTag}`;
  const newMasterOrder = `ANG-NEW-${runTag}`;

  const anglerBuffer = await workbookFromReference('ANGLER_Full_Renewal_Bulk_Import_Template.xlsx', {
    'Client Company Name *': anglerClient.name,
    Address: anglerClient.address,
    'GST Number': anglerClient.gstin,
    'Order Number': anglerOrder,
    'Order Date': '2026-08-29',
    'PO Reference': `PO-${runTag}`,
    'Invoice Number': `INV-${runTag}`,
    'Invoice Date': '2026-08-29',
    'Contact Name *': 'Actual ANGLER Contact',
    'Contact Email': `angler.${runTag.toLowerCase()}@example.com`,
    'Contact Mobile': '9000000001',
    'Contact Role': 'PRIMARY',
    'Service Category *': anglerCat.name,
    'Service Master Name *': `ANGLER Domain Renewal ${runTag}`,
    'Domain / Server Identifier *': `actual-${runTag.toLowerCase()}.com`,
    Status: 'Renewal',
    'Login User  Name': `admin.${runTag.toLowerCase()}@example.com`,
    'Activation Date (YYYY-MM-DD)': '2026-08-29',
    'Expiry Date * (YYYY-MM-DD)': '2027-08-28',
    'Quantity to be renamed as No. of Email ids': 10,
    'Amount Due (INR) *': 12500,
    'Amount Collected (INR)': 2500,
    'Cycle Status': 'ACTIVE',
    Notes: `Actual ANGLER import ${runTag}`,
  });

  const trinetraBuffer = await workbookFromReference('TRINETRA_Full_Renewal_Bulk_Import_Template.xlsx', {
    'Client Company Name *': trinetraClient.name,
    'Order Number': trinetraOrder,
    'Order Date': '2026-08-29',
    'PO Reference': `PO-TRN-${runTag}`,
    'Invoice Number': `INV-TRN-${runTag}`,
    'Contact Name *': 'Actual TRINETRA Contact',
    'Contact Email': `trinetra.${runTag.toLowerCase()}@example.com`,
    'Contact Mobile': '9000000002',
    'Contact Role': 'PRIMARY',
    'Service Category *': trinetraCat.name,
    'Service Master Name *': `TRINETRA Fleet Renewal ${runTag}`,
    'Domain / Server Identifier *': `VEH-${runTag}`,
    'Activation Date (YYYY-MM-DD)': '2026-08-29',
    'Expiry Date * (YYYY-MM-DD)': '2027-08-28',
    Quantity: 25,
    'Amount Due (INR) *': 150000,
    'Amount Collected (INR)': 50000,
    'Cycle Status': 'ACTIVE',
    Notes: `Actual TRINETRA import ${runTag}`,
  });

  const newMasterBuffer = await workbookFromReference('ANGLER_Full_Renewal_Bulk_Import_Template.xlsx', {
    'Client Company Name *': anglerClient.name,
    'Order Number': newMasterOrder,
    'Contact Name *': 'Actual New Master Contact',
    'Contact Email': `newmaster.${runTag.toLowerCase()}@example.com`,
    'Contact Mobile': '9000000003',
    'Contact Role': 'PRIMARY',
    'Service Category *': `ANGLER New Category ${runTag}`,
    'Service Master Name *': `ANGLER New Service ${runTag}`,
    'Domain / Server Identifier *': `new-${runTag.toLowerCase()}.com`,
    'Expiry Date * (YYYY-MM-DD)': '2027-08-28',
    'Amount Due (INR) *': 9999,
    'Amount Collected (INR)': 0,
    Notes: `Actual new master import ${runTag}`,
  });

  console.log('Run tag:', runTag);
  console.log('Parent companies:', { angler, trinetra });
  console.log('Client companies:', { anglerClient, trinetraClient });

  const anglerResult = await processBulkUpload(anglerBuffer, 'FULL_RENEWAL', userId, angler.id);
  const trinetraResult = await processBulkUpload(trinetraBuffer, 'TRINETRA_V2', userId, trinetra.id);
  const newMasterResult = await processBulkUpload(newMasterBuffer, 'FULL_RENEWAL', userId, angler.id);
  const duplicateUpdateResult = await processBulkUpload(anglerBuffer, 'FULL_RENEWAL', userId, angler.id);

  console.log('\nImport results');
  console.dir({ anglerResult, trinetraResult, newMasterResult, duplicateUpdateResult }, { depth: null });

  await printAccounts('Accounts created/updated by actual workbook imports', [anglerOrder, trinetraOrder, newMasterOrder]);

  const scopedMasters = await prisma.renewalServiceMaster.findMany({
    where: {
      name: { in: [`ANGLER Domain Renewal ${runTag}`, `TRINETRA Fleet Renewal ${runTag}`, `ANGLER New Service ${runTag}`] },
    },
    select: { id: true, name: true, company_id: true, category: { select: { name: true, company_id: true } } },
    orderBy: { id: 'asc' },
  });
  console.log('\nScoped service masters');
  console.dir(scopedMasters, { depth: null });
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

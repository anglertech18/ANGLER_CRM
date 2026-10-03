import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { processBulkUpload } from '../services/renewalBulkUploadService';
import { seedRenewalCompanyMasters } from './seedRenewalCompanyMasters';

type WorkbookSpec = {
  label: 'ANGLER' | 'TRINETRA';
  fileName: string;
  templateType: 'FULL_RENEWAL' | 'TRINETRA_V2';
  parentCompanyNeedle: string;
};

const specs: WorkbookSpec[] = [
  {
    label: 'ANGLER',
    fileName: 'ANGLER_Full_Renewal_Bulk_Import_Template.xlsx',
    templateType: 'FULL_RENEWAL',
    parentCompanyNeedle: 'ANGLER',
  },
  {
    label: 'TRINETRA',
    fileName: 'TRINETRA_Full_Renewal_Bulk_Import_Template.xlsx',
    templateType: 'TRINETRA_V2',
    parentCompanyNeedle: 'Trinetra',
  },
];

function cellText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text || '').trim();
    if ('richText' in value) return value.richText.map((part: any) => part.text || '').join('').trim();
    if ('result' in value) return String(value.result || '').trim();
  }
  return String(value).trim();
}

function findHeaderIndex(headers: any[], names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (let index = 1; index < headers.length; index++) {
    const normalizedHeader = cellText(headers[index]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedNames.some((name) => normalizedHeader.includes(name))) return index;
  }
  return null;
}

async function getWorkbookRows(fileName: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(__dirname, '../../..', fileName));
  const sheet = workbook.worksheets.find((candidate) => {
    const headers = candidate.getRow(1).values as any[];
    return findHeaderIndex(headers, ['Client Company Name']) && findHeaderIndex(headers, ['Service Master Name']);
  });
  if (!sheet) throw new Error(`Data sheet not found in ${fileName}`);

  const headers = sheet.getRow(1).values as any[];
  const cols = {
    company: findHeaderIndex(headers, ['Client Company Name']),
    address: findHeaderIndex(headers, ['Address']),
    gstin: findHeaderIndex(headers, ['GST Number', 'GST']),
    orderNumber: findHeaderIndex(headers, ['Order Number']),
    contactName: findHeaderIndex(headers, ['Contact Name']),
    contactEmail: findHeaderIndex(headers, ['Contact Email']),
    serviceCategory: findHeaderIndex(headers, ['Service Category']),
    serviceName: findHeaderIndex(headers, ['Service Master Name']),
    identifier: findHeaderIndex(headers, ['Domain Server Identifier']),
    provider: findHeaderIndex(headers, ['Service Provider Name', 'Provider Name']),
    serverName: findHeaderIndex(headers, ['Server Account Sub Item', 'Server Name']),
    planName: findHeaderIndex(headers, ['Service Plan Name']),
    amountDue: findHeaderIndex(headers, ['Amount Due']),
    amountCollected: findHeaderIndex(headers, ['Amount Collected']),
  };

  const rows: any[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const values = sheet.getRow(rowNumber).values as any[];
    const row = {
      rowNumber,
      companyName: cols.company ? cellText(values[cols.company]) : '',
      address: cols.address ? cellText(values[cols.address]) : '',
      gstin: cols.gstin ? cellText(values[cols.gstin]) : '',
      orderNumber: cols.orderNumber ? cellText(values[cols.orderNumber]) : '',
      contactName: cols.contactName ? cellText(values[cols.contactName]) : '',
      contactEmail: cols.contactEmail ? cellText(values[cols.contactEmail]) : '',
      serviceCategory: cols.serviceCategory ? cellText(values[cols.serviceCategory]) : '',
      serviceName: cols.serviceName ? cellText(values[cols.serviceName]) : '',
      identifier: cols.identifier ? cellText(values[cols.identifier]) : '',
      provider: cols.provider ? cellText(values[cols.provider]) : '',
      serverName: cols.serverName ? cellText(values[cols.serverName]) : '',
      planName: cols.planName ? cellText(values[cols.planName]) : '',
      amountDue: cols.amountDue ? cellText(values[cols.amountDue]) : '',
      amountCollected: cols.amountCollected ? cellText(values[cols.amountCollected]) : '',
    };
    if (Object.values(row).some(Boolean)) rows.push(row);
  }
  return rows.filter((row) => row.companyName && row.serviceName);
}

async function findParentCompany(needle: string) {
  const company = await (prisma as any).company.findFirst({
    where: { name: { contains: needle }, is_active: true },
    orderBy: { id: 'desc' },
  });
  if (!company) throw new Error(`Parent company not found: ${needle}`);
  return company;
}

async function ensureClientCompanies(rows: any[]) {
  const results: any[] = [];
  for (const row of rows) {
    const existing = await (prisma as any).clientCompany.findFirst({
      where: { name: { equals: row.companyName } },
      select: { id: true, name: true, address: true, gstin: true },
    });
    if (existing) {
      const updated = await (prisma as any).clientCompany.update({
        where: { id: existing.id },
        data: {
          is_active: true,
          ...(row.address ? { address: row.address } : {}),
          ...(row.gstin ? { gstin: row.gstin } : {}),
        },
        select: { id: true, name: true, address: true, gstin: true },
      });
      results.push({ action: 'updated', ...updated });
    } else {
      const created = await (prisma as any).clientCompany.create({
        data: {
          name: row.companyName,
          is_active: true,
          address: row.address || null,
          gstin: row.gstin || null,
        },
        select: { id: true, name: true, address: true, gstin: true },
      });
      results.push({ action: 'created', ...created });
    }
  }
  const seen = new Set<number>();
  return results.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

async function verifyImportedRows(label: string, parentCompanyId: number, sourceRows: any[]) {
  const orderNumbers = Array.from(new Set(sourceRows.map((row) => row.orderNumber).filter(Boolean)));
  const accounts = await (prisma as any).renewalAccount.findMany({
    where: {
      company_id: parentCompanyId,
      ...(orderNumbers.length ? { order_number: { in: orderNumbers } } : {}),
      client_company: { name: { in: Array.from(new Set(sourceRows.map((row) => row.companyName))) } },
      is_active: true,
    },
    include: {
      client_company: { select: { id: true, name: true, address: true, gstin: true } },
      contacts: {
        include: {
          contact: { select: { id: true, client_company_id: true, name: true, email: true, mobile: true, role: true } },
        },
      },
      services: {
        include: {
          service_master: {
            select: {
              id: true,
              name: true,
              company_id: true,
              category: { select: { id: true, name: true, company_id: true } },
            },
          },
          provider: { select: { id: true, name: true, category_code: true } },
          customer_contact: { select: { id: true, name: true, email: true } },
          cycles: {
            where: { is_active: true },
            select: { id: true, amount_due: true, amount_collected: true, outstanding: true, expiry_date: true, status: true },
          },
        },
      },
    },
    orderBy: [{ client_company_id: 'asc' }, { id: 'asc' }],
  });

  const rows = accounts.flatMap((account: any) =>
    account.services.map((service: any) => ({
      account_id: account.id,
      client_company: account.client_company.name,
      parent_company_id: account.company_id,
      order_number: account.order_number,
      account_status: account.status,
      contact_names: account.contacts.map((link: any) => link.contact.name),
      service_instance_id: service.id,
      service_master: service.service_master.name,
      service_master_company_id: service.service_master.company_id,
      category: service.service_master.category?.name,
      category_company_id: service.service_master.category?.company_id,
      identifier: service.identifier,
      provider: service.provider?.name || null,
      login_username: service.login_username,
      server_name: service.server_name,
      plan_name: service.plan_name,
      quantity: service.quantity,
      amount_due: String(service.amount_due),
      amount_collected: service.cycles[0] ? String(service.cycles[0].amount_collected) : '0',
      outstanding: service.cycles[0] ? String(service.cycles[0].outstanding) : null,
      cycle_count: service.cycles.length,
      customer_contact: service.customer_contact?.name || null,
    }))
  );

  const mismatches = rows.filter((row: any) =>
    row.parent_company_id !== parentCompanyId ||
    (row.service_master_company_id !== parentCompanyId && row.service_master_company_id !== null) ||
    (row.category_company_id !== parentCompanyId && row.category_company_id !== null)
  );

  console.log(`\n${label} DB verification`);
  console.dir({
    parentCompanyId,
    sourceRows: sourceRows.length,
    accounts: accounts.length,
    serviceInstances: rows.length,
    mappingMismatches: mismatches,
    rows,
  }, { depth: null });
}

async function main() {
  await seedRenewalCompanyMasters();

  const user = await (prisma as any).user.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { id: 'asc' },
    select: { id: true, first_name: true, last_name: true },
  });
  if (!user) throw new Error('No active user found for import audit');

  for (const spec of specs) {
    const filePath = path.resolve(__dirname, '../../..', spec.fileName);
    if (!fs.existsSync(filePath)) throw new Error(`Workbook not found: ${filePath}`);

    const parentCompany = await findParentCompany(spec.parentCompanyNeedle);
    const sourceRows = await getWorkbookRows(spec.fileName);
    const clients = await ensureClientCompanies(sourceRows);

    const result = await processBulkUpload(fs.readFileSync(filePath), spec.templateType, user.id, parentCompany.id);

    console.log(`\n${spec.label} import result`);
    console.dir({
      parentCompany: { id: parentCompany.id, name: parentCompany.name },
      importedBy: user,
      clientCompaniesPrepared: clients,
      result,
    }, { depth: null });

    await verifyImportedRows(spec.label, parentCompany.id, sourceRows);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

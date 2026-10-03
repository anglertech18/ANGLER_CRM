import path from 'path';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';

type RefData = {
  categories: string[];
  services: string[];
  policies: string[];
  users: string[];
  uploadCategories: string[];
  uploadServices: string[];
};

function text(value: any) {
  if (value?.richText) return value.richText.map((part: any) => part.text || '').join('');
  if (value?.text) return value.text;
  if (value?.result !== undefined) return String(value.result);
  return String(value ?? '').trim();
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

async function readReference(fileName: string): Promise<RefData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(__dirname, '../../..', fileName));
  const sheet = workbook.getWorksheet('Master_References');
  if (!sheet) throw new Error(`Master_References not found in ${fileName}`);

  const categories: string[] = [];
  const services: string[] = [];
  const policies: string[] = [];
  const users: string[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    categories.push(text(row.getCell(2).value));
    services.push(text(row.getCell(3).value));
    policies.push(text(row.getCell(7).value));
    users.push(text(row.getCell(8).value));
  }

  const uploadSheet = workbook.getWorksheet('Full Renewals Bulk Upload');
  const uploadCategories: string[] = [];
  const uploadServices: string[] = [];
  if (uploadSheet) {
    const headerRow = uploadSheet.getRow(1);
    const rawHeaders = headerRow.values as any[];
    const headers = Array.from({ length: rawHeaders.length }, (_, index) => text(rawHeaders[index]).toLowerCase());
    const categoryIndex = headers.findIndex(header => header.includes('service category'));
    const serviceIndex = headers.findIndex(header => header.includes('service master'));
    for (let rowNumber = 2; rowNumber <= uploadSheet.rowCount; rowNumber++) {
      const row = uploadSheet.getRow(rowNumber);
      if (categoryIndex > 0) uploadCategories.push(text(row.getCell(categoryIndex).value));
      if (serviceIndex > 0) uploadServices.push(text(row.getCell(serviceIndex).value));
    }
  }

  return {
    categories: unique(categories),
    services: unique(services),
    policies: unique(policies),
    users: unique(users),
    uploadCategories: unique(uploadCategories),
    uploadServices: unique(uploadServices),
  };
}

async function getCompany(name: string) {
  const rows = await (prisma as any).company.findMany({
    where: { name: { contains: name }, is_active: true },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
  const exact = rows.find((row: any) => row.name.toLowerCase() === name.toLowerCase());
  return { selected: exact || rows[0] || null, matches: rows };
}

async function getDbFlow(companyId: number) {
  const categories = await (prisma as any).renewalServiceCategory.findMany({
    where: { is_active: true, company_id: companyId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  const services = await (prisma as any).renewalServiceMaster.findMany({
    where: { is_active: true, company_id: companyId },
    select: {
      id: true,
      name: true,
      category: { select: { name: true } },
      identifier_label: true,
      requires_identifier: true,
      supports_provider: true,
      supports_server_name: true,
      supports_plan_name: true,
      supports_login_username: true,
      supports_quantity: true,
      requires_quantity: true,
      quantity_label: true,
    },
    orderBy: { name: 'asc' },
  });
  return { categories, services };
}

function diff(expected: string[], actual: string[]) {
  const actualLower = new Set(actual.map(value => value.toLowerCase()));
  const expectedLower = new Set(expected.map(value => value.toLowerCase()));
  return {
    missingInDb: expected.filter(value => !actualLower.has(value.toLowerCase())),
    extraInDb: actual.filter(value => !expectedLower.has(value.toLowerCase())),
  };
}

async function main() {
  const [anglerRef, trinetraRef] = await Promise.all([
    readReference('ANGLER_Full_Renewal_Bulk_Import_Template.xlsx'),
    readReference('TRINETRA_Full_Renewal_Bulk_Import_Template.xlsx'),
  ]);

  const anglerCompany = await getCompany('ANGLER');
  const trinetraCompany = await getCompany('Trinetra');
  if (!anglerCompany.selected || !trinetraCompany.selected) throw new Error('Required parent companies are missing');

  const [anglerDb, trinetraDb, brandProfiles] = await Promise.all([
    getDbFlow(anglerCompany.selected.id),
    getDbFlow(trinetraCompany.selected.id),
    (prisma as any).renewalBrandProfile.findMany({
      where: { company_id: { in: [anglerCompany.selected.id, trinetraCompany.selected.id] }, is_active: true },
      select: { id: true, profile_name: true, company_id: true, company_name: true, sender_email: true },
      orderBy: { company_id: 'asc' },
    }),
  ]);

  const report = {
    companyCheck: {
      angler: {
        selectedExistingCompany: anglerCompany.selected,
        allMatchingCompanies: anglerCompany.matches,
        createdDuplicateForSeed: false,
      },
      trinetra: {
        selectedExistingCompany: trinetraCompany.selected,
        allMatchingCompanies: trinetraCompany.matches,
        createdDuplicateForSeed: false,
      },
    },
    brandProfiles,
    workbookComparison: {
      angler: {
        workbookCategories: anglerRef.categories,
        uploadRowCategories: anglerRef.uploadCategories,
        dbCategories: anglerDb.categories.map((category: any) => category.name),
        categoryDiff: diff(anglerRef.categories, anglerDb.categories.map((category: any) => category.name)),
        workbookServices: anglerRef.services,
        uploadRowServices: anglerRef.uploadServices,
        dbServices: anglerDb.services.map((service: any) => service.name),
        serviceDiff: diff(anglerRef.services, anglerDb.services.map((service: any) => service.name)),
        uploadRowDiff: {
          categories: diff(anglerRef.uploadCategories, anglerDb.categories.map((category: any) => category.name)),
          services: diff(anglerRef.uploadServices, anglerDb.services.map((service: any) => service.name)),
        },
      },
      trinetra: {
        workbookCategories: trinetraRef.categories,
        uploadRowCategories: trinetraRef.uploadCategories,
        dbCategories: trinetraDb.categories.map((category: any) => category.name),
        categoryDiff: diff(trinetraRef.categories, trinetraDb.categories.map((category: any) => category.name)),
        workbookServices: trinetraRef.services,
        uploadRowServices: trinetraRef.uploadServices,
        dbServices: trinetraDb.services.map((service: any) => service.name),
        serviceDiff: diff(trinetraRef.services, trinetraDb.services.map((service: any) => service.name)),
        uploadRowDiff: {
          categories: diff(trinetraRef.uploadCategories, trinetraDb.categories.map((category: any) => category.name)),
          services: diff(trinetraRef.uploadServices, trinetraDb.services.map((service: any) => service.name)),
        },
      },
    },
    createFlow: {
      angler: anglerDb.categories.map((category: any) => ({
        selectCategory: category.name,
        servicesShown: anglerDb.services
          .filter((service: any) => service.category?.name === category.name)
          .map((service: any) => ({
            selectService: service.name,
            fieldsShown: {
              identifier: service.requires_identifier ? service.identifier_label : 'optional',
              serviceProvider: service.supports_provider,
              serverName: service.supports_server_name,
              servicePlan: service.supports_plan_name,
              loginUsername: service.supports_login_username,
              quantity: service.supports_quantity ? service.quantity_label || 'Quantity' : false,
            },
          })),
      })),
      trinetra: trinetraDb.categories.map((category: any) => ({
        selectCategory: category.name,
        servicesShown: trinetraDb.services
          .filter((service: any) => service.category?.name === category.name)
          .map((service: any) => ({
            selectService: service.name,
            fieldsShown: {
              identifier: service.requires_identifier ? service.identifier_label : 'optional',
              serviceProvider: service.supports_provider,
              serverName: service.supports_server_name,
              servicePlan: service.supports_plan_name,
              loginUsername: service.supports_login_username,
              quantity: service.supports_quantity ? service.quantity_label || 'Quantity' : false,
            },
          })),
      })),
    },
  };

  console.dir(report, { depth: null });
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

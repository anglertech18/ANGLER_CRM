import path from 'path';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

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

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(__dirname, '../../..', 'TRINETRA_Full_Renewal_Bulk_Import_Template.xlsx'));
  const sheet = workbook.getWorksheet('Full Renewals Bulk Upload') || workbook.worksheets[1];
  const headers = sheet.getRow(1).values as any[];
  const row = sheet.getRow(2).values as any[];
  const keys = ['Activation Date', 'Expiry Date', 'Quantity', 'Amount Due', 'Month', 'Amount Collected', 'Cycle Status', 'Reminder Policy Name'];
  console.dir(keys.map((key) => {
    const index = findHeaderIndex(headers, [key]);
    const raw = row[index || 0];
    return {
      key,
      index,
      header: cellText(headers[index || 0]),
      value: cellText(raw),
      rawType: raw instanceof Date ? 'Date' : typeof raw,
      dayjsValid: raw ? dayjs(raw).isValid() : null,
      parsed: raw && dayjs(raw).isValid() ? dayjs(raw).toISOString() : null,
    };
  }), { depth: null });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

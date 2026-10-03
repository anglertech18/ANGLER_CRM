import path from 'path';
import ExcelJS from 'exceljs';

function cellText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text || '').trim();
    if ('richText' in value) return value.richText.map((part: any) => part.text || '').join('').trim();
    if ('result' in value) return String(value.result || '').trim();
  }
  return String(value).trim();
}

async function inspect(fileName: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(__dirname, '../../..', fileName));
  console.log(`\n${fileName}`);
  console.log('sheets:', workbook.worksheets.map((sheet) => sheet.name));

  for (const sheet of workbook.worksheets) {
    const headerValues = (sheet.getRow(1).values as any[]).slice(1).map(cellText);
    const rows: any[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const values = (row.values as any[]).slice(1).map(cellText);
      if (values.some(Boolean)) {
        rows.push({ rowNumber, values });
      }
    }
    console.dir({
      sheet: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      headers: headerValues,
      nonEmptyRows: rows.length,
      sampleRows: rows.slice(0, 5),
    }, { depth: null });
  }
}

async function main() {
  await inspect('ANGLER_Full_Renewal_Bulk_Import_Template.xlsx');
  await inspect('TRINETRA_Full_Renewal_Bulk_Import_Template.xlsx');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

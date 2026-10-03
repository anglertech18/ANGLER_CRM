import { readFileSync, writeFileSync } from 'fs';

for (const file of [
  'server/src/scripts/seedOrderFormTemplate.ts',
  'server/src/scripts/seedTrinetraOrderFormTemplate.ts',
]) {
  let c = readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  c = c.split(/\r?\n/).join('\n');

  // Replace header-top flex with table
  c = c.replace(
    /\.header-top\s*\{[^}]+\}/g,
    '.header-top { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; font-weight: bold; }'
  );

  // Replace footer-row flex with table
  c = c.replace(
    /\.footer-row\s*\{[^}]+\}/g,
    '.footer-row { width: 100%; border-collapse: collapse; }'
  );

  // In HTML: convert header-top div to table
  c = c.replace(
    /<!-- Header Top Links -->\s*<div class="header-top">\s*<span>(.*?)<\/span>\s*<span>(.*?)<\/span>\s*<\/div>/gs,
    `<!-- Header Top Links -->
  <table class="header-top" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="left" style="font-size:11px;font-weight:bold;">$1</td>
      <td align="right" style="font-size:11px;font-weight:bold;">$2</td>
    </tr>
  </table>`
  );

  // In HTML: convert footer-row div to table
  c = c.replace(
    /<div class="footer-row">\s*<div>(.*?)<\/div>\s*<div(.*?)>(.*?)<\/div>\s*<\/div>/gs,
    `<table class="footer-row" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="left" valign="bottom">$1</td>
        <td align="right" valign="bottom"$2>$3</td>
      </tr>
    </table>`
  );

  if (isCRLF) c = c.split('\n').join('\r\n');
  writeFileSync(file, c, 'utf8');
  console.log(`✅ ${file} updated for Outlook table compatibility`);
}

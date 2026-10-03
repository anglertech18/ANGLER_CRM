const fs = require('fs');
const content = fs.readFileSync('f:/crm/angler_crm/server/src/controllers/sealController.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('orderBy: { date: \'desc\' }')) {
    console.log(`Line ${i + 1}: [${line}]`);
    console.log('Hex:', Buffer.from(line).toString('hex'));
  }
});

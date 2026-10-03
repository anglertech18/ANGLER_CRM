import { readFileSync, writeFileSync } from 'fs';

const file = 'server/src/controllers/renewalFollowUpController.ts';
let c = readFileSync(file, 'utf8');
const isCRLF = c.includes('\r\n');
c = c.split(/\r?\n/).join('\n');

const oldCode = `          const lastStep = await tx.renewalReminder.findFirst({
            where: { cycle_id: currentReminder.cycle_id },
            orderBy: { step_number: 'desc' },
            select: { step_number: true },
          });
          const nextStepNum = (lastStep?.step_number || currentReminder.step_number || 0) + 1;`;

const newCode = `          const nextStepNum = (currentReminder.step_number || 0) + 1;`;

if (c.includes(oldCode)) {
  c = c.replace(oldCode, newCode);
  console.log('✅ simplified nextStepNum without extra db query');
}

if (isCRLF) c = c.split('\n').join('\r\n');
writeFileSync(file, c, 'utf8');

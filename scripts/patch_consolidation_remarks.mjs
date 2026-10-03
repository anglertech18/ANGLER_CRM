import { readFileSync, writeFileSync } from 'fs';

const file = 'server/src/services/reminderConsolidationService.ts';
let c = readFileSync(file, 'utf8');
const isCRLF = c.includes('\r\n');
c = c.split(/\r?\n/).join('\n');

const oldBlock = `      // Mark the primary (earliest) reminder as SENT with CONSOLIDATED_DIGEST tag
      await (prisma as any).renewalReminder.update({
        where: { id: primaryReminder.id },
        data: {
          status: 'SENT',
          action_type: 'CONSOLIDATED_DIGEST',
          remarks: \`Sent consolidated digest for \${uniqueServices.length} services to \${toHeader}\${ccHeader ? \` (CC: \${ccHeader})\` : ''} with attached Order Form PDF\`,
        }
      });

      // Mark all subsequent reminders in this same month group as COMBINED_SENT
      for (let i = 1; i < reminders.length; i++) {
        const rem = reminders[i];
        await (prisma as any).renewalReminder.update({
          where: { id: rem.id },
          data: {
            status: 'SENT',
            action_type: 'COMBINED_SENT',
            remarks: \`Bundled into Consolidated Digest #\${primaryReminder.id} (\${subject})\`,
          }
        });
      }`;

const newBlock = `      // Mark the primary (earliest) reminder as SENT with CONSOLIDATED_DIGEST tag
      await (prisma as any).renewalReminder.update({
        where: { id: primaryReminder.id },
        data: {
          status: 'SENT',
          action_type: 'CONSOLIDATED_DIGEST',
          completed_at: new Date(),
        }
      });

      // Mark all subsequent reminders in this same month group as COMBINED_SENT
      for (let i = 1; i < reminders.length; i++) {
        const rem = reminders[i];
        await (prisma as any).renewalReminder.update({
          where: { id: rem.id },
          data: {
            status: 'SENT',
            action_type: 'COMBINED_SENT',
            completed_at: new Date(),
          }
        });
      }`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  console.log('✅ reminderConsolidationService.ts: removed invalid remarks argument from renewalReminder.update');
} else {
  console.error('❌ reminderConsolidationService.ts: target not found');
}

if (isCRLF) c = c.split('\n').join('\r\n');
writeFileSync(file, c, 'utf8');

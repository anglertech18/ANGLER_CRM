import { PrismaClient } from '@prisma/client';
import { dualWriteReminderCreated } from '../services/renewalDualWriteService';

const prisma = new PrismaClient();

async function main() {
  console.log('=== MULTI-CHANNEL FOLLOW-UP BACKFILL SCRIPT ===');
  
  const reminders = await (prisma as any).renewalReminder.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${reminders.length} legacy RenewalReminder records to migrate...`);

  let count = 0;
  for (const r of reminders) {
    await dualWriteReminderCreated(r.id, 1);
    count++;
    if (count % 100 === 0 || count === reminders.length) {
      console.log(`Processed ${count}/${reminders.length} reminders...`);
    }
  }

  const taskCount = await (prisma as any).renewalFollowUpTask.count();
  const channelActionCount = await (prisma as any).renewalFollowUpChannelAction.count();

  console.log('=== BACKFILL COMPLETE ===');
  console.log('RenewalFollowUpTask Count:', taskCount);
  console.log('RenewalFollowUpChannelAction Count:', channelActionCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());

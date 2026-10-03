import { readFileSync, writeFileSync } from 'fs';

const file = 'server/src/controllers/renewalFollowUpController.ts';
let c = readFileSync(file, 'utf8');
const isCRLF = c.includes('\r\n');
c = c.split(/\r?\n/).join('\n');

// 1. In buildFollowUpQueueWhere: keep where.assigned_user_id = null for UNASSIGNED
const oldWhereBlock = `  } else if (assignedUser === 'UNASSIGNED') {
    where.AND = [
      { assigned_user_id: null },
      { cycle: { service_instance: { assigned_user_id: null } } },
      { cycle: { service_instance: { renewal_account: { renewal_executive_id: null } } } },
    ];
  } else if (assignedUser) {`;

const newWhereBlock = `  } else if (assignedUser === 'UNASSIGNED') {
    where.assigned_user_id = null;
    where.AND = [
      ...(where.AND || []),
      { cycle: { service_instance: { assigned_user_id: null } } },
      { cycle: { service_instance: { renewal_account: { renewal_executive_id: null } } } },
    ];
  } else if (assignedUser) {`;

if (c.includes(oldWhereBlock)) {
  c = c.replace(oldWhereBlock, newWhereBlock);
  console.log('✅ where.assigned_user_id = null restored for UNASSIGNED');
} else {
  console.error('❌ oldWhereBlock not found');
}

// 2. In completeFollowUp: replace aggregate with findFirst
const oldAgg = `          const maxStep = await tx.renewalReminder.aggregate({
            where: { cycle_id: currentReminder.cycle_id },
            _max: { step_number: true },
          });
          const nextStepNum = (maxStep?._max?.step_number || currentReminder.step_number || 0) + 1;`;

const newAgg = `          const lastStep = await tx.renewalReminder.findFirst({
            where: { cycle_id: currentReminder.cycle_id },
            orderBy: { step_number: 'desc' },
            select: { step_number: true },
          });
          const nextStepNum = (lastStep?.step_number || currentReminder.step_number || 0) + 1;`;

if (c.includes(oldAgg)) {
  c = c.replace(oldAgg, newAgg);
  console.log('✅ tx.renewalReminder.aggregate replaced with findFirst');
} else {
  console.error('❌ oldAgg not found');
}

if (isCRLF) c = c.split('\n').join('\r\n');
writeFileSync(file, c, 'utf8');

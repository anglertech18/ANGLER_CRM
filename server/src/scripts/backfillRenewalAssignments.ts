import { prisma } from '../lib/prisma';

function getOptionalCompanyId(): number | null {
  const argument = process.argv.find((value) => value.startsWith('--company-id='));
  if (!argument) return null;
  const companyId = Number(argument.split('=')[1]);
  return Number.isInteger(companyId) && companyId > 0 ? companyId : null;
}

async function main(): Promise<void> {
  const companyId = getOptionalCompanyId();
  const apply = process.argv.includes('--apply');

  console.log(`[Backfill] Mode: ${apply ? 'APPLY' : 'DRY_RUN'}, Company filter: ${companyId ?? 'ALL'}`);

  // 1. Find service instances missing assigned_user_id where renewal_account has renewal_executive_id
  const serviceCandidates = await (prisma as any).renewalServiceInstance.findMany({
    where: {
      assigned_user_id: null,
      is_active: true,
      renewal_account: {
        ...(companyId ? { company_id: companyId } : {}),
        renewal_executive_id: { not: null },
      },
    },
    select: {
      id: true,
      renewal_account_id: true,
      renewal_account: { select: { renewal_executive_id: true } },
    },
    orderBy: { id: 'asc' },
  });

  console.log(`[Backfill] Found ${serviceCandidates.length} service instance(s) with missing assigned_user_id.`);

  if (apply && serviceCandidates.length > 0) {
    for (const s of serviceCandidates) {
      const execId = s.renewal_account?.renewal_executive_id;
      if (execId) {
        await (prisma as any).renewalServiceInstance.update({
          where: { id: s.id },
          data: { assigned_user_id: execId },
        });
      }
    }
    console.log(`[Backfill] Updated ${serviceCandidates.length} service instance(s).`);
  }

  // 2. Find ALL renewal reminders with assigned_user_id IS NULL
  const reminderCandidates = await (prisma as any).renewalReminder.findMany({
    where: {
      assigned_user_id: null,
      cycle: {
        service_instance: {
          ...(companyId ? { renewal_account: { company_id: companyId } } : {}),
          OR: [
            { assigned_user_id: { not: null } },
            { renewal_account: { renewal_executive_id: { not: null } } },
          ],
        },
      },
    },
    select: {
      id: true,
      recipient_type: true,
      cycle: {
        select: {
          service_instance: {
            select: {
              assigned_user_id: true,
              renewal_account: { select: { renewal_executive_id: true } },
            },
          },
        },
      },
    },
  });

  console.log(`[Backfill] Found ${reminderCandidates.length} reminder(s) with missing assigned_user_id.`);

  if (apply && reminderCandidates.length > 0) {
    for (const r of reminderCandidates) {
      const execId = r.cycle?.service_instance?.assigned_user_id ??
        r.cycle?.service_instance?.renewal_account?.renewal_executive_id;
      if (execId) {
        await (prisma as any).renewalReminder.update({
          where: { id: r.id },
          data: { assigned_user_id: execId },
        });
      }
    }
    console.log(`[Backfill] Updated ${reminderCandidates.length} reminder(s).`);
  }

  // 3. Find ALL follow_up_tasks with assigned_user_id IS NULL
  const taskCandidates = await (prisma as any).renewalFollowUpTask.findMany({
    where: {
      assigned_user_id: null,
      is_deleted: false,
      service_instance: {
        ...(companyId ? { renewal_account: { company_id: companyId } } : {}),
        OR: [
          { assigned_user_id: { not: null } },
          { renewal_account: { renewal_executive_id: { not: null } } },
        ],
      },
    },
    select: {
      id: true,
      service_instance: {
        select: {
          assigned_user_id: true,
          renewal_account: { select: { renewal_executive_id: true } },
        },
      },
    },
  });

  console.log(`[Backfill] Found ${taskCandidates.length} follow-up task(s) with missing assigned_user_id.`);

  if (apply && taskCandidates.length > 0) {
    for (const t of taskCandidates) {
      const execId = t.service_instance?.assigned_user_id ??
        t.service_instance?.renewal_account?.renewal_executive_id;
      if (execId) {
        await (prisma as any).renewalFollowUpTask.update({
          where: { id: t.id },
          data: { assigned_user_id: execId },
        });
      }
    }
    console.log(`[Backfill] Updated ${taskCandidates.length} follow-up task(s).`);
  }

  console.log(`[Backfill] Finished ${apply ? 'APPLY' : 'DRY_RUN'}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

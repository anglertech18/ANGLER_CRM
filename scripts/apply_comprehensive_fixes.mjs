import { readFileSync, writeFileSync } from 'fs';

// ── 1. reminderGeneratorService.ts ───────────────────────────────────────────
{
  const file = 'server/src/services/reminderGeneratorService.ts';
  let c = readFileSync(file, 'utf8');

  // Replace resolvedUserId resolution so that it defaults to assigned executive
  const target = `      let resolvedUserId: number | null = null;
      if (step.recipient_type === 'ASSIGNED_USER' || step.recipient_type === 'BOTH') {
        resolvedUserId = assignedUserId ?? null;
      } else if (step.recipient_type === 'ACCOUNT_MANAGER') {
        resolvedUserId = accountManagerId ?? null;
      }`;

  const replacement = `      let resolvedUserId: number | null = null;
      if (step.recipient_type === 'ACCOUNT_MANAGER') {
        resolvedUserId = accountManagerId ?? assignedUserId ?? null;
      } else {
        // Reminders for CUSTOMER, CLIENT, CONTACT, BOTH, ASSIGNED_USER are owned by the assigned renewal executive
        resolvedUserId = assignedUserId ?? accountManagerId ?? null;
      }`;

  if (c.replace(/\r\n/g, '\n').includes(target.replace(/\r\n/g, '\n'))) {
    // Normalizing newlines before replacement to be platform-agnostic
    const isCRLF = c.includes('\r\n');
    const nl = isCRLF ? '\r\n' : '\n';
    c = c.split(/\r?\n/).join('\n');
    c = c.replace(target.replace(/\r\n/g, '\n'), replacement.replace(/\r\n/g, '\n'));
    if (isCRLF) c = c.split('\n').join('\r\n');
    writeFileSync(file, c, 'utf8');
    console.log('✅ reminderGeneratorService.ts updated: resolvedUserId defaults to assigned executive');
  } else {
    console.error('❌ reminderGeneratorService.ts target not found');
  }
}

// ── 2. renewalFollowUpController.ts ─────────────────────────────────────────
{
  const file = 'server/src/controllers/renewalFollowUpController.ts';
  let c = readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  c = c.split(/\r?\n/).join('\n');

  // A: buildFollowUpQueueWhere fallback
  const whereTarget = `  if (assignedToCurrentUser) where.assigned_user_id = user.id;
  else if (assignedUser === 'UNASSIGNED') where.assigned_user_id = null;
  else if (assignedUser) where.assigned_user_id = Number.parseInt(String(assignedUser), 10);`;

  const whereReplacement = `  if (assignedToCurrentUser) {
    where.OR = [
      { assigned_user_id: user.id },
      { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { assigned_user_id: user.id } } }] },
      { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { renewal_account: { renewal_executive_id: user.id } } } }] },
    ];
  } else if (assignedUser === 'UNASSIGNED') {
    where.AND = [
      { assigned_user_id: null },
      { cycle: { service_instance: { assigned_user_id: null } } },
      { cycle: { service_instance: { renewal_account: { renewal_executive_id: null } } } },
    ];
  } else if (assignedUser) {
    const targetUserId = Number.parseInt(String(assignedUser), 10);
    where.OR = [
      { assigned_user_id: targetUserId },
      { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { assigned_user_id: targetUserId } } }] },
      { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { renewal_account: { renewal_executive_id: targetUserId } } } }] },
    ];
  }`;

  if (c.includes(whereTarget)) {
    c = c.replace(whereTarget, whereReplacement);
    console.log('✅ renewalFollowUpController.ts: buildFollowUpQueueWhere updated with fallback');
  } else {
    console.error('❌ renewalFollowUpController.ts: whereTarget not found');
  }

  // B: getFollowUpQueue: Include service_instance.assigned_user and renewal_account.renewal_executive
  const includeTarget = `          cycle: {
            include: {
              service_instance: {
                include: {
                  service_master: { include: { category: true } },
                  renewal_account: { include: { client_company: { select: { id: true, name: true } } } },
                  customer_contact: { select: { id: true, name: true, mobile: true, whatsapp: true } },
                },
              },
            },
          },`;

  const includeReplacement = `          cycle: {
            include: {
              service_instance: {
                include: {
                  assigned_user: { select: { id: true, first_name: true, last_name: true } },
                  service_master: { include: { category: true } },
                  renewal_account: {
                    include: {
                      client_company: { select: { id: true, name: true } },
                      renewal_executive: { select: { id: true, first_name: true, last_name: true } },
                    },
                  },
                  customer_contact: { select: { id: true, name: true, mobile: true, whatsapp: true } },
                },
              },
            },
          },`;

  if (c.includes(includeTarget)) {
    c = c.replace(includeTarget, includeReplacement);
    console.log('✅ renewalFollowUpController.ts: getFollowUpQueue includes updated');
  } else {
    console.error('❌ renewalFollowUpController.ts: includeTarget not found');
  }

  // C: getFollowUpQueue: formattedReminders maps effective assigned_user
  const mapTarget = `    const formattedReminders = reminders.map((r: any) => {
      const actions = r.channel_actions || [];`;

  const mapReplacement = `    const formattedReminders = reminders.map((r: any) => {
      const effectiveAssignedUser = r.assigned_user ||
        r.cycle?.service_instance?.assigned_user ||
        r.cycle?.service_instance?.renewal_account?.renewal_executive ||
        null;
      const actions = r.channel_actions || [];`;

  if (c.includes(mapTarget)) {
    c = c.replace(mapTarget, mapReplacement);
    c = c.replace(`return {
        ...r,`, `return {
        ...r,
        assigned_user: effectiveAssignedUser,`);
    console.log('✅ renewalFollowUpController.ts: effectiveAssignedUser mapped');
  } else {
    console.error('❌ renewalFollowUpController.ts: mapTarget not found');
  }

  // D: getQueueCounts fallback
  const countsTarget = `    if (isAssignedOnly) {
      base.assigned_user_id = user.id;
    } else if (assignedUser) {
      base.assigned_user_id = parseInt(String(assignedUser));
    }`;

  const countsReplacement = `    if (isAssignedOnly) {
      base.OR = [
        { assigned_user_id: user.id },
        { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { assigned_user_id: user.id } } }] },
        { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { renewal_account: { renewal_executive_id: user.id } } } }] },
      ];
    } else if (assignedUser === 'UNASSIGNED') {
      base.AND = [
        { assigned_user_id: null },
        { cycle: { service_instance: { assigned_user_id: null } } },
        { cycle: { service_instance: { renewal_account: { renewal_executive_id: null } } } },
      ];
    } else if (assignedUser) {
      const targetUserId = parseInt(String(assignedUser));
      base.OR = [
        { assigned_user_id: targetUserId },
        { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { assigned_user_id: targetUserId } } }] },
        { AND: [{ assigned_user_id: null }, { cycle: { service_instance: { renewal_account: { renewal_executive_id: targetUserId } } } }] },
      ];
    }`;

  if (c.includes(countsTarget)) {
    c = c.replace(countsTarget, countsReplacement);
    console.log('✅ renewalFollowUpController.ts: getQueueCounts updated');
  } else {
    console.error('❌ renewalFollowUpController.ts: countsTarget not found');
  }

  // E: completeFollowUp: Auto-create callback reminder when next_follow_up_date is given
  const callbackTarget = `    // Mark service as renewed if outcome is RENEWED or RENEWED_PAID`;
  const callbackAddition = `    // If a next callback date was scheduled, create the follow-up callback reminder
    if (next_follow_up_date) {
      try {
        const callbackDate = dayjs(next_follow_up_date);
        const expiry = dayjs(reminder.cycle?.service_instance?.expiry_date || callbackDate);
        const offsetDays = callbackDate.diff(expiry, 'day');

        const maxStep = await (prisma as any).renewalReminder.aggregate({
          where: { cycle_id: reminder.cycle_id },
          _max: { step_number: true },
        });
        const nextStepNum = (maxStep?._max?.step_number || reminder.step_number || 0) + 1;

        const assignedId = reminder.assigned_user_id ||
          reminder.cycle?.service_instance?.assigned_user_id ||
          reminder.cycle?.service_instance?.renewal_account?.renewal_executive_id ||
          user.id;

        const callbackReminder = await (prisma as any).renewalReminder.create({
          data: {
            cycle_id: reminder.cycle_id,
            step_number: nextStepNum,
            offset_days: offsetDays,
            due_date: callbackDate.toDate(),
            action_type: 'CALL',
            channel: 'PHONE',
            recipient_type: reminder.recipient_type || 'CLIENT',
            assigned_user_id: assignedId,
            status: 'PENDING',
          },
        });

        try {
          const { dualWriteReminderCreated } = await import('../services/renewalDualWriteService');
          await dualWriteReminderCreated(callbackReminder.id, user.id);
        } catch (_dwErr) {}

        if (accountId) {
          await (prisma as any).renewalCommunicationEvent.create({
            data: {
              renewal_account_id: accountId,
              service_instance_id: reminder.cycle.service_instance_id,
              cycle_id: reminder.cycle_id,
              reminder_id: callbackReminder.id,
              channel: 'PHONE',
              event_type: 'CALLBACK_SCHEDULED',
              execution_mode: 'MANUAL',
              communication_purpose: 'REMINDER',
              direction: 'OUTBOUND',
              status: 'PENDING',
              actor_type: 'USER',
              actor_user_id: user.id,
              occurred_at: new Date(),
              metadata: JSON.stringify({
                scheduled_date: next_follow_up_date,
                previous_outcome: outcome_code,
                notes: finalNotes,
              }),
            },
          });
        }
      } catch (cbErr) {
        console.warn('[completeFollowUp] Failed to create callback reminder:', cbErr);
      }
    }

    // Mark service as renewed if outcome is RENEWED or RENEWED_PAID`;

  if (c.includes(callbackTarget)) {
    c = c.replace(callbackTarget, callbackAddition);
    console.log('✅ renewalFollowUpController.ts: callback reminder creation added');
  } else {
    console.error('❌ renewalFollowUpController.ts: callbackTarget not found');
  }

  if (isCRLF) c = c.split('\n').join('\r\n');
  writeFileSync(file, c, 'utf8');
}

// ── 3. renewalPricingController.ts ──────────────────────────────────────────
{
  const file = 'server/src/controllers/renewalPricingController.ts';
  let c = readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  c = c.split(/\r?\n/).join('\n');

  // A: where.assigned_user_id filter fallback to account renewal_executive_id
  const pricingWhereTarget = `    if (assignedUserId) {
      where.assigned_user_id = assignedUserId === 'UNASSIGNED' ? null : parseInt(assignedUserId);
    }`;

  const pricingWhereReplacement = `    if (assignedUserId) {
      if (assignedUserId === 'UNASSIGNED') {
        where.AND = [
          ...(where.AND || []),
          { assigned_user_id: null },
          { renewal_account: { renewal_executive_id: null } },
        ];
      } else {
        const uid = parseInt(assignedUserId);
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { assigned_user_id: uid },
              { AND: [{ assigned_user_id: null }, { renewal_account: { renewal_executive_id: uid } }] },
            ],
          },
        ];
      }
    }`;

  if (c.includes(pricingWhereTarget)) {
    c = c.replace(pricingWhereTarget, pricingWhereReplacement);
    console.log('✅ renewalPricingController.ts: assignedUserId filter updated with fallback');
  } else {
    console.error('❌ renewalPricingController.ts: pricingWhereTarget not found');
  }

  // B: Enriching mappings with renewal_account.renewal_executive fallback
  const enrichTarget = `      const assignedUser = assignedUserMap.get(r.assigned_user_id);`;
  const enrichReplacement = `      const assignedUser = assignedUserMap.get(r.assigned_user_id) || r.renewal_account?.renewal_executive || null;`;

  if (c.includes(enrichTarget)) {
    c = c.replace(enrichTarget, enrichReplacement);
    console.log('✅ renewalPricingController.ts: mapping row assigned_user fallback updated');
  } else {
    console.error('❌ renewalPricingController.ts: enrichTarget not found');
  }

  if (isCRLF) c = c.split('\n').join('\r\n');
  writeFileSync(file, c, 'utf8');
}

// ── 4. renewalService.ts ────────────────────────────────────────────────────
{
  const file = 'server/src/services/renewalService.ts';
  let c = readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  c = c.split(/\r?\n/).join('\n');

  const servTarget = `  if (assignedUser === 'UNASSIGNED') {
    where.AND.push({ services: { some: { assigned_user_id: null, is_active: true } } });
  } else if (assignedUser) {
    where.AND.push({ services: { some: { assigned_user_id: parseInt(assignedUser) } } });
  }`;

  const servReplacement = `  if (assignedUser === 'UNASSIGNED') {
    where.AND.push({
      AND: [
        { renewal_executive_id: null },
        { services: { some: { assigned_user_id: null, is_active: true } } },
      ],
    });
  } else if (assignedUser) {
    const uid = parseInt(assignedUser);
    where.AND.push({
      OR: [
        { renewal_executive_id: uid },
        { services: { some: { assigned_user_id: uid } } },
      ],
    });
  }`;

  if (c.includes(servTarget)) {
    c = c.replace(servTarget, servReplacement);
    console.log('✅ renewalService.ts: assignedUser filter updated with fallback');
  } else {
    console.error('❌ renewalService.ts: servTarget not found');
  }

  if (isCRLF) c = c.split('\n').join('\r\n');
  writeFileSync(file, c, 'utf8');
}

// ── 5. RenewalDetail.tsx ────────────────────────────────────────────────────
{
  const file = 'client/src/pages/renewals/RenewalDetail.tsx';
  let c = readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  c = c.split(/\r?\n/).join('\n');

  const oldCallDrawer = `              {/* 2. PHONE CALL DRAWER */}
              {drawerData.type === 'CALL' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                      <span className="font-extrabold uppercase text-[9px] text-emerald-800">Outcome Code:</span>
                      <span className="font-bold text-emerald-900">Callback Expected</span>
                    </div>
                    <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                      <span className="font-extrabold uppercase text-[9px] text-emerald-800">Logged By:</span>
                      <span className="font-bold text-slate-800">CEO (Account Executive)</span>
                    </div>
                    <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                      <span className="font-extrabold uppercase text-[9px] text-emerald-800">Call Timestamp:</span>
                      <span className="font-semibold text-slate-700">
                        {dayjs(drawerData.step?.updated_at || drawerData.step?.due_date).format('DD MMM YYYY · 11:15 AM')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-extrabold uppercase text-[9px] text-emerald-800">Next Callback Scheduled:</span>
                      <span className="font-bold text-blue-700">02 Aug 2026</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Call Outcome & Customer Remarks</h4>
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs text-slate-700 leading-relaxed font-medium">
                      "Spoke with SeedContact Admin. Customer requested a follow-up call on Aug 2nd after their finance director reviews the renewal invoice."
                    </div>
                  </div>
                </div>
              )}`;

  const newCallDrawer = `              {/* 2. PHONE CALL DRAWER */}
              {drawerData.type === 'CALL' && (() => {
                const logs = selectedSvc?.follow_up_logs || [];
                const matchingLog = logs.find((l: any) => l.reminder_id === drawerData.step?.id) || logs[0] || null;
                const loggedByName = matchingLog?.logged_by
                  ? \`\${matchingLog.logged_by.first_name} \${matchingLog.logged_by.last_name || ''}\`.trim()
                  : (drawerData.step?.assigned_user?.first_name || 'Executive');
                const callTimestamp = matchingLog?.logged_at || drawerData.step?.completed_at || drawerData.step?.updated_at || drawerData.step?.due_date;
                const nextCallback = matchingLog?.next_follow_up_date
                  ? dayjs(matchingLog.next_follow_up_date).format('DD MMM YYYY')
                  : 'None scheduled';
                const remarks = matchingLog?.customer_response || matchingLog?.notes || 'No remarks recorded for this call.';

                return (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2 text-xs">
                      <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-800">Outcome Code:</span>
                        <span className="font-bold text-emerald-900">
                          {matchingLog?.outcome_code ? matchingLog.outcome_code.replace(/_/g, ' ') : 'Call Completed'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-800">Logged By:</span>
                        <span className="font-bold text-slate-800">{loggedByName}</span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-800">Call Timestamp:</span>
                        <span className="font-semibold text-slate-700">
                          {callTimestamp ? dayjs(callTimestamp).format('DD MMM YYYY · hh:mm A') : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-800">Next Callback Scheduled:</span>
                        <span className="font-bold text-blue-700">{nextCallback}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Call Outcome & Customer Remarks</h4>
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs text-slate-700 leading-relaxed font-medium">
                        "{remarks}"
                      </div>
                    </div>

                    {matchingLog?.notes && matchingLog?.customer_response && matchingLog.notes !== matchingLog.customer_response && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Internal Notes / Action Items</h4>
                        <div className="border border-slate-200 rounded-xl p-4 bg-white text-xs text-slate-700 leading-relaxed font-medium">
                          {matchingLog.notes}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}`;

  if (c.includes(oldCallDrawer)) {
    c = c.replace(oldCallDrawer, newCallDrawer);
    console.log('✅ RenewalDetail.tsx: Phone Call drawer updated with REAL data (mock data removed)');
  } else {
    console.error('❌ RenewalDetail.tsx: oldCallDrawer not found');
  }

  if (isCRLF) c = c.split('\n').join('\r\n');
  writeFileSync(file, c, 'utf8');
}

// ── 6. RenewalFollowUps.tsx ─────────────────────────────────────────────────
{
  const file = 'client/src/pages/renewals/RenewalFollowUps.tsx';
  let c = readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  c = c.split(/\r?\n/).join('\n');

  // Add helper function to resolve assignee name consistently
  const helperCode = `function resolveAssigneeName(item: any): string {
  const u = item.assigned_user ||
    item.cycle?.service_instance?.assigned_user ||
    item.cycle?.service_instance?.renewal_account?.renewal_executive;
  if (!u) return 'Unassigned';
  const name = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ');
  return name.trim() || 'Unassigned';
}`;

  if (!c.includes('function resolveAssigneeName')) {
    c = c.replace('function avatarInitials', `${helperCode}\n\nfunction avatarInitials`);
    console.log('✅ RenewalFollowUps.tsx: resolveAssigneeName helper added');
  }

  // Replace uniqueOptions assignee resolution
  const assTarget = `const ass   = i.assigned_user?.name || i.assigned_user?.first_name || 'Unassigned';`;
  if (c.includes(assTarget)) {
    c = c.replace(assTarget, `const ass   = resolveAssigneeName(i);`);
    console.log('✅ RenewalFollowUps.tsx: uniqueOptions assignee updated');
  }

  // Replace column filter assignee check
  const colFilterTarget = `else if (colKey === 'assignee') val = item.assigned_user?.name || item.assigned_user?.first_name || 'Unassigned';`;
  if (c.includes(colFilterTarget)) {
    c = c.replace(colFilterTarget, `else if (colKey === 'assignee') val = resolveAssigneeName(item);`);
    console.log('✅ RenewalFollowUps.tsx: columnFilters assignee check updated');
  }

  // Replace table row assignee rendering
  const rowAssTarget = `const assignee   = item.assigned_user?.first_name || item.assigned_user?.name || 'Unassigned';`;
  if (c.includes(rowAssTarget)) {
    c = c.replace(rowAssTarget, `const assignee   = resolveAssigneeName(item);`);
    console.log('✅ RenewalFollowUps.tsx: table row assignee updated');
  }

  if (isCRLF) c = c.split('\n').join('\r\n');
  writeFileSync(file, c, 'utf8');
}

console.log('🎉 Comprehensive fixes script finished successfully');

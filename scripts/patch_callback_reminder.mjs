import { readFileSync, writeFileSync } from 'fs';

const file = 'server/src/controllers/renewalFollowUpController.ts';
let c = readFileSync(file, 'utf8');
const isCRLF = c.includes('\r\n');
c = c.split(/\r?\n/).join('\n');

const target = `      if (outcome_code === 'RENEWED' || outcome_code === 'RENEWED_PAID') {
        await tx.renewalServiceInstance.update({
          where: { id: currentReminder.cycle.service_instance_id },
          data: { status: 'RENEWED' },
        });
      }

      return { reminder: currentReminder, log: createdLog };`;

const replacement = `      if (outcome_code === 'RENEWED' || outcome_code === 'RENEWED_PAID') {
        await tx.renewalServiceInstance.update({
          where: { id: currentReminder.cycle.service_instance_id },
          data: { status: 'RENEWED' },
        });
      }

      // If next_follow_up_date was specified, schedule a callback reminder
      if (next_follow_up_date) {
        try {
          const callbackDate = dayjs(next_follow_up_date);
          const expiry = dayjs(currentReminder.cycle?.service_instance?.expiry_date || callbackDate);
          const offsetDays = callbackDate.diff(expiry, 'day');

          const maxStep = await tx.renewalReminder.aggregate({
            where: { cycle_id: currentReminder.cycle_id },
            _max: { step_number: true },
          });
          const nextStepNum = (maxStep?._max?.step_number || currentReminder.step_number || 0) + 1;

          const assignedId = currentReminder.assigned_user_id ||
            currentReminder.cycle?.service_instance?.assigned_user_id ||
            currentReminder.cycle?.service_instance?.renewal_account?.renewal_executive_id ||
            user.id;

          const callbackReminder = await tx.renewalReminder.create({
            data: {
              cycle_id: currentReminder.cycle_id,
              step_number: nextStepNum,
              offset_days: offsetDays,
              due_date: callbackDate.toDate(),
              action_type: 'CALL',
              channel: 'PHONE',
              recipient_type: currentReminder.recipient_type || 'CLIENT',
              assigned_user_id: assignedId,
              status: 'PENDING',
            },
          });

          await tx.renewalCommunicationEvent.create({
            data: {
              renewal_account_id: currentReminder.cycle.service_instance.renewal_account_id,
              service_instance_id: currentReminder.cycle.service_instance_id,
              cycle_id: currentReminder.cycle_id,
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
        } catch (cbErr) {
          console.warn('[completeFollowUp] Failed to create callback reminder:', cbErr);
        }
      }

      return { reminder: currentReminder, log: createdLog };`;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  console.log('✅ renewalFollowUpController.ts: callback reminder scheduling added');
} else {
  console.error('❌ target not found');
}

if (isCRLF) c = c.split('\n').join('\r\n');
writeFileSync(file, c, 'utf8');

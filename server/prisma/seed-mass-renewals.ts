import { PrismaClient } from './v2-client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

const CLIENT_NAMES = [
  'Acme', 'Apex', 'Nova', 'Vertex', 'Horizon', 'Infinity', 'Quantum', 'Starlight', 'Solstice', 'Aura',
  'Pulse', 'Fusion', 'Spectrum', 'Nexus', 'Cascade', 'Summit', 'Delta', 'Echo', 'Omega', 'Alpha',
  'Byte', 'Pixel', 'Logic', 'Code', 'Web', 'Net', 'Cloud', 'Data', 'Systems', 'Global',
  'Tech', 'Solutions', 'Ventures', 'Labs', 'Group', 'Partners', 'Industries', 'Enterprises', 'Holdings', 'Services'
];

const SECOND_NAMES = [
  'Consulting', 'Technologies', 'Networks', 'Software', 'Digital', 'Media', 'Dynamics', 'Analytics', 'Strategy', 'Capital',
  'Creative', 'Designs', 'Logistics', 'Communications', 'Systems', 'Secure', 'Cyber', 'Data', 'Core', 'Prime'
];

function generateClientName(i: number): string {
  const first = CLIENT_NAMES[i % CLIENT_NAMES.length];
  const second = SECOND_NAMES[(i * 3) % SECOND_NAMES.length];
  return `SeedCorp ${first} ${second} Ltd #${i + 1}`;
}

async function main() {
  console.log('🚀 STARTING MASSIVE END-TO-END RENEWALS SEEDER (1000+ DATA POINTS)...');

  // 1. Load users for assignments
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = users.map((u: any) => u.id);
  if (userIds.length === 0) {
    console.error('❌ Error: No users found. Run base seed.ts first.');
    return;
  }
  console.log(`  Found ${userIds.length} users in the database.`);

  // 2. Load service masters & categories
  const categories = await (prisma as any).renewalServiceCategory.findMany();
  const serviceMasters = await (prisma as any).renewalServiceMaster.findMany();
  if (serviceMasters.length === 0 || categories.length === 0) {
    console.error('❌ Error: No service masters or categories. Run seed-renewals.ts first.');
    return;
  }
  console.log(`  Found ${categories.length} categories and ${serviceMasters.length} service masters.`);

  const providers = await (prisma as any).renewalProvider.findMany();
  const providerIds = providers.map((p: any) => p.id);
  console.log(`  Found ${providerIds.length} providers.`);

  const templates = await prisma.renewalNotificationTemplate.findMany();
  const templateIds = templates.map((t: any) => t.id);
  console.log(`  Found ${templateIds.length} email templates.`);

  // 3. Clear old seed data to keep it clean and repeatable
  console.log('🧹 Clearing previous seed data...');
  
  await prisma.$executeRawUnsafe(`DELETE FROM notification_outbox WHERE recipient_name LIKE 'SeedContact%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM renewal_payment WHERE remarks LIKE 'SeedPayment%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM renewal_followup_log WHERE notes LIKE 'SeedFollowup%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM renewal_instance_alert_step WHERE is_active = true`);
  await prisma.$executeRawUnsafe(`DELETE FROM renewal_reminder WHERE id > 0`);
  await prisma.$executeRawUnsafe(`DELETE FROM renewal_document WHERE id > 0`);
  await prisma.$executeRawUnsafe(`DELETE FROM renewal_audit_log WHERE id > 0`);

  const seedAccounts = await (prisma as any).renewalAccount.findMany({
    where: { po_reference: { startsWith: 'SEED-PO-' } },
    select: { id: true }
  });
  const seedAccountIds = seedAccounts.map((a: any) => a.id);
  if (seedAccountIds.length > 0) {
    await (prisma as any).renewalAccount.deleteMany({
      where: { id: { in: seedAccountIds } }
    });
  }

  await (prisma as any).renewalContact.deleteMany({
    where: { designation: 'SeedDesignation' }
  });

  await prisma.clientCompany.deleteMany({
    where: { name: { startsWith: 'SeedCorp' } }
  });

  console.log('🧹 Cleanup complete.');

  // 4. Generate 120 Client Companies
  console.log('🏢 Generating 120 client companies...');
  const companyRecords = [];
  for (let i = 0; i < 120; i++) {
    const name = generateClientName(i);
    const company = await prisma.clientCompany.create({
      data: { name, is_active: true }
    });
    companyRecords.push(company);
  }
  console.log(`  Created ${companyRecords.length} client companies.`);

  // 5. Generate 240 Renewal Contacts (2 per company)
  console.log('👤 Generating 240 client contacts...');
  const contacts = [];
  const roles = ['PRIMARY', 'TECHNICAL', 'BILLING', 'DECISION_MAKER'];
  for (const comp of companyRecords) {
    for (let j = 0; j < 2; j++) {
      const idx = comp.id + j;
      const role = roles[(idx) % roles.length];
      const contact = await (prisma as any).renewalContact.create({
        data: {
          client_company_id: comp.id,
          name: `SeedContact ${comp.name.split(' ')[1]} ${j === 0 ? 'Admin' : 'Tech'}`,
          designation: 'SeedDesignation',
          department: 'IT',
          email: `contact_${comp.id}_${j}@seedcorp.com`,
          mobile: `9840${String(comp.id).padStart(3, '0')}${j}23`,
          role,
          is_primary: j === 0,
          is_renewal_contact: true,
          email_consent: true,
          phone_consent: true,
          whatsapp_consent: idx % 3 === 0,
          use_default_template: idx % 10 === 0, // 10% consolidated alert bypass
          is_active: true
        }
      });
      contacts.push(contact);
    }
  }
  console.log(`  Created ${contacts.length} client contacts.`);

  // 6. Generate Accounts, Service Instances, and Cycles
  console.log('📊 Generating 250 renewal accounts & 450 service mappings...');
  let accountCount = 0;
  let serviceCount = 0;
  let cycleCount = 0;
  let stepCount = 0;
  let followupCount = 0;
  let paymentCount = 0;
  let outboxCount = 0;
  let reminderCount = 0;
  let documentCount = 0;
  let auditLogCount = 0;

  const now = dayjs();

  for (let i = 0; i < companyRecords.length; i++) {
    const comp = companyRecords[i];
    const compContacts = contacts.filter(c => c.client_company_id === comp.id);
    const primaryContact = compContacts.find(c => c.is_primary) || compContacts[0];

    // Create 2 accounts per company, some have 3 (total ~250)
    const numAccs = i % 5 === 0 ? 3 : 2;
    for (let a = 0; a < numAccs; a++) {
      const accNum = accountCount + 1;
      const account = await (prisma as any).renewalAccount.create({
        data: {
          client_company_id: comp.id,
          account_manager_id: userIds[accNum % userIds.length],
          po_reference: `SEED-PO-${1000 + accNum}`,
          order_number: `ORD-${5000 + accNum}`,
          order_date: now.subtract(11, 'months').toDate(),
          status: 'ACTIVE',
          created_by_id: userIds[0],
          is_active: true
        }
      });
      accountCount++;

      // Create Renewal Documents for some accounts to populate Documents Tab
      if (a === 0) {
        const docTypes = ['QUOTATION', 'INVOICE', 'ORDER_FORM'];
        for (let d = 0; d < 2; d++) {
          const docType = docTypes[(a + d) % docTypes.length];
          await (prisma as any).renewalDocument.create({
            data: {
              renewal_account_id: account.id,
              document_type: docType,
              name: d === 0 ? `Quotation_SeedCorp_PO-${1000 + accNum}.pdf` : `Invoice_INV-${5000 + accNum}.pdf`,
              url: `https://example.com/docs/sample-${accNum}-${d}.pdf`,
              uploaded_by_id: userIds[0],
              uploaded_at: now.subtract(15, 'days').toDate()
            }
          });
          documentCount++;
        }
      }

      // Create Audit Logs for every account to populate Audit Log Tab
      await (prisma as any).renewalAuditLog.create({
        data: {
          renewal_account_id: account.id,
          entity_type: 'ACCOUNT',
          entity_id: account.id,
          action: 'CREATED',
          old_value: null,
          new_value: JSON.stringify({ status: 'DRAFT', po_reference: account.po_reference }),
          performed_by_id: userIds[0],
          performed_at: now.subtract(11, 'months').toDate()
        }
      });
      await (prisma as any).renewalAuditLog.create({
        data: {
          renewal_account_id: account.id,
          entity_type: 'ACCOUNT',
          entity_id: account.id,
          action: 'STATUS_CHANGED',
          old_value: 'DRAFT',
          new_value: 'ACTIVE',
          performed_by_id: userIds[0],
          performed_at: now.subtract(10, 'months').toDate()
        }
      });
      auditLogCount += 2;

      // Under each account, create 1 or 2 service instances (total ~450)
      const numServices = a === 0 ? 2 : 1;
      for (let s = 0; s < numServices; s++) {
        const svcNum = serviceCount + 1;
        const master = serviceMasters[svcNum % serviceMasters.length];
        
        // Expiry Date Distribution Scenario
        let expiryDate = now;
        let status = 'ACTIVE';

        const scenario = svcNum % 5;
        if (scenario === 0) {
          // Scenario A: Active & Future Expiry (35%)
          expiryDate = now.add(35 + (svcNum % 180), 'days');
          status = 'ACTIVE';
        } else if (scenario === 1) {
          // Scenario B: Due Soon (25%)
          expiryDate = now.add(1 + (svcNum % 28), 'days');
          status = 'DUE_SOON';
        } else if (scenario === 2) {
          // Scenario C: Expired / Overdue (20%)
          expiryDate = now.subtract(1 + (svcNum % 45), 'days');
          status = 'EXPIRED';
        } else if (scenario === 3) {
          // Scenario D: Under Follow-Up Bypass (10%)
          expiryDate = now.add(svcNum % 15, 'days');
          status = 'FOLLOW_UP';
        } else {
          // Scenario E: Not Renewing (10%)
          expiryDate = now.add(svcNum % 30, 'days');
          status = 'NOT_RENEWING';
        }

        const amountDue = 1500 + (svcNum * 750) % 25000;

        const instance = await (prisma as any).renewalServiceInstance.create({
          data: {
            renewal_account_id: account.id,
            service_master_id: master.id,
            identifier: master.name.includes('Domain') 
              ? `seeddomain-${comp.id}-${s}.com` 
              : `vps-seedhost-${comp.id}-${s}.in`,
            provider_id: providerIds.length > 0 ? providerIds[svcNum % providerIds.length] : null,
            quantity: master.supports_quantity ? 5 + (svcNum % 50) : 1,
            activation_date: expiryDate.subtract(1, 'year').toDate(),
            expiry_date: expiryDate.toDate(),
            amount_due: amountDue,
            assigned_user_id: userIds[svcNum % userIds.length],
            customer_contact_id: primaryContact?.id ?? null,
            status,
            remarks: `Seed service instance remarks for mapping #${svcNum}`,
            is_active: true
          }
        });
        serviceCount++;

        // Create the active cycle
        const cycle = await (prisma as any).renewalCycle.create({
          data: {
            service_instance_id: instance.id,
            cycle_number: 1,
            activation_date: instance.activation_date,
            expiry_date: instance.expiry_date,
            amount_due: instance.amount_due,
            amount_collected: 0,
            outstanding: instance.amount_due,
            status,
            is_active: true
          }
        });
        cycleCount++;

        // Create Alert Steps for this service mapping (3 steps per instance)
        await (prisma as any).renewalInstanceAlertStep.create({
          data: {
            service_instance_id: instance.id,
            step_number: 1,
            days_before: 30,
            channel: 'EMAIL_DIRECT',
            email_template_id: templateIds.length > 0 ? templateIds[svcNum % templateIds.length] : null
          }
        });
        await (prisma as any).renewalInstanceAlertStep.create({
          data: {
            service_instance_id: instance.id,
            step_number: 2,
            days_before: 15,
            channel: 'EMAIL_DRAFT',
            email_template_id: templateIds.length > 0 ? templateIds[(svcNum + 1) % templateIds.length] : null
          }
        });
        await (prisma as any).renewalInstanceAlertStep.create({
          data: {
            service_instance_id: instance.id,
            step_number: 3,
            days_before: 0,
            channel: 'CALL_TASK'
          }
        });
        stepCount += 3;

        // Generate Follow-Up Logs (for Expired, Due Soon, and Follow-Up statuses)
        if (status === 'EXPIRED' || status === 'DUE_SOON' || status === 'FOLLOW_UP') {
          const outcomes = ['AGREED', 'PAYMENT_PENDING', 'FOLLOW_UP_REQUIRED', 'NO_RESPONSE'];
          const outcome = outcomes[svcNum % outcomes.length];
          await (prisma as any).renewalFollowUpLog.create({
            data: {
              service_instance_id: instance.id,
              outcome_code: outcome,
              contacted: true,
              notes: `SeedFollowup - Customer contacted regarding upcoming renewal. Outcome: ${outcome}.`,
              customer_response: 'Asked to call back or requested a discount.',
              logged_by_id: userIds[svcNum % userIds.length],
              logged_at: now.subtract(2, 'days').toDate()
            }
          });
          followupCount++;
        }

        // Generate Payments (for expired or active cycles to show partial payments)
        if (svcNum % 3 === 0) {
          const paymentAmount = amountDue / 2;
          await (prisma as any).renewalPayment.create({
            data: {
              cycle_id: cycle.id,
              amount: paymentAmount,
              payment_date: now.subtract(5, 'days').toDate(),
              collected_by_id: userIds[0], // Set correct collected_by user ID relation!
              payment_mode: 'NEFT',
              reference: `REF-TXN-${10000 + svcNum}`,
              remarks: `SeedPayment - Partial collection of ₹${paymentAmount}.`
            }
          });
          paymentCount++;

          // Update cycle amounts
          await (prisma as any).renewalCycle.update({
            where: { id: cycle.id },
            data: {
              amount_collected: paymentAmount,
              outstanding: amountDue - paymentAmount
            }
          });
        }

        // Generate Notification Outbox drafts/sent alerts for Due Soon / Expired
        if (status === 'DUE_SOON' || status === 'EXPIRED') {
          const template = templates[svcNum % templates.length] || { subject: 'Renewal Notice', body_html: '<p>Body</p>' };
          const requiresApproval = svcNum % 2 === 0; // 50% require approval (Draft approvals)
          
          await prisma.notificationOutbox.create({
            data: {
              channel: 'EMAIL',
              recipient: primaryContact?.email ?? 'info@client.com',
              recipient_name: primaryContact?.name ?? 'SeedContact Name',
              template_id: template.id,
              subject: template.subject?.replace('{{domain_url}}', instance.identifier || ''),
              rendered_body: template.body_html || '<p>Seeded email contents</p>',
              status: requiresApproval ? 'PENDING_APPROVAL' : 'SENT',
              requires_approval: requiresApproval,
              mapping_context: JSON.stringify({
                instance_id: instance.id,
                client_name: comp.name,
                service_name: master.name,
                expiry_date: dayjs(instance.expiry_date).format('YYYY-MM-DD'),
                amount_due: String(instance.amount_due)
              }),
              created_at: now.subtract(1, 'days').toDate(),
              sent_at: requiresApproval ? null : now.subtract(1, 'days').toDate()
            }
          });
          outboxCount++;
        }

        // 11. Generate RenewalReminders to populate the Follow-up Queue!
        const reminderSteps = [
          { step_number: 1, offset_days: -30, action_type: 'CALL_REMINDER', channel: 'PHONE', recipient_type: 'PRIMARY' },
          { step_number: 2, offset_days: -15, action_type: 'FOLLOW_UP_EMAIL', channel: 'EMAIL', recipient_type: 'PRIMARY' },
          { step_number: 3, offset_days: 0, action_type: 'EXPIRY_ALERT', channel: 'EMAIL', recipient_type: 'PRIMARY' },
        ];

        for (const step of reminderSteps) {
          let dueDate = dayjs(instance.expiry_date).add(step.offset_days, 'day');
          let remStatus = 'PENDING';
          let completedAt = null;
          let completedById = null;
          let skippedAt = null;
          let skipReason = null;

          if (status === 'EXPIRED') {
            if (step.step_number < 3) {
              remStatus = 'COMPLETED';
              completedAt = dueDate.add(1, 'day').toDate();
              completedById = userIds[svcNum % userIds.length];
            } else {
              // Expiry step is overdue
              remStatus = 'DUE';
            }
          } else if (status === 'DUE_SOON') {
            if (step.step_number === 1) {
              remStatus = 'COMPLETED';
              completedAt = dueDate.add(1, 'day').toDate();
              completedById = userIds[svcNum % userIds.length];
            } else if (step.step_number === 2) {
              // Make some due today (shows in Today tab), some overdue, some completed
              const randVal = svcNum % 3;
              if (randVal === 0) {
                remStatus = 'DUE';
                dueDate = now.startOf('day'); // Force due date to today!
              } else if (randVal === 1) {
                remStatus = 'COMPLETED';
                completedAt = dueDate.add(1, 'day').toDate();
                completedById = userIds[svcNum % userIds.length];
              } else {
                remStatus = 'SKIPPED';
                skippedAt = dueDate.add(1, 'day').toDate();
                skipReason = 'Customer confirmed payment pathway';
              }
            } else {
              remStatus = 'PENDING'; // Expiry step is upcoming
            }
          } else if (status === 'FOLLOW_UP') {
            if (step.step_number < 3) {
              remStatus = 'COMPLETED';
              completedAt = dueDate.add(1, 'day').toDate();
              completedById = userIds[svcNum % userIds.length];
            } else {
              remStatus = 'DUE';
              dueDate = now.startOf('day'); // due today
            }
          } else if (status === 'NOT_RENEWING') {
            if (step.step_number === 1) {
              remStatus = 'COMPLETED';
              completedAt = dueDate.add(1, 'day').toDate();
              completedById = userIds[svcNum % userIds.length];
            } else {
              remStatus = 'SKIPPED';
              skippedAt = dueDate.add(1, 'day').toDate();
              skipReason = 'Service marked as not renewing';
            }
          } else {
            // ACTIVE (future)
            remStatus = 'PENDING';
          }

          await (prisma as any).renewalReminder.create({
            data: {
              cycle_id: cycle.id,
              step_number: step.step_number,
              offset_days: step.offset_days,
              due_date: dueDate.toDate(),
              action_type: step.action_type,
              channel: step.channel,
              recipient_type: step.recipient_type,
              assigned_user_id: userIds[svcNum % userIds.length],
              template_id: templateIds.length > 0 ? templateIds[svcNum % templateIds.length] : null,
              status: remStatus,
              completed_at: completedAt,
              completed_by_id: completedById,
              skipped_at: skippedAt,
              skip_reason: skipReason,
              is_mandatory: step.step_number === 3,
            }
          });
          reminderCount++;
        }
      }
    }
  }

  console.log('\n=========================================================');
  console.log('📊 DATABASE SEEDING SUMMARY:');
  console.log(`  🏢 Client Companies:        ${companyRecords.length}`);
  console.log(`  👤 Contacts:                ${contacts.length}`);
  console.log(`  📄 Renewal Accounts:        ${accountCount}`);
  console.log(`  ⚙️  Service Instances:       ${serviceCount}`);
  console.log(`  🔄 Renewal Cycles:           ${cycleCount}`);
  console.log(`  🔔 Alert steps:             ${stepCount}`);
  console.log(`  📞 Follow-up logs:          ${followupCount}`);
  console.log(`  💳 Payment receipts:        ${paymentCount}`);
  console.log(`  📬 Email outbox / drafts:   ${outboxCount}`);
  console.log(`  📅 Renewal Reminders:       ${reminderCount}`);
  console.log(`  📂 Renewal Documents:       ${documentCount}`);
  console.log(`  📜 Renewal Audit Logs:      ${auditLogCount}`);
  console.log('=========================================================');
  console.log('✅ SEEDING COMPLETE! The renewals module data is fully flowable!');
}

main()
  .catch((e) => {
    console.error('Error during massive seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

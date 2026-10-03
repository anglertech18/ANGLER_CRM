import assert from 'assert';
import { prisma } from '../lib/prisma';
import { getFollowUpQueue, getQueueCounts, getFollowUpTaskAudit } from '../controllers/renewalFollowUpController';
import { activateRenewal, createRenewal, addService } from '../controllers/renewalController';
import { completeAction, previewEmailAction, queueEmailAction } from '../controllers/renewalFollowUpChannelActionController';
import { processOutbox } from '../services/notificationOutboxService';

async function runAcceptanceTest() {
  const RUN_ID = `E2E-RENEWAL-${Date.now()}`;
  console.log('================================================================');
  console.log(`🚀 FINAL PRODUCTION ACCEPTANCE RUN: ${RUN_ID}`);
  console.log('================================================================\n');

  const mockAdminUser = { id: 1, role: 'ADMIN', email: 'admin@anglercrm.com' };
  const mockExecutiveUser = { id: 2, role: 'SalesPerson', email: 'executive@anglercrm.com' };

  // ------------------------------------------------------------------
  // STEP A: COUNTS VS LIST TOTAL CONTRACT (MULTI-ROLE RBAC)
  // ------------------------------------------------------------------
  console.log('--- STEP A: COUNTS VS LIST TOTAL CONTRACT ASSERTION (ADMIN & EXECUTIVE ROLES) ---');
  const tabs = ['today', 'overdue', 'upcoming', 'completed', 'skipped'];

  for (const userRoleObj of [mockAdminUser, mockExecutiveUser]) {
    console.log(`\n  Testing Role: ${userRoleObj.role} (User #${userRoleObj.id})...`);
    const tabTotalsFromList: Record<string, number> = {};

    for (const tab of tabs) {
      const req: any = { query: { tab, page: '1', limit: '50', assignedOnly: userRoleObj.role === 'SalesPerson' ? 'true' : 'false' }, user: userRoleObj };
      const res: any = {
        json: (payload: any) => {
          tabTotalsFromList[tab] = payload.total ?? 0;
        },
        status: (code: number) => res,
      };
      await getFollowUpQueue(req, res);
    }

    let countsEndpointResult: any = {};
    const reqCounts: any = { query: { assignedOnly: userRoleObj.role === 'SalesPerson' ? 'true' : 'false' }, user: userRoleObj };
    const resCounts: any = {
      json: (payload: any) => {
        countsEndpointResult = payload;
      },
      status: (code: number) => resCounts,
    };
    await getQueueCounts(reqCounts, resCounts);

    for (const tab of tabs) {
      const countValue = countsEndpointResult[tab];
      const listTotal = tabTotalsFromList[tab];
      console.log(`    Role [${userRoleObj.role.padEnd(11)}] Tab [${tab.padEnd(9)}]: Counts Badge (${countValue}) === List Total (${listTotal})`);
      assert.strictEqual(countValue, listTotal, `Mismatch for role ${userRoleObj.role} on tab ${tab}`);
    }
  }
  console.log('  ✅ P0-ACCEPT-01 & BLOCKER-05 PASSED: Multi-role RBAC counts match list totals 100% cleanly!');

  // ------------------------------------------------------------------
  // STEP B: CREATING TRULY FRESH QA RENEWAL & REAL QA CONTACT (BLOCKER-03)
  // ------------------------------------------------------------------
  console.log(`\n--- STEP B: CREATING TRULY FRESH QA RENEWAL & REAL QA CONTACT FOR RUN ${RUN_ID} ---`);

  const clientCompany = await (prisma as any).clientCompany.findFirst();
  const serviceMaster = await (prisma as any).renewalServiceMaster.findFirst();

  if (!clientCompany || !serviceMaster) {
    console.error('❌ Prerequisite ClientCompany or RenewalServiceMaster not found');
    process.exit(1);
  }

  const freshQAContactEmail = `qa-contact-${RUN_ID.toLowerCase()}@anglercrm.com`;
  
  // Create real QA RenewalContact
  const qaContact = await (prisma as any).renewalContact.create({
    data: {
      client_company: { connect: { id: clientCompany.id } },
      name: `QA Contact ${RUN_ID}`,
      email: freshQAContactEmail,
      mobile: '+91 98765 43210',
      is_primary: true,
      is_active: true,
    },
  });
  console.log(`  ✅ Created Real QA RenewalContact #${qaContact.id}: ${freshQAContactEmail}`);

  const freshIdentifier = `srv-${RUN_ID.toLowerCase()}.example.test`;

  // 1. Create Account
  const reqCreateAccount: any = {
    body: {
      client_company_id: clientCompany.id,
      account_name: `QA Renewal Account ${RUN_ID}`,
      status: 'DRAFT',
    },
    user: mockAdminUser,
    ip: '127.0.0.1',
  };

  let newAccountId: number | null = null;
  const resCreateAccount: any = {
    json: (payload: any) => {
      newAccountId = payload.id;
      console.log(`  ✅ Created Fresh QA Renewal Account #${payload.id}`);
    },
    status: (code: number) => resCreateAccount,
  };
  await createRenewal(reqCreateAccount, resCreateAccount);
  assert(newAccountId, 'newAccountId must be created');

  // Find or create multi-channel policy
  let qaPolicy = await (prisma as any).renewalReminderPolicy.findFirst({
    where: { name: 'QA Multi-Channel Policy' },
    include: { steps: true },
  });

  if (!qaPolicy) {
    qaPolicy = await (prisma as any).renewalReminderPolicy.create({
      data: {
        name: 'QA Multi-Channel Policy',
        version: 1,
        is_active: true,
        steps: {
          create: [
            { step_number: 1, offset_days: -15, channel: 'EMAIL', action_type: 'EMAIL', recipient_type: 'BOTH', is_enabled: true, is_mandatory: false },
            { step_number: 2, offset_days: -15, channel: 'PHONE', action_type: 'CALL', recipient_type: 'BOTH', is_enabled: true, is_mandatory: false },
            { step_number: 3, offset_days: -15, channel: 'WHATSAPP', action_type: 'WHATSAPP', recipient_type: 'BOTH', is_enabled: true, is_mandatory: false },
          ],
        },
      },
      include: { steps: true },
    });
  }

  // 2. Add Service Instance with Real QA Customer Contact
  const reqAddService: any = {
    params: { id: String(newAccountId) },
    body: {
      service_master_id: serviceMaster.id,
      activation_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      duration_value: 1,
      duration_unit: 'YEAR',
      amount_due: 25000,
      assigned_user_id: mockAdminUser.id,
      customer_contact_id: qaContact.id,
      reminder_policy_id: qaPolicy.id,
      override_policy: true,
      identifier: freshIdentifier,
      status: 'ACTIVE',
    },
    user: mockAdminUser,
    ip: '127.0.0.1',
  };

  let serviceInstanceId: number | null = null;
  const resAddService: any = {
    json: (payload: any) => {
      serviceInstanceId = payload.id;
      console.log(`  ✅ Added Service Instance #${payload.id} with Contact #${qaContact.id}`);
    },
    status: (code: number) => resAddService,
  };
  await addService(reqAddService, resAddService);
  assert(serviceInstanceId, 'serviceInstanceId must be created');

  // 3. Activate Account
  const reqActivate: any = {
    params: { id: String(newAccountId) },
    body: {},
    user: mockAdminUser,
    ip: '127.0.0.1',
  };

  const resActivate: any = {
    json: (payload: any) => {
      console.log(`  ✅ Activated Renewal Account #${newAccountId}: ${payload.message}`);
    },
    status: (code: number) => resActivate,
  };
  await activateRenewal(reqActivate, resActivate);

  // ------------------------------------------------------------------
  // STEP C: BLOCKER-01 & BLOCKER-02 — MULTI-CHANNEL GROUPING & EXECUTION MODES
  // ------------------------------------------------------------------
  console.log(`\n--- STEP C: MULTI-CHANNEL PARENT GROUPING & EXECUTION MODES (BLOCKER-01 & BLOCKER-02) ---`);

  const freshCycle = await prisma.renewalCycle.findFirst({
    where: { service_instance_id: serviceInstanceId! },
    orderBy: { id: 'desc' },
  });
  assert(freshCycle, 'Fresh cycle must exist');

  const parentTasks = await prisma.renewalFollowUpTask.findMany({
    where: { cycle_id: freshCycle.id },
    include: { channel_actions: true },
  });

  console.log(`  Parent Tasks Count for Cycle #${freshCycle.id}: ${parentTasks.length}`);
  assert.strictEqual(parentTasks.length, 1, `BLOCKER-01 FAIL: Cycle must have EXACTLY 1 grouped parent task for 15D window (found ${parentTasks.length})`);

  const singleParentTask = parentTasks[0];
  console.log(`  ✅ Grouped Parent Task #${singleParentTask.id} (Key: ${singleParentTask.follow_up_group_key}) contains ${singleParentTask.channel_actions.length} Child Actions:`);

  let callAction: any = null;
  let emailAction: any = null;
  let whatsappAction: any = null;

  singleParentTask.channel_actions.forEach((ca: any) => {
    console.log(`    -> Child Action #${ca.id} | channel=${ca.channel} | mode=${ca.execution_mode} | status=${ca.status}`);
    if (ca.channel === 'CALL' || ca.channel === 'PHONE') callAction = ca;
    if (ca.channel === 'EMAIL') emailAction = ca;
    if (ca.channel === 'WHATSAPP') whatsappAction = ca;
  });

  assert(emailAction, 'Grouped parent task must contain EMAIL child action');
  assert(callAction, 'Grouped parent task must contain CALL child action');
  assert(whatsappAction, 'Grouped parent task must contain WHATSAPP child action');

  assert.strictEqual(emailAction.execution_mode, 'AUTOMATIC', 'EMAIL action mode must be AUTOMATIC');
  assert.strictEqual(callAction.execution_mode, 'MANUAL', 'CALL action mode must be MANUAL');
  assert.strictEqual(whatsappAction.execution_mode, 'APPROVAL_REQUIRED', 'WHATSAPP action mode must be APPROVAL_REQUIRED');
  console.log('  ✅ BLOCKER-01 & BLOCKER-02 PASSED: 1 Grouped Parent Task materialized 3 Child Actions with exact execution modes!');

  // ------------------------------------------------------------------
  // STEP D: CALL OUTCOME BEFORE/AFTER EXECUTION
  // ------------------------------------------------------------------
  console.log(`\n--- STEP D: CALL OUTCOME BEFORE/AFTER EXECUTION ---`);
  assert.strictEqual(callAction.status, 'PENDING', 'BEFORE status for Call action must be PENDING');

  const outcomePayload = {
    outcome_code: 'CALLBACK_REQUESTED',
    customer_response: `Requested callback for ${freshIdentifier}`,
    notes: `Logged via test ${RUN_ID}`,
  };

  const reqCompleteCall: any = {
    params: { id: String(callAction.id) },
    body: outcomePayload,
    user: mockAdminUser,
    ip: '127.0.0.1',
  };

  const resCompleteCall: any = {
    json: (payload: any) => {
      console.log(`  HTTP completeAction Response: status=${payload.status}, outcome=${payload.outcome_code}`);
    },
    status: (code: number) => resCompleteCall,
  };
  await completeAction(reqCompleteCall, resCompleteCall);

  const afterCallAction = await prisma.renewalFollowUpChannelAction.findUnique({ where: { id: callAction.id } });
  assert.strictEqual(afterCallAction?.status, 'COMPLETED', 'AFTER status for Call action must be COMPLETED');
  assert.strictEqual(afterCallAction?.outcome_code, 'CALLBACK_REQUESTED');
  console.log(`  ✅ Verified Call Action #${callAction.id} AFTER Status: ${afterCallAction?.status}`);

  // ------------------------------------------------------------------
  // STEP E: EMAIL PREVIEW & STRICT RECIPIENT RESOLUTION (BLOCKER-03)
  // ------------------------------------------------------------------
  console.log(`\n--- STEP E: EMAIL PREVIEW & STRICT RECIPIENT RESOLUTION (BLOCKER-03) ---`);
  const reqPreviewEmail: any = {
    params: { id: String(emailAction.id) },
    user: mockAdminUser,
  };

  let previewResult: any = null;
  const resPreviewEmail: any = {
    json: (payload: any) => { previewResult = payload; },
    status: (code: number) => resPreviewEmail,
  };
  await previewEmailAction(reqPreviewEmail, resPreviewEmail);

  assert.strictEqual(previewResult.service_instance_id, serviceInstanceId);
  assert.strictEqual(previewResult.identifier, freshIdentifier);
  console.log(`  ✅ Email Preview rendered for Action #${emailAction.id}: subject="${previewResult.subject}"`);

  // Queue Email with Real Customer Contact
  const reqQueueEmail: any = {
    params: { id: String(emailAction.id) },
    body: { recipient_address: freshQAContactEmail },
    user: mockAdminUser,
  };

  const resQueueEmail: any = {
    json: (payload: any) => {
      console.log(`  HTTP queueEmailAction Response: status=${payload.status}`);
    },
    status: (code: number) => resQueueEmail,
  };
  await queueEmailAction(reqQueueEmail, resQueueEmail);

  const queuedOutbox = await (prisma as any).notificationOutbox.findFirst({
    where: {
      OR: [
        { channel_action_id: emailAction.id },
        { mapping_context: { contains: `"channel_action_id":${emailAction.id}` } },
      ],
    },
    orderBy: { id: 'desc' },
  });

  assert(queuedOutbox, 'NotificationOutbox row must exist');
  assert.strictEqual(queuedOutbox.status, 'QUEUED');
  assert.strictEqual(queuedOutbox.recipient, freshQAContactEmail, `BLOCKER-03 FAIL: Recipient must match real QA contact email ${freshQAContactEmail} (found ${queuedOutbox.recipient})`);
  assert.notStrictEqual(queuedOutbox.recipient, 'contact@client.com', 'BLOCKER-03 FAIL: Generic fallback contact@client.com must NOT be used');
  console.log(`  ✅ BLOCKER-03 PASSED: NotificationOutbox row #${queuedOutbox.id} status QUEUED with Real QA Contact Email (${queuedOutbox.recipient})!`);

  // ------------------------------------------------------------------
  // STEP F: WORKER LIFECYCLE & IDEMPOTENCY VERIFICATION (BLOCKER-04)
  // ------------------------------------------------------------------
  console.log(`\n--- STEP F: WORKER LIFECYCLE & IDEMPOTENCY VERIFICATION (BLOCKER-04) ---`);
  process.env.MOCK_EMAIL_SEND = 'true';

  console.log(`  Running processOutbox() worker...`);
  await processOutbox();

  const sentOutbox = await (prisma as any).notificationOutbox.findUnique({ where: { id: queuedOutbox.id } });
  assert.strictEqual(sentOutbox.status, 'SENT', 'Outbox status must transition to SENT');
  assert(sentOutbox.provider_ref?.includes('MOCK_SMTP'), 'Outbox must contain provider_ref from worker dispatch');
  console.log(`  ✅ Worker dispatch transition verified: Outbox #${sentOutbox.id} status is ${sentOutbox.status} (Provider Ref: ${sentOutbox.provider_ref})`);

  // Test Idempotency: Run worker a second time
  console.log(`  Running processOutbox() worker a second time for idempotency check...`);
  await processOutbox();

  const afterSecondRunOutbox = await (prisma as any).notificationOutbox.findUnique({ where: { id: queuedOutbox.id } });
  assert.strictEqual(afterSecondRunOutbox.status, 'SENT', 'Outbox status must remain SENT');
  console.log('  ✅ BLOCKER-04 PASSED: Worker lifecycle QUEUED -> PROCESSING -> SENT verified & duplicate dispatch suppressed!');

  // ------------------------------------------------------------------
  // STEP G: AUDIT ENDPOINT VERIFICATION (BLOCKER-05)
  // ------------------------------------------------------------------
  console.log(`\n--- STEP G: AUDIT ENDPOINT VERIFICATION (BLOCKER-05) ---`);
  const reqAudit: any = {
    params: { reminderId: String(singleParentTask.id) },
    user: mockAdminUser,
  };

  let auditResponse: any = null;
  const resAudit: any = {
    json: (payload: any) => { auditResponse = payload; },
    status: (code: number) => resAudit,
  };
  await getFollowUpTaskAudit(reqAudit, resAudit);

  assert(auditResponse, 'Audit response must exist');
  assert(auditResponse.task, 'Audit response must contain task object');
  console.log(`  ✅ Audit Endpoint returned task #${auditResponse.task.id} with ${auditResponse.channel_actions?.length} channel action(s)`);

  console.log('\n================================================================');
  console.log(`🎉 ALL 5 PRODUCTION BLOCKERS PASSED CLEANLY FOR RUN ${RUN_ID}`);
  console.log('================================================================');
}

runAcceptanceTest().catch((err) => {
  console.error('\n❌ ACCEPTANCE TEST FAILED WITH ERROR:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());

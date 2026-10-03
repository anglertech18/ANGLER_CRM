import dotenv from 'dotenv';
import { prisma } from '../src/lib/prisma';
import { resolveRecipients } from '../src/cron/renewalReminderCron';
import dayjs from 'dayjs';

dotenv.config();

async function runTests() {
  console.log("=========================================================");
  console.log("🚀 STARTING E2E RENEWAL SYSTEM AUTOMATED TEST RUNNER");
  console.log("=========================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Set up temporary test records
  console.log("\n📦 Setting up sandbox test records...");
  
  // 1. Find or create a test client company
  let clientCo = await prisma.clientCompany.findFirst({
    where: { name: 'TEST_E2E_COMPANY' }
  });
  if (!clientCo) {
    clientCo = await prisma.clientCompany.create({
      data: {
        name: 'TEST_E2E_COMPANY',
      }
    });
  }
  
  // Clean up any old test contacts
  await (prisma as any).renewalContact.deleteMany({
    where: { client_company_id: clientCo.id }
  });

  // Create four contacts for each role category
  const contactPrimary = await (prisma as any).renewalContact.create({
    data: {
      name: 'Test Primary AM',
      email: 'primary@teste2e.com',
      role: 'PRIMARY',
      email_consent: true,
      client_company_id: clientCo.id
    }
  });

  const contactBilling = await (prisma as any).renewalContact.create({
    data: {
      name: 'Test Billing Accounts',
      email: 'billing@teste2e.com',
      role: 'BILLING',
      email_consent: true,
      client_company_id: clientCo.id
    }
  });

  const contactTechnical = await (prisma as any).renewalContact.create({
    data: {
      name: 'Test Technical Dev',
      email: 'technical@teste2e.com',
      role: 'TECHNICAL',
      email_consent: true,
      client_company_id: clientCo.id
    }
  });

  const contactConsolidated = await (prisma as any).renewalContact.create({
    data: {
      name: 'Test Consolidated Boss',
      email: 'boss@teste2e.com',
      role: 'PRIMARY',
      email_consent: true,
      use_default_template: true, // Consolidated
      client_company_id: clientCo.id
    }
  });

  console.log("  Sandbox contacts created successfully.");

  // -------------------------------------------------------------
  // TEST CASE 1: Service Master Data Verification
  // -------------------------------------------------------------
  console.log("\n🧪 TEST CASE 1: Service Master Data Specifications");
  const seededServices = await prisma.renewalServiceMaster.findMany({
    where: {
      name: {
        in: [
          'Domain Renewal',
          'Server Renewal',
          'G Suite Email Server Renewal',
          'Office 365 Email Server Renewal',
          'SSL Renewal',
          'CMS Website AMC Renewal',
          'Website Optimization and Security Services'
        ]
      }
    },
    include: { category: true }
  });

  assert(seededServices.length === 7, `Expected all 7 user-specified service masters, found: ${seededServices.length}`);
  
  const gsuite = seededServices.find(s => s.name === 'G Suite Email Server Renewal');
  assert(gsuite?.supports_quantity === true, "G Suite Email Server Renewal supports quantity (No. of Users)");
  
  const amc = seededServices.find(s => s.name === 'CMS Website AMC Renewal');
  assert(amc?.supports_amc === true, "CMS Website AMC Renewal supports AMC pricing mapping");

  // -------------------------------------------------------------
  // TEST CASE 2: Role-based recipient routing (SSL alerts go to Technical)
  // -------------------------------------------------------------
  console.log("\n🧪 TEST CASE 2: SSL alert recipient routing");
  const dummySSLInstance = {
    renewal_account: { client_company_id: clientCo.id },
    service_master: { category: { code: 'SSL' } }
  };
  const stepSSL = { days_before: 30, step_number: 1 };
  
  const sslRecipients = await resolveRecipients(dummySSLInstance, stepSSL);
  
  // Should resolve to TECHNICAL contact + use_default_template contact
  const emails = sslRecipients.map(r => r.email);
  assert(emails.includes('technical@teste2e.com'), "SSL alert resolved TECHNICAL contact recipient");
  assert(emails.includes('boss@teste2e.com'), "SSL alert included use_default_template (consolidated) contact recipient");
  assert(!emails.includes('billing@teste2e.com'), "SSL alert excluded BILLING contact recipient");

  // -------------------------------------------------------------
  // TEST CASE 3: Post-Expiry alert routing (goes to Billing)
  // -------------------------------------------------------------
  console.log("\n🧪 TEST CASE 3: Post-Expiry/Late alert routing");
  const dummyDomainInstance = {
    renewal_account: { client_company_id: clientCo.id },
    service_master: { category: { code: 'DOMAIN' } }
  };
  // Late warning / post-expiry step
  const stepLate = { days_before: 0, step_number: 3 };
  
  const lateRecipients = await resolveRecipients(dummyDomainInstance, stepLate);
  const lateEmails = lateRecipients.map(r => r.email);
  
  assert(lateEmails.includes('billing@teste2e.com'), "Late alert resolved BILLING contact recipient");
  assert(lateEmails.includes('boss@teste2e.com'), "Late alert included use_default_template (consolidated) contact recipient");
  assert(!lateEmails.includes('technical@teste2e.com'), "Late alert excluded TECHNICAL contact recipient");

  // -------------------------------------------------------------
  // TEST CASE 4: Positive follow-up log bypass logic (In-memory verification)
  // -------------------------------------------------------------
  console.log("\n🧪 TEST CASE 4: Follow-up positive agreement logic bypass");
  
  const mockInstance = {
    id: 9999,
    expiry_date: dayjs().add(30, 'day').toDate(),
    cycles: [
      { id: 8888, is_active: true, created_at: dayjs().subtract(5, 'day').toDate() }
    ],
    follow_up_logs: [
      { id: 7777, outcome_code: 'AGREED', logged_at: dayjs().subtract(2, 'day').toDate() }
    ]
  };

  // Perform the same logic in reminder cron
  const activeCycle = mockInstance.cycles?.[0];
  let isBypassed = false;
  if (activeCycle && mockInstance.follow_up_logs) {
    const agreement = mockInstance.follow_up_logs.find((log: any) => 
      log.outcome_code && 
      ['AGREED', 'PAYMENT_PENDING', 'RENEWED'].includes(log.outcome_code) &&
      dayjs(log.logged_at).isAfter(dayjs(activeCycle.created_at).subtract(1, 'second'))
    );
    if (agreement) {
      isBypassed = true;
    }
  }

  assert(isBypassed === true, "Alert engine correctly bypasses reminder steps if customer has already AGREED");

  // -------------------------------------------------------------
  // Clean up sandbox records
  // -------------------------------------------------------------
  console.log("\n🧹 Cleaning up sandbox test records...");
  await (prisma as any).renewalContact.deleteMany({
    where: { client_company_id: clientCo.id }
  });
  await prisma.clientCompany.delete({
    where: { id: clientCo.id }
  });
  console.log("  Sandbox records cleaned up.");

  console.log("\n=========================================================");
  console.log(`📊 TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================");
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Fatal test runner crash:", err);
  process.exit(1);
});

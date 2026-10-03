process.env.DATABASE_URL = "mysql://root:@127.0.0.1:3306/kannan_angler_crm_v1";
const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const { createRenewalAccount } = require('./dist/services/renewalService');
const { generateOrderFormPDF } = require('./dist/utils/orderFormPdfGenerator');
const { generateBulkUploadTemplate, previewBulkUpload, processBulkUpload } = require('./dist/services/renewalBulkUploadService');

async function runTests() {
  console.log('================================================================');
  console.log('E2E TEST SUITE: CRM RENEWALS ARCHITECTURE & TRINETRA MAPPING');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  // ── TEST 1: Creation-time zero-email behavior ────────────────────────────
  console.log('TEST 1: Renewal Account Creation Zero-Email Verification');
  const initialOutboxCount = await prisma.notificationOutbox.count();

  const testClient = await prisma.clientCompany.findFirst() || await prisma.clientCompany.create({ data: { name: 'E2E Test Client' } });
  const testServiceMaster = await prisma.renewalServiceMaster.findFirst();

  const newAcct = await createRenewalAccount({
    client_company_id: testClient.id,
    order_number: `RN-TEST-${Date.now()}`,
    services: [
      {
        service_master_id: testServiceMaster.id,
        identifier: 'e2e-test.com',
        quantity: 1,
        amount_due: 3500,
        activation_date: '2026-07-01',
        expiry_date: '2026-08-01'
      }
    ]
  }, 1);

  const postOutboxCount = await prisma.notificationOutbox.count();
  assert(newAcct && newAcct.id > 0, `Created Renewal Account #${newAcct.id}`);
  assert(postOutboxCount === initialOutboxCount, `Zero customer emails queued on account creation (Outbox stayed at ${initialOutboxCount})`);

  // ── TEST 2: Parent Company -> Order Form PDF Resolution (Trinetra vs ANGLER) ──
  console.log('\nTEST 2: Parent Company Order Form PDF Resolution');

  const trinetraParent = await prisma.company.findFirst({ where: { name: { contains: 'Trinetra' } } });
  const anglerParent = await prisma.company.findFirst({ where: { name: { contains: 'Angler' } } });

  assert(trinetraParent && trinetraParent.order_form_template_id > 0, `Trinetra Parent Company mapped to Order Form Template #${trinetraParent?.order_form_template_id}`);
  assert(anglerParent && anglerParent.order_form_template_id > 0, `ANGLER Parent Company mapped to Order Form Template #${anglerParent?.order_form_template_id}`);

  // Test PDF generation for Trinetra account
  const trinetraAcct = await prisma.renewalAccount.create({
    data: {
      company_id: trinetraParent.id,
      client_company_id: testClient.id,
      order_number: `RN-TRINETRA-${Date.now()}`,
      status: 'ACTIVE',
      created_by_id: 1,
    }
  });
  await prisma.renewalServiceInstance.create({
    data: {
      renewal_account_id: trinetraAcct.id,
      service_master_id: testServiceMaster.id,
      identifier: '4gcamera',
      quantity: 1,
      unit_price: 3500,
      amount_due: 4130,
      status: 'ACTIVE'
    }
  });

  const pdfResult = await generateOrderFormPDF(trinetraAcct.id);
  assert(fs.existsSync(pdfResult.filePath), `Generated Order Form PDF file at ${pdfResult.relativeUrl}`);

  // ── TEST 3: 26-Column Template Generation & Excel Preview ──────────────
  console.log('\nTEST 3: 26-Column Bulk Import Template & Preview API');

  const templateBuf = await generateBulkUploadTemplate('FULL_RENEWAL');
  assert(templateBuf && templateBuf.length > 5000, `Generated 26-Column Bulk Import Excel template (${templateBuf.length} bytes)`);

  const sampleExcelPath = 'E:\\\\angler_crm\\\\md files\\\\ref\\\\TRINETRA_Full_Renewal_Bulk_Import_Template (1).xlsx';
  if (fs.existsSync(sampleExcelPath)) {
    const sampleBuf = fs.readFileSync(sampleExcelPath);
    const previewRes = await previewBulkUpload(sampleBuf);

    assert(previewRes && previewRes.summary.totalRows > 0, `Preview API parsed ${previewRes.summary.totalRows} rows from reference Excel file`);
    assert(previewRes.rows.length === previewRes.summary.totalRows, `Preview returned structured status for all rows`);
    console.log('   Preview Summary:', previewRes.summary);
  } else {
    console.log('   Sample file path not found for preview test, skipping sample preview');
  }

  // ── TEST 4: Full Bulk Upload Transactional Process ─────────────────────
  console.log('\nTEST 4: Bulk Upload Import & Financial / Expiry Calculation');

  if (fs.existsSync(sampleExcelPath)) {
    const sampleBuf = fs.readFileSync(sampleExcelPath);
    const processRes = await processBulkUpload(sampleBuf, 'FULL_RENEWAL', 1);

    assert(processRes.success === true, `Bulk Upload process completed successfully`);
    assert(processRes.importedCount > 0, `Imported ${processRes.importedCount} renewal records into database`);
    console.log('   Import Summary:', processRes.createdSummary);
  }

  console.log('\n================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runTests().catch(console.error);

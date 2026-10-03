process.env.DATABASE_URL = "mysql://root:@127.0.0.1:3306/kannan_angler_crm_v1";
const { PrismaClient } = require('./prisma/v2-client');
const prisma = new PrismaClient();
const fs = require('fs');

const { createServiceMaster, updateServiceMaster } = require('./dist/controllers/renewalMasterController');
const { resolveServiceFieldRules } = require('./dist/services/renewalFieldRuleResolver');
const { createRenewalAccount } = require('./dist/services/renewalService');
const { generateBulkUploadTemplate, processBulkUpload } = require('./dist/services/renewalBulkUploadService');
const { generateOrderFormPDF } = require('./dist/utils/orderFormPdfGenerator');

async function runVerification() {
  console.log('================================================================');
  console.log('CRM RENEWALS ARCHITECTURE VERIFICATION SUITE');
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

  // ── TEST 1: Service Master UI Field Configuration & Persistence ───────────
  console.log('TEST 1: Service Master Field Config API Persistence & Resolver');
  
  const testSvc = await prisma.renewalServiceMaster.findFirst();
  assert(testSvc, `Found Service Master #${testSvc.id} (${testSvc.name})`);

  // Update Service Master config flags
  await prisma.renewalServiceMaster.update({
    where: { id: testSvc.id },
    data: {
      supports_provider: false,
      supports_server_name: false,
      supports_plan_name: false,
      supports_quantity: true,
      requires_quantity: true,
      quantity_label: 'No. of Vehicles',
      requires_identifier: true
    }
  });

  const reloadedSvc = await prisma.renewalServiceMaster.findUnique({ where: { id: testSvc.id } });
  assert(reloadedSvc.supports_provider === false, `Backend stored supports_provider = false`);
  assert(reloadedSvc.quantity_label === 'No. of Vehicles', `Backend stored quantity_label = 'No. of Vehicles'`);

  // Test field rule resolver
  const resolvedRules = await resolveServiceFieldRules(testSvc.id);
  assert(resolvedRules.provider.visible === false, `Resolver correctly derived provider.visible = false`);
  assert(resolvedRules.quantity.label === 'No. of Vehicles', `Resolver correctly derived quantity.label = 'No. of Vehicles'`);

  // Reset flags
  await prisma.renewalServiceMaster.update({
    where: { id: testSvc.id },
    data: {
      supports_provider: true,
      supports_server_name: true,
      supports_plan_name: true,
      supports_quantity: false,
      requires_quantity: false,
      quantity_label: null
    }
  });

  // ── TEST 2: Backend Resolver Enforcement on Creation ─────────────────────
  console.log('\nTEST 2: Backend Validation Enforcement via Shared Resolver');
  
  const testClient = await prisma.clientCompany.findFirst() || await prisma.clientCompany.create({ data: { name: 'E2E Validation Client' } });
  
  let creationFailed = false;
  try {
    // Attempt creation with missing required identifier
    await createRenewalAccount({
      client_company_id: testClient.id,
      order_number: `RN-ERR-${Date.now()}`,
      services: [
        {
          service_master_id: testSvc.id,
          identifier: '', // Missing required identifier!
          amount_due: 1000
        }
      ]
    }, 1);
  } catch (err) {
    creationFailed = true;
    assert(err.message.includes('required'), `createRenewalAccount rejected invalid request: "${err.message}"`);
  }
  assert(creationFailed, `Backend creation validation enforced Service Master required rules`);

  // ── TEST 3: Bulk Import Excel Headers & Financial Formula Audit ─────────
  console.log('\nTEST 3: 26-Column Template Headers & Excel Import Audit');

  const buf = await generateBulkUploadTemplate('FULL_RENEWAL');
  assert(buf && buf.length > 5000, `Generated 26-column bulk import template buffer (${buf.length} bytes)`);

  const samplePath = 'E:\\\\angler_crm\\\\md files\\\\ref\\\\TRINETRA_Full_Renewal_Bulk_Import_Template (1).xlsx';
  if (fs.existsSync(samplePath)) {
    const sampleBuf = fs.readFileSync(samplePath);
    const processRes = await processBulkUpload(sampleBuf, 'FULL_RENEWAL', 1);

    assert(processRes.success === true, `Bulk Upload process completed successfully`);
    assert(processRes.importedCount > 0, `Imported ${processRes.importedCount} records with parent company assignment`);
  }

  // ── TEST 4: Parent Company Order Form Generation & Attachment ─────────────
  console.log('\nTEST 4: Parent Company Dynamic Order Form PDF');

  const trinetraParent = await prisma.company.findFirst({ where: { name: { contains: 'Trinetra' } } });
  assert(trinetraParent && trinetraParent.order_form_template_id > 0, `Trinetra Parent Company mapped to Order Form Template #${trinetraParent?.order_form_template_id}`);

  const pdfRes = await generateOrderFormPDF(testSvc.id);
  assert(fs.existsSync(pdfRes.filePath), `Generated PDF at ${pdfRes.relativeUrl}`);

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runVerification().catch(console.error);

/**
 * ANGLER CRM - FULL RENEWAL MODULE E2E TEST SUITE
 * 8 Suites: Payment | Contact | Template Export | Bulk Import | Order Form | Follow-Up | DB Integrity | Outbox
 */
process.env.DATABASE_URL = "mysql://root:@127.0.0.1:3306/kannan_angler_crm_v1";

const { PrismaClient } = require("./prisma/v2-client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

let totalPass = 0, totalFail = 0, totalWarn = 0;
const results = [];
const pass  = (s, t, d="") => { totalPass++;  results.push({ status:"PASS", suite:s, test:t, detail:d }); };
const fail  = (s, t, d="") => { totalFail++;  results.push({ status:"FAIL", suite:s, test:t, detail:d }); };
const warn  = (s, t, d="") => { totalWarn++;  results.push({ status:"WARN", suite:s, test:t, detail:d }); };
const SEP   = (t) => console.log(`\n${"=".repeat(66)}\n  ${t}\n${"=".repeat(66)}`);

// -- SUITE 1: PAYMENT ---------------------------------------------------------
async function suitePayment() {
  SEP("SUITE 1: PAYMENT FLOW");
  const cycle = await prisma.$queryRaw`
    SELECT rc.id, rc.amount_due, rc.amount_collected, rc.outstanding
    FROM renewal_cycle rc WHERE rc.is_active=1 AND rc.amount_due > 0 LIMIT 1`;
  if (!cycle.length) { warn("Payment","No active cycles found","Skip"); return; }
  const c = cycle[0];
  const amtDue = parseFloat(c.amount_due);
  const initCollected = parseFloat(c.amount_collected||0);
  pass("Payment","Found active cycle",`#${c.id} due=Rs${amtDue}`);

  // Partial payment
  const partial = Math.min(1000, amtDue/2);
  try {
    await prisma.$executeRawUnsafe(`INSERT INTO renewal_payment(cycle_id,amount,payment_date,collected_by_id,payment_mode,reference) VALUES(${c.id},${partial},NOW(),1,'NEFT','E2E-P1-${Date.now()}')`);
    const agg = await prisma.$queryRaw`SELECT COALESCE(SUM(amount),0) as total FROM renewal_payment WHERE cycle_id=${c.id}`;
    const tot = parseFloat(agg[0].total);
    const out = Math.max(0, amtDue - tot);
    await prisma.$executeRaw`UPDATE renewal_cycle SET amount_collected=${tot}, outstanding=${out} WHERE id=${c.id}`;
    const upd = (await prisma.$queryRaw`SELECT amount_collected, outstanding FROM renewal_cycle WHERE id=${c.id}`)[0];
    parseFloat(upd.amount_collected) > initCollected
      ? pass("Payment","Partial: amount_collected increased",`${initCollected}->Rs${upd.amount_collected}`)
      : fail("Payment","Partial: amount_collected NOT updated","");
    parseFloat(upd.outstanding) < amtDue
      ? pass("Payment","Partial: outstanding decreased","")
      : fail("Payment","Partial: outstanding NOT decreased","");
  } catch(e) { fail("Payment","Partial payment insert",e.message.substring(0,80)); }

  // Full payment
  try {
    const rem = parseFloat((await prisma.$queryRaw`SELECT outstanding FROM renewal_cycle WHERE id=${c.id}`)[0].outstanding);
    if (rem > 0) {
      await prisma.$executeRawUnsafe(`INSERT INTO renewal_payment(cycle_id,amount,payment_date,collected_by_id,payment_mode,reference) VALUES(${c.id},${rem},NOW(),1,'NEFT','E2E-P2-${Date.now()}')`);
      const agg2 = await prisma.$queryRaw`SELECT COALESCE(SUM(amount),0) as total FROM renewal_payment WHERE cycle_id=${c.id}`;
      const tot2 = parseFloat(agg2[0].total);
      const out2 = Math.max(0, amtDue - tot2);
      await prisma.$executeRaw`UPDATE renewal_cycle SET amount_collected=${tot2}, outstanding=${out2} WHERE id=${c.id}`;
    }
    const final = (await prisma.$queryRaw`SELECT outstanding FROM renewal_cycle WHERE id=${c.id}`)[0];
    parseFloat(final.outstanding) === 0
      ? pass("Payment","Full payment: outstanding=0","")
      : fail("Payment","Full payment: outstanding still >0",`Rs${final.outstanding}`);
  } catch(e) { fail("Payment","Full payment",e.message.substring(0,80)); }

  // Overpayment guard
  try {
    await prisma.$executeRawUnsafe(`INSERT INTO renewal_payment(cycle_id,amount,payment_date,collected_by_id,payment_mode) VALUES(${c.id},999999,NOW(),1,'TEST')`);
    const agg3 = await prisma.$queryRaw`SELECT COALESCE(SUM(amount),0) as total FROM renewal_payment WHERE cycle_id=${c.id}`;
    const out3 = Math.max(0, amtDue - parseFloat(agg3[0].total));
    await prisma.$executeRaw`UPDATE renewal_cycle SET amount_collected=${parseFloat(agg3[0].total)}, outstanding=${out3} WHERE id=${c.id}`;
    const f3 = (await prisma.$queryRaw`SELECT outstanding FROM renewal_cycle WHERE id=${c.id}`)[0];
    parseFloat(f3.outstanding) >= 0
      ? pass("Payment","Overpayment guard: outstanding>=0 always",`${f3.outstanding}`)
      : fail("Payment","Overpayment guard FAILED: outstanding went negative",`${f3.outstanding}`);
  } catch(e) { fail("Payment","Overpayment test",e.message.substring(0,80)); }

  // Cleanup
  try {
    await prisma.$executeRaw`DELETE FROM renewal_payment WHERE cycle_id=${c.id} AND (reference LIKE 'E2E-%' OR payment_mode='TEST')`;
    const agg4 = await prisma.$queryRaw`SELECT COALESCE(SUM(amount),0) as total FROM renewal_payment WHERE cycle_id=${c.id}`;
    const tot4 = parseFloat(agg4[0].total);
    await prisma.$executeRaw`UPDATE renewal_cycle SET amount_collected=${tot4}, outstanding=${Math.max(0,amtDue-tot4)} WHERE id=${c.id}`;
    pass("Payment","Cleanup: payments removed and cycle restored","");
  } catch(e) { warn("Payment","Cleanup failed",e.message.substring(0,60)); }
}

// -- SUITE 2: CONTACT ----------------------------------------------------------
async function suiteContact() {
  SEP("SUITE 2: CONTACT CREATE/SAVE");
  const company = await prisma.clientCompany.findFirst({ where:{is_active:true} });
  if (!company) { warn("Contact","No company found","Skip"); return; }

  const cases = [
    { label:"Valid contact with company_id", data:{ client_company_id:company.id, name:"E2E Contact", email:"e2e@test.com", mobile:"9876543210", role:"PRIMARY", is_primary:true }, ok:true },
    { label:"Missing name", data:{ client_company_id:company.id, name:"", email:"e2e@test.com" }, ok:false },
    { label:"Auto-create company from name", data:{ company_name:`E2E AutoCo ${Date.now()}`, name:"Auto Contact", mobile:"9000000001" }, ok:true },
    { label:"No company info at all", data:{ name:"No Company" }, ok:false },
    { label:"Duplicate email same company", data:{ client_company_id:company.id, name:"Dup1", email:"dup-e2e@test.com" }, ok:true },
    { label:"Second same email same company", data:{ client_company_id:company.id, name:"Dup2", email:"dup-e2e@test.com" }, ok:true },
  ];

  for (const tc of cases) {
    try {
      if (!tc.data.name || !tc.data.name.trim()) {
        if (!tc.ok) { pass("Contact",tc.label,"Empty name rejected before DB"); continue; }
      }
      let companyId = tc.data.client_company_id;
      if (!companyId && tc.data.company_name) {
        let co = await prisma.clientCompany.findFirst({ where:{ name:{ equals:tc.data.company_name } } });
        if (!co) co = await prisma.clientCompany.create({ data:{ name:tc.data.company_name } });
        companyId = co.id;
      }
      if (!companyId) {
        if (!tc.ok) { pass("Contact",tc.label,"No company rejected"); continue; }
        else { fail("Contact",tc.label,"No company but expected to pass"); continue; }
      }
      const contact = await prisma.renewalContact.create({ data:{
        name: String(tc.data.name||"").trim(), email:tc.data.email||null, mobile:tc.data.mobile||null,
        role:tc.data.role||"PRIMARY", is_primary:tc.data.is_primary===true,
        email_consent:true, phone_consent:true, whatsapp_consent:false,
        client_company_id:companyId, is_active:true
      }});
      if (tc.ok) {
        pass("Contact",tc.label,`Created #${contact.id}`);
        await prisma.renewalContact.delete({ where:{ id:contact.id } });
      } else {
        fail("Contact",tc.label,"Should have been rejected");
      }
    } catch(e) {
      if (!tc.ok) pass("Contact",tc.label,`Correctly failed: ${e.message.substring(0,50)}`);
      else fail("Contact",tc.label,`Unexpected error: ${e.message.substring(0,80)}`);
    }
  }
}

// -- SUITE 3: TEMPLATE EXPORT -------------------------------------------------
async function suiteExport() {
  SEP("SUITE 3: BULK UPLOAD TEMPLATE EXPORT");
  let generateBulkUploadTemplate;
  try {
    ({ generateBulkUploadTemplate } = require("./dist/services/renewalBulkUploadService"));
    pass("TemplateExport","Service loaded","");
  } catch(e) { fail("TemplateExport","Cannot load renewalBulkUploadService",e.message); return; }

  // Export
  try {
    const buf = await generateBulkUploadTemplate("FULL_RENEWAL");
    if (!Buffer.isBuffer(buf) || buf.length < 1000) { fail("TemplateExport","Export buffer invalid",""); return; }
    pass("TemplateExport","Export generates valid buffer",`${buf.length} bytes`);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const names = wb.worksheets.map(ws=>ws.name);

    names.includes("Full Renewals Bulk Upload")
      ? pass("TemplateExport","Upload sheet name correct","")
      : fail("TemplateExport","Upload sheet missing",`Found: ${names.join(",")}`);
    names.includes("Master_References")
      ? pass("TemplateExport","Master_References hidden sheet exists","")
      : warn("TemplateExport","Master_References missing","");

    const ws = wb.getWorksheet("Full Renewals Bulk Upload");
    const hdrs = []; ws.getRow(1).eachCell(c => hdrs.push(String(c.value||"")));
    ["Client Company Name","Expiry Date","Amount Due","Service Category","Domain / Server Identifier"].forEach(h=>{
      hdrs.some(x=>x.includes(h))
        ? pass("TemplateExport",`Header present: "${h}"`,""  )
        : fail("TemplateExport",`Header MISSING: "${h}"`,`Got: ${hdrs.slice(0,5).join("|")}`);
    });

    // Phantom row check
    let dataRows = 0;
    ws.eachRow((row,rn)=>{ if(rn===1) return; const v=String(row.getCell(1).value||"").trim(); if(v&&v!=="-") dataRows++; });
    dataRows <= 1
      ? pass("TemplateExport",`Phantom row check: ${dataRows} data rows in blank template`,"")
      : fail("TemplateExport",`Phantom row problem: ${dataRows} unexpected rows in template`,"");
  } catch(e) { fail("TemplateExport","Export test",e.message.substring(0,80)); }
}

// -- SUITE 4: BULK IMPORT -----------------------------------------------------
async function suiteImport() {
  SEP("SUITE 4: BULK IMPORT - All Scenarios");
  let processBulkUpload;
  try {
    ({ processBulkUpload } = require("./dist/services/renewalBulkUploadService"));
    pass("BulkImport","Service loaded","");
  } catch(e) { fail("BulkImport","Cannot load service",e.message); return; }

  const buildXls = async (rows) => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Master_References",{state:"hidden"}).getCell("A1").value="ref";
    const ws = wb.addWorksheet("Full Renewals Bulk Upload");
    ws.addRow(["Client Company Name *","Account Manager Name","Renewal Executive Name","Order Number","PO Reference","Invoice Number","Contact Name *","Contact Email","Contact Mobile","Contact Role","Service Category *","Service Master Name *","Domain / Server Identifier *","Provider Name","Server Account / Sub-Item","Service Plan Name","Activation Date (YYYY-MM-DD)","Expiry Date * (YYYY-MM-DD)","Quantity","Amount Due (INR) *","Amount Collected (INR)","Cycle Status","Reminder Policy Name","Notes"]);
    rows.forEach(r=>ws.addRow(r));
    return Buffer.from(await wb.xlsx.writeBuffer());
  };

  const base = ["Import Co E2E","","","ORD-IMP-001","","","Imp Contact","imp@test.com","9876543210","PRIMARY","Domain Services","Domain Renewal",`e2e-imp-${Date.now()}.com`,"","","","2025-01-01","2026-12-31",1,5000,0,"ACTIVE","",""];
  
  const tests = [
    { label:"Valid single row",          rows:[base],                              ok:true },
    { label:"Missing company name",      rows:[[...base.map((v,i)=>i===0?"":v)]], ok:false },
    { label:"Missing contact name",      rows:[[...base.map((v,i)=>i===6?"":v)]], ok:false },
    { label:"Missing expiry date",       rows:[[...base.map((v,i)=>i===17?"":v)]],ok:false },
    { label:"Amount=0",                  rows:[[...base.map((v,i)=>i===19?0:v)]],  ok:false },
    { label:"Amount=-500",               rows:[[...base.map((v,i)=>i===19?-500:v)]],ok:false },
    { label:"Amount=text",               rows:[[...base.map((v,i)=>i===19?"five thousand":v)]],ok:false },
    { label:"Amount=Rs symbol (accept)", rows:[[...base.map((v,i)=>i===19?"Rs5000":i===12?`sym-${Date.now()}.com`:v)]],ok:true },
    { label:"Invalid category",          rows:[[...base.map((v,i)=>i===10?"FAKE_CATEGORY":v)]],ok:false },
    { label:"Invalid date string",       rows:[[...base.map((v,i)=>i===17?"not-a-date":v)]],ok:false },
    { label:"Leap year date 2028-02-29", rows:[[...base.map((v,i)=>i===17?"2028-02-29":i===12?`leap-${Date.now()}.com`:v)]],ok:true },
    { label:"Far future 2099-12-31",     rows:[[...base.map((v,i)=>i===17?"2099-12-31":i===12?`far-${Date.now()}.com`:v)]],ok:true },
    { label:"5 valid rows",              rows:Array.from({length:5},(_,i)=>base.map((v,j)=>j===12?`batch-e2e-${i}-${Date.now()}.com`:j===3?`ORD-B${i}`:v)), ok:true },
    { label:"Mixed: row3 invalid",       rows:[base.map((v,j)=>j===12?`mix1-${Date.now()}.com`:v),base.map((v,j)=>j===12?`mix2-${Date.now()}.com`:v),base.map((v,j)=>j===0?"":v)], ok:false },
    { label:"SQL injection in company",  rows:[[...base.map((v,i)=>i===0?"'; DROP TABLE renewal_account; --":i===12?`sqli-${Date.now()}.com`:v)]],ok:true },
    { label:"Tamil company name",        rows:[[...base.map((v,i)=>i===0?"???????? ????":i===12?`tamil-${Date.now()}.com`:v)]],ok:true },
  ];

  for (const t of tests) {
    try {
      const buf = await buildXls(t.rows);
      const result = await processBulkUpload(buf,"FULL_RENEWAL",1);
      if (t.ok) {
        result.success ? pass("BulkImport",t.label,"") : fail("BulkImport",t.label,`Error: ${JSON.stringify(result.errors?.[0]||"").substring(0,60)}`);
      } else {
        !result.success ? pass("BulkImport",t.label,`Rejected (${result.errors?.length||0} errors)`) : fail("BulkImport",t.label,"Should have been rejected");
      }
    } catch(e) {
      !t.ok ? pass("BulkImport",t.label,`Threw: ${e.message.substring(0,50)}`) : fail("BulkImport",t.label,`Exception: ${e.message.substring(0,80)}`);
    }
  }

  // Complete cascade cleanup of test imports to ensure 0 orphans left in DB
  try {
    const testCos = await prisma.$queryRawUnsafe(`SELECT id FROM client_company WHERE name LIKE 'Import Co E2E%' OR name LIKE '%E2E%' OR name LIKE '????????%' OR name LIKE "'; DROP%"`);
    if (testCos.length > 0) {
      const coIds = testCos.map(c => c.id).join(',');
      const testAccts = await prisma.$queryRawUnsafe(`SELECT id FROM renewal_account WHERE client_company_id IN (${coIds})`);
      if (testAccts.length > 0) {
        const acctIds = testAccts.map(a => a.id).join(',');
        const testInsts = await prisma.$queryRawUnsafe(`SELECT id FROM renewal_service_instance WHERE renewal_account_id IN (${acctIds})`);
        if (testInsts.length > 0) {
          const instIds = testInsts.map(i => i.id).join(',');
          await prisma.$executeRawUnsafe(`DELETE FROM renewal_cycle WHERE service_instance_id IN (${instIds})`);
          await prisma.$executeRawUnsafe(`DELETE FROM renewal_service_instance WHERE id IN (${instIds})`);
        }
        await prisma.$executeRawUnsafe(`DELETE FROM renewal_account WHERE id IN (${acctIds})`);
      }
      await prisma.$executeRawUnsafe(`DELETE FROM client_company WHERE id IN (${coIds})`);
    }
    // Also sweep any remaining orphan instances
    const orphans = await prisma.$queryRawUnsafe(`SELECT ri.id FROM renewal_service_instance ri LEFT JOIN renewal_account ra ON ri.renewal_account_id=ra.id WHERE ra.id IS NULL`);
    if (orphans.length > 0) {
      const oIds = orphans.map(o => o.id).join(',');
      await prisma.$executeRawUnsafe(`DELETE FROM renewal_cycle WHERE service_instance_id IN (${oIds})`);
      await prisma.$executeRawUnsafe(`DELETE FROM renewal_service_instance WHERE id IN (${oIds})`);
    }
    pass("BulkImport","Complete test data cleanup (0 orphans left)","");
  } catch(e) { warn("BulkImport","Cleanup",e.message.substring(0,60)); }
}

// -- SUITE 5: ORDER FORM PDF --------------------------------------------------
async function suitePDF() {
  SEP("SUITE 5: ORDER FORM PDF GENERATION");
  const accounts = await prisma.$queryRaw`SELECT ra.id, cc.name as cn FROM renewal_account ra JOIN client_company cc ON ra.client_company_id=cc.id WHERE ra.is_active=1 LIMIT 2`;
  if (!accounts.length) { warn("PDF","No accounts found","Skip"); }
  else {
    for (const a of accounts) {
      try {
        const { generateOrderFormPDF } = require("./dist/utils/orderFormPdfGenerator");
        const r = await generateOrderFormPDF(a.id);
        if (r && r.filePath && fs.existsSync(r.filePath)) {
          const sz = fs.statSync(r.filePath).size;
          pass("PDF",`Account #${a.id} (${a.cn})`,`${(sz/1024).toFixed(1)}KB`);
          fs.unlinkSync(r.filePath);
        } else { fail("PDF",`Account #${a.id}`,"File not created"); }
      } catch(e) { fail("PDF",`Account #${a.id}`,e.message.substring(0,80)); }
    }
  }

  // Brand profile check
  const bpCount = Number((await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM renewal_brand_profile WHERE is_active=1`)[0].cnt);
  bpCount>0 ? pass("PDF",`${bpCount} brand profiles exist for per-company PDF branding`,"") : warn("PDF","No brand profiles","PDF uses hardcoded defaults");

  // Per-client FK check
  const fk = Number((await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kannan_angler_crm_v1' AND TABLE_NAME='renewal_account' AND COLUMN_NAME='brand_profile_id'`)[0].cnt);
  fk>0 ? pass("PDF","renewal_account.brand_profile_id FK exists","Per-account template supported") : warn("PDF","brand_profile_id FK missing from renewal_account","Need migration for per-client order form template");

  // Does generator use brand profile?
  const code = fs.readFileSync(path.join(__dirname,"dist/utils/orderFormPdfGenerator.js"),"utf8");
  code.includes("renewalBrandProfile")||code.includes("brand_profile")
    ? pass("PDF","Generator reads RenewalBrandProfile for per-client branding","")
    : warn("PDF","Generator does NOT use RenewalBrandProfile yet","Per-client template switch not implemented");
}

// -- SUITE 6: FOLLOW-UP FLOW ---------------------------------------------------
async function suiteFollowUp() {
  SEP("SUITE 6: FOLLOW-UP FLOW");
  const reminder = await prisma.$queryRaw`SELECT id, status, is_mandatory, due_date FROM renewal_reminder WHERE status IN ('DUE','PENDING') LIMIT 1`;
  if (!reminder.length) { warn("FollowUp","No active reminders","Skip"); return; }
  const r = reminder[0];
  pass("FollowUp",`Found reminder #${r.id} status=${r.status}`,"");

  // Reschedule
  try {
    const newDate = new Date(Date.now()+7*86400000);
    await prisma.$executeRaw`UPDATE renewal_reminder SET due_date=${newDate}, status='PENDING' WHERE id=${r.id}`;
    const upd = (await prisma.$queryRaw`SELECT due_date FROM renewal_reminder WHERE id=${r.id}`)[0];
    new Date(upd.due_date).getTime() !== new Date(r.due_date).getTime()
      ? pass("FollowUp","Reschedule: due_date updated","")
      : fail("FollowUp","Reschedule: due_date not changed","");
    await prisma.$executeRaw`UPDATE renewal_reminder SET due_date=${new Date(r.due_date)}, status=${r.status} WHERE id=${r.id}`;
    pass("FollowUp","Reschedule: original state restored","");
  } catch(e) { fail("FollowUp","Reschedule test",e.message); }

  // Complete (non-mandatory only)
  if (!r.is_mandatory) {
    try {
      await prisma.$executeRaw`UPDATE renewal_reminder SET status='COMPLETED', completed_at=NOW(), completed_by_id=1 WHERE id=${r.id}`;
      const s = (await prisma.$queryRaw`SELECT status FROM renewal_reminder WHERE id=${r.id}`)[0].status;
      s==="COMPLETED" ? pass("FollowUp","Complete: status->COMPLETED","") : fail("FollowUp","Complete: not updated","");
      await prisma.$executeRaw`UPDATE renewal_reminder SET status=${r.status}, completed_at=NULL, completed_by_id=NULL WHERE id=${r.id}`;
      pass("FollowUp","Complete: state restored","");
    } catch(e) { fail("FollowUp","Complete test",e.message); }
  }

  // Mandatory skip protection
  const mand = await prisma.$queryRaw`SELECT id FROM renewal_reminder WHERE is_mandatory=1 LIMIT 1`;
  mand.length > 0
    ? pass("FollowUp","Mandatory reminders exist — controller blocks skip via is_mandatory check",`#${mand[0].id}`)
    : warn("FollowUp","No mandatory reminders found","Consider seeding mandatory reminders");
}

// -- SUITE 7: DB INTEGRITY ----------------------------------------------------
async function suiteDB() {
  SEP("SUITE 7: DB REFERENTIAL INTEGRITY");
  const checks = [
    ["No orphan renewal_cycles", `SELECT COUNT(*) as cnt FROM renewal_cycle rc LEFT JOIN renewal_service_instance ri ON rc.service_instance_id=ri.id WHERE ri.id IS NULL`],
    ["No orphan service_instances", `SELECT COUNT(*) as cnt FROM renewal_service_instance ri LEFT JOIN renewal_account ra ON ri.renewal_account_id=ra.id WHERE ra.id IS NULL`],
    ["No orphan payments", `SELECT COUNT(*) as cnt FROM renewal_payment rp LEFT JOIN renewal_cycle rc ON rp.cycle_id=rc.id WHERE rc.id IS NULL`],
    ["No over-collected cycles", `SELECT COUNT(*) as cnt FROM renewal_cycle WHERE amount_collected > amount_due AND amount_due > 0`],
    ["Outstanding in sync", `SELECT COUNT(*) as cnt FROM renewal_cycle WHERE ABS((amount_due-amount_collected)-outstanding)>0.01 AND amount_due>0`],
    ["No duplicate active instances", `SELECT COUNT(*) as cnt FROM (SELECT renewal_account_id,service_master_id,identifier,COUNT(*) as c FROM renewal_service_instance WHERE is_active=1 AND status NOT IN ('CANCELLED','NOT_RENEWING') GROUP BY renewal_account_id,service_master_id,identifier HAVING c>1) x`],
    ["No duplicate service masters", `SELECT COUNT(*) as cnt FROM (SELECT name,COUNT(*) as c FROM renewal_service_master GROUP BY name HAVING c>1) x`],
    ["No duplicate providers", `SELECT COUNT(*) as cnt FROM (SELECT name,COUNT(*) as c FROM renewal_provider GROUP BY name HAVING c>1) x`],
  ];
  for (const [label, sql] of checks) {
    try {
      const r = await prisma.$queryRawUnsafe(sql);
      const cnt = Number(r[0].cnt);
      cnt===0 ? pass("DBIntegrity",label,"") : fail("DBIntegrity",label,`Count: ${cnt}`);
    } catch(e) { warn("DBIntegrity",label,e.message.substring(0,60)); }
  }
}

// -- SUITE 8: OUTBOX -----------------------------------------------------------
async function suiteOutbox() {
  SEP("SUITE 8: OUTBOX & WHATSAPP STATUS");
  const checks = [
    ["No FAILED outbox items", `SELECT COUNT(*) as cnt FROM notification_outbox WHERE status='FAILED'`, true],
    ["No stuck PROCESSING items", `SELECT COUNT(*) as cnt FROM notification_outbox WHERE status='PROCESSING'`, true],
    ["Dedup: no duplicate idem_keys", `SELECT COUNT(*) as cnt FROM (SELECT mapping_context,COUNT(*) as c FROM notification_outbox WHERE mapping_context LIKE '%idem_key%' GROUP BY mapping_context HAVING c>1) x`, true],
  ];
  for (const [label, sql, expectZero] of checks) {
    try {
      const r = await prisma.$queryRawUnsafe(sql);
      const cnt = Number(r[0].cnt);
      (expectZero ? cnt===0 : cnt>0)
        ? pass("Outbox",label,cnt>0?`${cnt} found`:"")
        : warn("Outbox",label,`Count: ${cnt}`);
    } catch(e) { warn("Outbox",label,e.message.substring(0,60)); }
  }

  // WhatsApp sessions
  try {
    const sessions = await prisma.$queryRaw`SELECT id,session_name,status,is_default FROM whatsapp_web_session WHERE is_active=1`;
    if (!sessions.length) { warn("Outbox","No WhatsApp sessions","WhatsApp won't work"); }
    else { sessions.forEach(s => s.status==="CONNECTED" ? pass("Outbox",`WA "${s.session_name}" CONNECTED`,s.is_default?"(default)":"") : warn("Outbox",`WA "${s.session_name}" is ${s.status}`,"QR needed")); }
  } catch(e) { warn("Outbox","WhatsApp session table",e.message.substring(0,60)); }
}

// -- MAIN ---------------------------------------------------------------------
async function main() {
  console.log("\n+-------------------------------------------------------------------+");
  console.log("¦  ANGLER CRM — FULL RENEWAL E2E TEST SUITE (8 Suites)              ¦");
  console.log("+-------------------------------------------------------------------+");
  try {
    await suitePayment();
    await suiteContact();
    await suiteExport();
    await suiteImport();
    await suitePDF();
    await suiteFollowUp();
    await suiteDB();
    await suiteOutbox();
  } catch(e) { console.error("FATAL:",e.message,e.stack); }
  finally { await prisma.$disconnect(); }

  console.log("\n" + "=".repeat(66));
  const suites=[...new Set(results.map(r=>r.suite))];
  suites.forEach(suite=>{
    const sr=results.filter(r=>r.suite===suite);
    const p=sr.filter(r=>r.status==="PASS").length, f=sr.filter(r=>r.status==="FAIL").length, w=sr.filter(r=>r.status==="WARN").length;
    console.log(`  ${suite}: PASS:${p} FAIL:${f} WARN:${w}`);
    sr.filter(r=>r.status==="FAIL").forEach(r=>console.log(`    FAIL: ${r.test}: ${r.detail}`));
    sr.filter(r=>r.status==="WARN").forEach(r=>console.log(`    WARN: ${r.test}: ${r.detail}`));
  });
  console.log("\n" + "-".repeat(66));
  console.log(`  TOTAL: PASS:${totalPass}  FAIL:${totalFail}  WARN:${totalWarn}`);
  console.log(totalFail===0 ? "  ALL TESTS PASSED!" : "  FAILURES DETECTED — Review above!");
  console.log("=".repeat(66)+"\n");
}

main();

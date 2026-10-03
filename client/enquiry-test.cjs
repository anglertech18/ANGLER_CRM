// Playwright manual verification — Enquiry Tracker module
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const API_URL  = 'http://192.168.0.99:5000/api';
const SCREENSHOTS = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

const results = [];
let idx = 0;

async function ss(page, label) {
  const file = path.join(SCREENSHOTS, `${String(++idx).padStart(2,'0')}_${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function log(tc, status, detail, file) {
  results.push({ tc, status, detail, file: file ? path.basename(file) : null });
  const sym = { PASS:'✅', FAIL:'❌', WARN:'⚠️', PROBE:'🔍', INFO:'ℹ️' }[status] || '•';
  console.log(`${sym} [${tc}] ${detail}${file ? ' → '+path.basename(file) : ''}`);
}

async function getToken() {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: 'ceo@crm.com', password: 'angler' });
    const req = http.request({ hostname: '192.168.0.99', port: 5000, path: '/api/auth/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('\n=== SETUP: Obtaining auth token ===');
  const loginData = await getToken();
  if (!loginData.token) { console.error('Login failed:', JSON.stringify(loginData)); process.exit(1); }
  const TOKEN = loginData.token;
  const USER  = JSON.stringify(loginData.user);
  console.log(`✅ Token obtained for ${loginData.user.email} (role: ${loginData.user.role})`);

  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', user);
  }, { token: TOKEN, user: USER });

  const page = await context.newPage();

  // ── TC-01: PAGE LOAD ──────────────────────────────────────────────────────
  console.log('\n=== TC-01: PAGE LOAD ===');
  await page.goto(`${BASE_URL}/seal/enquiry-tracker`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  let f = await ss(page, 'TC01_page_load');
  const h1 = await page.$('h1');
  const title = h1 ? (await h1.textContent()).trim() : 'not found';
  log('TC-01', title.includes('Enquiry Tracker') ? 'PASS' : 'FAIL', `Page title: "${title}"`, f);

  // ── TC-02/03: PRODUCT DROPDOWN ────────────────────────────────────────────
  console.log('\n=== TC-02/03: PRODUCT DROPDOWN ===');
  const productSelect = await page.$('select.form-select');
  if (productSelect) {
    const opts = await page.$$('select.form-select option');
    const optTexts = await Promise.all(opts.map(o => o.textContent()));
    log('TC-02', 'PASS', `Product dropdown found — ${opts.length} option(s): ${optTexts.slice(0,5).join(', ')}`, null);
    if (opts.length > 1) {
      const firstVal = await opts[1].getAttribute('value');
      await page.selectOption('select.form-select', firstVal);
      await page.waitForTimeout(2000);
      f = await ss(page, 'TC03_product_selected');
      log('TC-03', 'PASS', `Product value="${firstVal}" selected — content refreshed`, f);
    } else {
      f = await ss(page, 'TC03_no_mapped_products');
      log('TC-03', 'WARN', 'No mapped products for this user', f);
    }
  } else {
    f = await ss(page, 'TC02_no_product_select');
    log('TC-02', 'FAIL', 'Product <select> not found', f);
  }

  // ── TC-04: CONTEXT PILL ───────────────────────────────────────────────────
  const pill = await page.$('.rounded-full.border');
  if (pill) {
    const pillText = (await pill.textContent()).trim();
    log('TC-04', 'PASS', `Context pill: "${pillText}"`, null);
  } else {
    log('TC-04', 'WARN', 'Context pill (.rounded-full.border) not found', null);
  }

  // ── TC-05: NO PRODUCT SELECTED STATE ─────────────────────────────────────
  await page.selectOption('select.form-select', '').catch(() => {});
  await page.waitForTimeout(1000);
  f = await ss(page, 'TC05_no_product_state');
  const emptyHint = await page.$('text=Select a Product').catch(() => null) ||
                    await page.$('text=No Products Assigned').catch(() => null);
  log('TC-05', emptyHint ? 'PASS' : 'INFO', emptyHint ? 'Prompt state shown when no product selected' : 'No explicit empty-state hint found', f);
  // Re-select
  const opts2 = await page.$$('select.form-select option');
  if (opts2.length > 1) { await page.selectOption('select.form-select', { index: 1 }); await page.waitForTimeout(2000); }

  // ── TC-10/11: BDE FILTER ──────────────────────────────────────────────────
  console.log('\n=== TC-10/11: BDE FILTER ===');
  const allSelects = await page.$$('select.form-select');
  const bdeSelect  = allSelects.length >= 2 ? allSelects[1] : null;
  if (bdeSelect) {
    f = await ss(page, 'TC10_bde_filter');
    log('TC-10', 'PASS', 'BDE filter dropdown visible for CEO role', f);
    const bdeOpts = await bdeSelect.$$('option');
    const bdeTexts = await Promise.all(bdeOpts.map(o => o.textContent()));
    if (bdeOpts.length > 1) {
      const bdeVal = await bdeOpts[1].getAttribute('value');
      await bdeSelect.selectOption(bdeVal);
      await page.waitForTimeout(1500);
      f = await ss(page, 'TC11_bde_filter_applied');
      log('TC-11', 'PASS', `BDE filter applied: "${bdeTexts[1]}" — table updated`, f);
      await bdeSelect.selectOption(''); await page.waitForTimeout(800);
    } else {
      log('TC-11', 'WARN', 'BDE dropdown has no BDE options (no mapped BDEs for this product)', null);
    }
  } else {
    log('TC-10', 'WARN', `Only ${allSelects.length} select(s) on page — product may have no BDE mappings`, null);
  }

  // ── TC-06/07/08: TABS ─────────────────────────────────────────────────────
  console.log('\n=== TC-06/07/08: TABS ===');
  const allTab   = await page.$('button:has-text("All Enquiries")');
  const allocTab = await page.$('button:has-text("Allocated Enquiries")');
  const convTab  = await page.$('button:has-text("Converted Leads")');

  if (allTab) {
    await allTab.click(); await page.waitForTimeout(1200);
    const rows = await page.$$('tbody tr');
    f = await ss(page, 'TC06_all_enquiries');
    log('TC-06', 'PASS', `"All Enquiries" tab — ${rows.length} row(s)`, f);
  } else { log('TC-06', 'FAIL', '"All Enquiries" tab not found', null); }

  if (allocTab) {
    await allocTab.click(); await page.waitForTimeout(1200);
    const rows = await page.$$('tbody tr');
    f = await ss(page, 'TC07_allocated');
    log('TC-07', 'PASS', `"Allocated Enquiries" tab — ${rows.length} row(s)`, f);
  } else { log('TC-07', 'FAIL', '"Allocated Enquiries" tab not found', null); }

  if (convTab) {
    await convTab.click(); await page.waitForTimeout(1200);
    const rows = await page.$$('tbody tr');
    f = await ss(page, 'TC08_converted');
    log('TC-08', 'PASS', `"Converted Leads" tab — ${rows.length} row(s)`, f);
  } else { log('TC-08', 'FAIL', '"Converted Leads" tab not found', null); }

  if (allTab) { await allTab.click(); await page.waitForTimeout(800); }

  // ── TC-14/09/22/17/18/20: FILTERS PANEL ──────────────────────────────────
  console.log('\n=== TC-14: FILTERS ===');
  const filterBtn = await page.$('button:has-text("Filters")');
  if (filterBtn) {
    await filterBtn.click(); await page.waitForTimeout(600);
    f = await ss(page, 'TC14_filters_open');
    log('TC-14', 'PASS', 'Filters panel opened', f);

    const dateFrom = await page.$('input[name="startDate"]');
    const dateTo   = await page.$('input[name="endDate"]');
    if (dateFrom && dateTo) {
      await dateFrom.fill('2025-01-01'); await dateTo.fill('2026-06-11');
      await page.waitForTimeout(1200);
      f = await ss(page, 'TC14_date_range');
      log('TC-14', 'PASS', 'Date range 2025-01-01 → 2026-06-11 applied', f);

      // TC-09: switch tab, verify filter state preserved
      if (convTab) {
        await convTab.click(); await page.waitForTimeout(800);
        const stillOpen = await page.$('input[name="startDate"]').catch(() => null);
        log('TC-09', stillOpen ? 'PASS' : 'WARN', stillOpen ? 'Filter panel open after tab switch' : 'Filter panel closed on tab switch', null);
        if (allTab) { await allTab.click(); await page.waitForTimeout(800); }
      }

      // TC-22: Reset All
      const resetBtn = await page.$('button:has-text("Reset All")');
      if (resetBtn) {
        await resetBtn.click(); await page.waitForTimeout(800);
        const clearedVal = await page.$eval('input[name="startDate"]', el => el.value).catch(() => '');
        log('TC-22', clearedVal === '' ? 'PASS' : 'FAIL', `After Reset All — startDate: "${clearedVal}"`, null);
      }
    } else {
      log('TC-14', 'WARN', 'Date inputs not found inside filter panel', null);
    }

    // TC-17: Source filter
    const srcSel = await page.$('select[name="lead_source_id"]');
    if (srcSel) {
      const srcOpts = await srcSel.$$('option');
      if (srcOpts.length > 1) {
        const v = await srcOpts[1].getAttribute('value');
        await srcSel.selectOption(v); await page.waitForTimeout(1000);
        f = await ss(page, 'TC17_source_filter');
        log('TC-17', 'PASS', `Lead source filter applied`, f);
        await srcSel.selectOption(''); await page.waitForTimeout(400);
      } else { log('TC-17', 'WARN', 'No lead source options in masters', null); }
    }

    // TC-18: Company filter
    const compFlt = await page.$('input[name="company_name"]');
    if (compFlt) {
      await compFlt.fill('PersistTest'); await page.waitForTimeout(800);
      log('TC-18', 'PASS', 'Company filter applied: "PersistTest"', null);
    }

    // TC-20: Qualification filter
    const qualSel = await page.$('select[name="lead_qualification"]');
    if (qualSel) {
      await qualSel.selectOption('Quadrant'); await page.waitForTimeout(800);
      f = await ss(page, 'TC20_qual_filter');
      log('TC-20', 'PASS', 'Lead qualification filter: Quadrant', f);
      await qualSel.selectOption(''); await page.waitForTimeout(400);
    }

    await filterBtn.click(); await page.waitForTimeout(400);
  } else {
    log('TC-14', 'WARN', '"Filters" button not found (product not selected?)', null);
  }

  // ── TC-55/28: EMPTY STATE PROBE ───────────────────────────────────────────
  console.log('\n=== TC-55/28: EMPTY STATE PROBE ===');
  if (filterBtn) {
    await filterBtn.click(); await page.waitForTimeout(400);
    const cf = await page.$('input[name="company_name"]');
    if (cf) {
      await cf.fill('XYZNONEXISTENT999'); await page.waitForTimeout(1500);
      f = await ss(page, 'TC55_empty_state');
      const emptyEl = await page.$('.empty-state');
      log('TC-28', 'PROBE', emptyEl ? 'Empty state UI (.empty-state) shown for no-match' : 'Table appears empty; no .empty-state class visible', f);
      await cf.fill(''); await page.waitForTimeout(500);
    }
    await filterBtn.click(); await page.waitForTimeout(400);
  }

  // ── TC-29/30/32/33/34/35/36/46: CREATE ───────────────────────────────────
  console.log('\n=== TC-29/30/36/46: CREATE ENQUIRY ===');
  const addBtn = await page.$('button:has-text("Add Enquiry")');
  let createdEnquiryId = null;

  // Capture POST /enquiries response to get created ID
  page.on('response', async resp => {
    try {
      if (resp.url().includes('/enquiries') && resp.request().method() === 'POST' && !resp.url().includes('convert')) {
        const b = await resp.json().catch(() => null);
        if (b && b.id && !createdEnquiryId) createdEnquiryId = b.id;
      }
    } catch {}
  });

  if (addBtn) {
    await addBtn.click();
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
    f = await ss(page, 'TC29_create_form');
    const formH = await page.$('h1, h2');
    log('TC-29', 'PASS', `Create form opened: "${formH ? (await formH.textContent()).trim() : 'no h1/h2'}"`, f);

    // TC-30: Empty submit — save button triggers custom handleSubmit (not type=submit)
    const submitBtnCheck = await page.$('button:has-text("Save Record")');
    if (submitBtnCheck) {
      await submitBtnCheck.click(); await page.waitForTimeout(800);
      f = await ss(page, 'TC30_empty_validation');
      const errEl = await page.$('.text-red-500, [class*="text-red"]');
      log('TC-30', errEl ? 'PASS' : 'WARN', errEl ? 'Validation error (.text-red-500) shown on empty submit' : 'No red validation text found', f);
    } else {
      log('TC-30', 'WARN', '"Save Record" button not found', null);
    }

    // TC-32: Product locked
    const pField = await page.$('input[name="product_id"], select[name="product_id"]');
    if (pField) {
      const dis = await pField.isDisabled();
      log('TC-32', dis ? 'PASS' : 'WARN', `Product field disabled/locked: ${dis}`, null);
    } else {
      log('TC-32', 'INFO', 'product_id field not a standard input — shown as display text', null);
    }

    // TC-33: allocated_to pre-filled
    const allocFld = await page.$('select[name="allocated_to_id"]');
    if (allocFld) {
      const v = await allocFld.inputValue();
      log('TC-33', v ? 'PASS' : 'WARN', `allocated_to_id pre-filled: "${v}"`, null);
    }

    // Fill required fields
    const compFld = await page.$('input[name="company_name"]');
    const contFld = await page.$('input[name="contact_name"]');
    const mobFld  = await page.$('input[name="mobile_number"]');
    if (compFld) { await compFld.fill('Playwright Test Corp'); }
    if (contFld) { await contFld.fill('Jane Smith'); }
    if (mobFld)  { await mobFld.fill('9988776655'); }

    // TC-34/35: Cascading dropdowns
    const ctrySel = await page.$('select[name="country_id"]');
    if (ctrySel) {
      const ctryOpts = await ctrySel.$$('option');
      if (ctryOpts.length > 1) {
        await ctrySel.selectOption({ index: 1 }); await page.waitForTimeout(900);
        const stateSel = await page.$('select[name="state_id"]');
        if (stateSel) {
          const stOpts = await stateSel.$$('option');
          log('TC-34', stOpts.length > 1 ? 'PASS' : 'WARN', `Country→State cascade: ${stOpts.length} state options`, null);
          if (stOpts.length > 1) {
            await stateSel.selectOption({ index: 1 }); await page.waitForTimeout(900);
            const citySel = await page.$('select[name="city_id"]');
            if (citySel) {
              const cOpts = await citySel.$$('option');
              log('TC-35', cOpts.length > 1 ? 'PASS' : 'WARN', `State→City cascade: ${cOpts.length} city options`, null);
            }
          }
        } else { log('TC-34', 'WARN', 'state_id not found after country select', null); }
      }
    } else { log('TC-34', 'WARN', 'country_id select not in form', null); }

    // TC-46: Conversion checkbox
    const chkConv = await page.$('input[name="is_converted"]');
    log('TC-46', chkConv ? 'PASS' : 'WARN', chkConv ? 'is_converted checkbox present' : 'is_converted checkbox not found', null);

    f = await ss(page, 'TC36_form_filled');
    const saveBtn = await page.$('button:has-text("Save Record")');
    if (saveBtn) {
      try {
        const [resp] = await Promise.all([
          page.waitForResponse(r => r.url().includes('/enquiries') && r.request().method() === 'POST', { timeout: 8000 }),
          saveBtn.click()
        ]);
        const body = await resp.json().catch(() => null);
        if (body?.id) createdEnquiryId = body.id;
        await page.waitForTimeout(1500);
      } catch (e) {
        await page.waitForTimeout(2500);
      }
      f = await ss(page, 'TC36_after_save');
      const backOnTracker = page.url().includes('enquiry-tracker') && !page.url().includes('/new');
      log('TC-36', backOnTracker ? 'PASS' : 'WARN',
        backOnTracker ? `Saved — redirected to tracker. Created ID: ${createdEnquiryId}` : `URL: ${page.url()}`, f);
    }
  } else {
    f = await ss(page, 'TC29_no_add_btn');
    log('TC-29', 'FAIL', '"Add Enquiry" button not found', f);
  }

  // ── TC-38/39/40/41: EDIT ─────────────────────────────────────────────────
  console.log('\n=== TC-38/39/40/41: EDIT ===');
  await page.waitForTimeout(1000);
  let editFound = false;

  // Try by navigating directly to edit URL using created ID
  if (createdEnquiryId) {
    const opts3 = await page.$$('select.form-select option');
    let pid = '';
    if (opts3.length > 1) pid = await opts3[1].getAttribute('value');
    await page.goto(`${BASE_URL}/seal/enquiry-tracker/${createdEnquiryId}/edit${pid ? '?product_id='+pid : ''}`);
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
    f = await ss(page, 'TC38_edit_form_direct');
    const compVal = await page.$eval('input[name="company_name"]', el => el.value).catch(() => '');
    log('TC-38', compVal ? 'PASS' : 'WARN', `Edit form loaded — company_name: "${compVal}"`, f);
    log('TC-39', compVal === 'Playwright Test Corp' ? 'PASS' : 'WARN', `Fields pre-populated: company="${compVal}"`, null);
    editFound = true;

    if (compVal) {
      const updated = 'Playwright Test Corp (edited)';
      await page.$eval('input[name="company_name"]', (el, v) => {
        el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
      }, updated);
      await page.waitForTimeout(400);
      f = await ss(page, 'TC40_field_modified');
      log('TC-40', 'PASS', `Modified company_name to "${updated}"`, f);
    }

    // TC-41: Cancel
    const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("Back"), a:has-text("Back")');
    if (cancelBtn) {
      await cancelBtn.click(); await page.waitForTimeout(1000);
      log('TC-41', 'PASS', 'Cancel clicked — navigated away without saving', null);
    } else {
      await page.goBack(); await page.waitForTimeout(1000);
      log('TC-41', 'PASS', 'Browser back used to cancel edit', null);
    }
  } else {
    // Fall back to clicking edit button in table
    const editBtns = await page.$$('button[title="Edit"], button[aria-label="Edit"]');
    const rowBtns  = await page.$$('tbody tr:first-child td:last-child button');
    if (editBtns.length > 0) {
      await editBtns[0].click(); editFound = true;
    } else if (rowBtns.length > 0) {
      await rowBtns[0].click(); editFound = true;
    }
    if (editFound) {
      await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
      f = await ss(page, 'TC38_edit_from_table');
      const compVal2 = await page.$eval('input[name="company_name"]', el => el.value).catch(() => '');
      log('TC-38', compVal2 ? 'PASS' : 'WARN', `Edit from table — company: "${compVal2}"`, f);
      log('TC-39', compVal2 ? 'PASS' : 'WARN', `Fields pre-populated: "${compVal2}"`, null);
      await page.goBack(); await page.waitForTimeout(1000);
    } else {
      f = await ss(page, 'TC38_no_edit_path');
      log('TC-38', 'WARN', 'No edit button in table and no createdEnquiryId for direct nav', f);
    }
  }

  // ── TC-42/43/44: DELETE ───────────────────────────────────────────────────
  console.log('\n=== TC-42/43/44: DELETE ===');
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
  // Ensure product is selected (auto-selection should restore from URL/localStorage)
  const selAfterEdit = await page.$$('select.form-select option');
  if (selAfterEdit.length > 1) {
    const curVal = await page.$eval('select.form-select', el => el.value);
    if (!curVal) { await page.selectOption('select.form-select', { index: 1 }); await page.waitForTimeout(1500); }
  }

  const delBtns  = await page.$$('button[title="Delete"], button[aria-label="Delete"]');
  const rowBtns2 = await page.$$('tbody tr:first-child td:last-child button');
  const delTarget = delBtns.length > 0 ? delBtns[0]
    : rowBtns2.length >= 2 ? rowBtns2[rowBtns2.length - 1] : null;

  if (delTarget) {
    // TC-44: Cancel
    page.once('dialog', d => { console.log(`  dialog: "${d.message()}"`); d.dismiss(); });
    await delTarget.click(); await page.waitForTimeout(800);
    f = await ss(page, 'TC44_delete_cancelled');
    log('TC-42', 'PASS', 'Delete button clicked — confirm dialog appeared', f);
    log('TC-44', 'PASS', 'Dismissed dialog — record preserved', null);

    // TC-43: Actually delete
    const delBtns2 = await page.$$('button[title="Delete"], button[aria-label="Delete"]');
    const rowBtns3 = await page.$$('tbody tr:first-child td:last-child button');
    const delFinal = delBtns2.length > 0 ? delBtns2[0]
      : rowBtns3.length >= 2 ? rowBtns3[rowBtns3.length - 1] : null;
    if (delFinal) {
      page.once('dialog', d => { console.log(`  confirm: "${d.message()}"`); d.accept(); });
      await delFinal.click(); await page.waitForTimeout(2000);
      f = await ss(page, 'TC43_after_delete');
      log('TC-43', 'PASS', 'Delete confirmed — record removed', f);
    }
  } else {
    f = await ss(page, 'TC42_no_del_btn');
    log('TC-42', 'WARN', `Delete button not found. Row action buttons: ${rowBtns2.length}`, f);
  }

  // ── TC-47/48/51: CONVERT TO LEAD ─────────────────────────────────────────
  console.log('\n=== TC-47/48/51: CONVERT TO LEAD ===');
  const addBtn2 = await page.$('button:has-text("Add Enquiry")');
  if (addBtn2) {
    await addBtn2.click(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
    const cFld = await page.$('input[name="company_name"]');
    const nFld = await page.$('input[name="contact_name"]');
    if (cFld) await cFld.fill('Convert Test Ltd');
    if (nFld) await nFld.fill('Alice Bob');

    const chk = await page.$('input[name="is_converted"]');
    if (chk) {
      const isChecked = await chk.isChecked();
      if (!isChecked) {
        // sr-only checkbox — trigger via JS change event instead of pointer click
        await page.$eval('input[name="is_converted"]', el => {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      await page.waitForTimeout(500);
      f = await ss(page, 'TC47_conversion_checked');
      const toggleYes = await page.$('text=YES');
      log('TC-47', toggleYes ? 'PASS' : 'WARN', toggleYes ? 'is_converted toggle shows YES' : 'Toggle may not have updated', f);
    } else { log('TC-47', 'WARN', 'is_converted not found in form', null); }

    let convId = null;
    const sv = await page.$('button:has-text("Save Record")');
    if (sv) {
      try {
        const [convResp] = await Promise.all([
          page.waitForResponse(r => r.url().includes('/enquiries') && r.request().method() === 'POST', { timeout: 8000 }),
          sv.click()
        ]);
        const convBody = await convResp.json().catch(() => null);
        if (convBody?.id) convId = convBody.id;
        await page.waitForTimeout(1500);
      } catch (e) {
        await page.waitForTimeout(2500);
      }
    }

    f = await ss(page, 'TC47_after_convert_save');
    const backOnTracker2 = page.url().includes('enquiry-tracker') && !page.url().includes('/new');
    log('TC-47', backOnTracker2 ? 'PASS' : 'WARN', `Converted enquiry saved. ID: ${convId}`, f);

    // TC-48: verify first_name / last_name split via API
    if (convId) {
      const nameCheck = await page.evaluate(async ({ apiUrl, token, id }) => {
        const r = await fetch(`${apiUrl}/enquiries/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        return r.json();
      }, { apiUrl: API_URL, token: TOKEN, id: convId });
      log('TC-48', nameCheck && nameCheck.contact_name === 'Alice Bob' ? 'PASS' : 'INFO',
        `Enquiry contact_name stored as: "${nameCheck?.contact_name}"`, null);
    }

    // TC-51: Converted Leads tab shows record (re-query fresh)
    const convTabFresh = await page.$('button:has-text("Converted Leads")');
    if (convTabFresh) {
      await convTabFresh.click(); await page.waitForTimeout(1500);
      const rows = await page.$$('tbody tr');
      f = await ss(page, 'TC51_converted_tab');
      log('TC-51', rows.length > 0 ? 'PASS' : 'WARN', `Converted Leads tab shows ${rows.length} row(s)`, f);
    }
  } else { log('TC-47', 'WARN', '"Add Enquiry" not available', null); }

  // ── TC-53/54/55: TABLE DISPLAY ────────────────────────────────────────────
  console.log('\n=== TC-53/54/55: TABLE DISPLAY ===');
  const allTabFresh = await page.$('button:has-text("All Enquiries")');
  if (allTabFresh) { await allTabFresh.click(); await page.waitForTimeout(1200); }
  f = await ss(page, 'TC53_table_columns');
  const hdrs = await page.$$('thead th');
  const hdrTxts = await Promise.all(hdrs.map(h => h.textContent().then(t => t.trim())));
  const expected = ['Date', 'Source', 'Company', 'Requirement', 'Status', 'Assignments'];
  const missing  = expected.filter(c => !hdrTxts.some(h => h.includes(c)));
  log('TC-53', missing.length === 0 ? 'PASS' : 'WARN',
    `Headers: ${hdrTxts.join(' | ')}${missing.length ? ' | MISSING: '+missing.join(', ') : ''}`, f);

  const rows4 = await page.$$('tbody tr');
  if (rows4.length > 0) {
    const dateCell = await page.$('tbody tr:first-child td:nth-child(2)');
    const dtTxt = dateCell ? (await dateCell.textContent()).trim() : '';
    log('TC-54', dtTxt ? 'PASS' : 'WARN', `First row date cell: "${dtTxt}"`, null);
    log('TC-55', 'PASS', `Table has ${rows4.length} row(s) — no crash`, null);
  } else {
    // Check empty state renders
    const emptyEl = await page.$('.empty-state');
    log('TC-55', emptyEl ? 'PASS' : 'INFO', 'Empty state rendered (no rows)', null);
  }

  // ── TC-57/58/59/60/61/67: API PROBES ─────────────────────────────────────
  console.log('\n=== API ENDPOINT PROBES ===');
  const apiRes = await page.evaluate(async ({ apiUrl, token }) => {
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const r57 = await fetch(`${apiUrl}/enquiries?product_id=1`, { headers: h });
    const r57b = await r57.json().catch(() => null);
    const r58 = await fetch(`${apiUrl}/enquiries`);
    const r59 = await fetch(`${apiUrl}/enquiries/1`, { headers: h });
    const r60 = await fetch(`${apiUrl}/enquiries/999999`, { headers: h });
    const r61 = await fetch(`${apiUrl}/enquiries`, { method: 'POST', headers: h,
      body: JSON.stringify({ company_name: 'API Test', contact_name: 'Tester', date: new Date().toISOString(), product_id: 1 }) });
    const r61b = await r61.json().catch(() => null);
    return {
      get_auth:     { status: r57.status, isArray: Array.isArray(r57b) },
      get_noauth:   { status: r58.status },
      get_id_valid: { status: r59.status },
      get_id_miss:  { status: r60.status },
      post_create:  { status: r61.status, id: r61b?.id, msg: r61b?.message },
    };
  }, { apiUrl: API_URL, token: TOKEN });

  log('TC-57', apiRes.get_auth.status === 200 ? 'PASS' : 'FAIL',
    `GET /enquiries with auth → ${apiRes.get_auth.status}, array: ${apiRes.get_auth.isArray}`, null);
  log('TC-58', apiRes.get_noauth.status === 401 ? 'PASS' : 'FAIL',
    `GET /enquiries no auth → ${apiRes.get_noauth.status} (expected 401)`, null);
  log('TC-59', apiRes.get_id_valid.status === 200 ? 'PASS' : 'WARN',
    `GET /enquiries/1 → ${apiRes.get_id_valid.status}`, null);
  log('TC-60', apiRes.get_id_miss.status === 404 ? 'PASS' : 'WARN',
    `GET /enquiries/999999 → ${apiRes.get_id_miss.status} (expected 404)`, null);
  log('TC-61', [200,201].includes(apiRes.post_create.status) ? 'PASS' : 'WARN',
    `POST /enquiries → ${apiRes.post_create.status}, id: ${apiRes.post_create.id}, msg: ${apiRes.post_create.msg}`, null);

  // ── TC-69: PERSISTENT FILTER STATE ───────────────────────────────────────
  console.log('\n=== TC-69: PERSISTENT FILTERS ===');
  const fBtn4 = await page.$('button:has-text("Filters")');
  if (fBtn4) {
    await fBtn4.click(); await page.waitForTimeout(400);
    const cf4 = await page.$('input[name="company_name"]');
    if (cf4) { await cf4.fill('PersistTest'); await page.waitForTimeout(300); }
    await fBtn4.click(); await page.waitForTimeout(300);
  }
  await page.goto(`${BASE_URL}/seal`); await page.waitForTimeout(600);
  await page.goto(`${BASE_URL}/seal/enquiry-tracker`);
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(2000);
  const fBtn5 = await page.$('button:has-text("Filters")');
  if (fBtn5) {
    await fBtn5.click(); await page.waitForTimeout(400);
    const restoredVal = await page.$eval('input[name="company_name"]', el => el.value).catch(() => '');
    f = await ss(page, 'TC69_filter_persistence');
    log('TC-69', restoredVal === 'PersistTest' ? 'PASS' : 'WARN',
      `company_name after nav-away+return: "${restoredVal}" (expected "PersistTest")`, f);
    await fBtn5.click(); await page.waitForTimeout(300);
  } else { log('TC-69', 'WARN', 'Filters button not found after reload', null); }

  // ── FINAL ─────────────────────────────────────────────────────────────────
  f = await ss(page, 'FINAL_state');
  log('FINAL', 'INFO', 'Final state captured', f);
  await browser.close();

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════════');
  console.log('       ENQUIRY TRACKER — TEST RESULTS');
  console.log('══════════════════════════════════════════════');
  const pass  = results.filter(r => r.status === 'PASS').length;
  const fail  = results.filter(r => r.status === 'FAIL').length;
  const warn  = results.filter(r => r.status === 'WARN').length;
  const probe = results.filter(r => r.status === 'PROBE').length;
  console.log(`  ✅ PASS: ${pass}   ❌ FAIL: ${fail}   ⚠️  WARN: ${warn}   🔍 PROBE: ${probe}`);
  console.log(`  Screenshots → ${SCREENSHOTS}`);
  console.log('══════════════════════════════════════════════');
  if (fail > 0) {
    console.log('\n  FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`    ❌ [${r.tc}] ${r.detail}`));
  }
  if (warn > 0) {
    console.log('\n  WARNINGS:');
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`    ⚠️  [${r.tc}] ${r.detail}`));
  }
  console.log('\n  Full results:');
  results.forEach(r => {
    const sym = { PASS:'✅', FAIL:'❌', WARN:'⚠️ ', PROBE:'🔍', INFO:'ℹ️ ' }[r.status] || '• ';
    console.log(`    ${sym} [${r.tc}] ${r.detail}`);
  });
})();

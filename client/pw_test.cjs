const { chromium } = require('playwright');
const os = require('os'); const path = require('path');
const T = os.tmpdir(); const shots = [];
const ss = async (pg, n) => { const p = path.join(T, n); await pg.screenshot({ path: p, fullPage: true }); shots.push(p); };

(async () => {
  const br = await chromium.launch({ headless: false, slowMo: 250 });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 900 } });
  const pg = await ctx.newPage();

  // LOGIN
  await pg.goto('http://localhost:5173');
  await pg.waitForLoadState('networkidle');
  const emailSel = 'input[type=email], input[name=email]';
  const passSel  = 'input[type=password], input[name=password]';
  await pg.locator(emailSel).fill('boopathi.r@angleritech.com');
  await pg.locator(passSel).fill('angler');
  await pg.locator('button[type=submit]').click();
  await pg.waitForTimeout(3000);
  console.log('LOGIN_OK url=' + pg.url());

  await pg.goto('http://localhost:5173/reports/products');
  await pg.waitForLoadState('networkidle');
  await pg.waitForTimeout(2500);
  await ss(pg, '01_loaded.png');
  console.log('REPORT_LOADED');

  // FILTER ORDER
  const cB = await pg.locator('input[placeholder="Company name…"]').boundingBox();
  const pB = await pg.locator('button').filter({ hasText: 'All Products' }).boundingBox();
  const uB = await pg.locator('button').filter({ hasText: 'All Users' }).boundingBox();
  const qB = await pg.locator('button').filter({ hasText: 'All Quadrants' }).boundingBox();
  const dc = await pg.locator('input[type=date]').count();
  console.log('FILTER_X c=' + Math.round(cB ? cB.x : 0) + ' p=' + Math.round(pB ? pB.x : 0) + ' u=' + Math.round(uB ? uB.x : 0) + ' q=' + Math.round(qB ? qB.x : 0) + ' dates=' + dc);
  const orderOK = cB && pB && uB && qB && cB.x < pB.x && pB.x < uB.x && uB.x < qB.x;
  console.log('ORDER_OK=' + orderOK);
  const stgCount = await pg.locator('text=Sales Stage').count();
  console.log('STAGE_ABSENT=' + (stgCount === 0));

  // USERS DROPDOWN
  await pg.locator('button').filter({ hasText: 'All Users' }).click();
  await pg.waitForTimeout(500);
  const cbCount = await pg.locator('input[type=checkbox]').count();
  console.log('USERS_CB_COUNT=' + cbCount);
  await ss(pg, '02_users_dd.png');
  await pg.keyboard.press('Escape');
  await pg.mouse.click(200, 200);
  await pg.waitForTimeout(400);

  // EDIT/VIEW BUTTONS
  const rows  = await pg.locator('tbody tr').count();
  const edits = await pg.locator('button[title="Edit Lead"]').count();
  const views = await pg.locator('button[title="View Lead"]').count();
  console.log('ROWS=' + rows + ' EDITS=' + edits + ' VIEWS=' + views);
  await ss(pg, '03_table.png');

  // APPLY QUADRANT FILTER
  await pg.locator('button').filter({ hasText: 'All Quadrants' }).click();
  await pg.waitForTimeout(300);
  const firstCb = pg.locator('input[type=checkbox]').first();
  await firstCb.click();
  await pg.mouse.click(200, 200);
  await pg.waitForTimeout(1500);
  const fUrl   = pg.url();
  const fRows  = await pg.locator('tbody tr').count();
  const fParam = fUrl.indexOf('?') >= 0 ? fUrl.split('?')[1] : 'NONE';
  console.log('FILTER_URL_PARAM=' + fParam);
  console.log('FILTERED_ROWS=' + fRows);
  await ss(pg, '04_filtered.png');

  // NAVIGATE TO LEAD DETAIL
  const viewBtn = pg.locator('button[title="View Lead"]').first();
  await viewBtn.click();
  await pg.waitForTimeout(3000);
  console.log('DETAIL_URL=' + pg.url());
  await ss(pg, '05_detail.png');

  // BACK
  await pg.goBack();
  await pg.waitForLoadState('networkidle');
  await pg.waitForTimeout(1500);
  const bUrl   = pg.url();
  const bRows  = await pg.locator('tbody tr').count();
  const bParam = bUrl.indexOf('?') >= 0 ? bUrl.split('?')[1] : 'NONE';
  console.log('BACK_PARAMS=' + bParam);
  console.log('BACK_ROWS=' + bRows + ' expected=' + fRows + ' MATCH=' + (bRows === fRows));
  console.log('FILTER_PRESERVED=' + bUrl.includes('quadrants'));
  await ss(pg, '06_back.png');

  // PROBE: EDIT OWN LEAD
  const eb = pg.locator('button[title="Edit Lead"]').first();
  if (await eb.count() > 0) {
    await eb.click();
    await pg.waitForTimeout(2000);
    console.log('EDIT_NAV=' + pg.url());
    await ss(pg, '07_edit_page.png');
    await pg.goBack();
  } else {
    console.log('EDIT_BTN=NONE (manager sees no own leads on page)');
  }

  console.log('SHOTS=' + shots.join('|'));
  await br.close();
})().catch(e => { console.error('ERR:' + e.message); process.exit(1); });
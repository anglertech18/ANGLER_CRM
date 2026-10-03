import { PrismaClient } from './v2-client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

// ─── Lookup data ─────────────────────────────────────────────────────────────
const PREFIXES = ['Sri','Shree','Jai','Om','Sai','Patel','Shah','Mehta','Gupta','Sharma','Reddy','Naidu','Pillai','Raj','Vel','Karthik','Vijay','Ravi','Suresh','Ramesh','Global','National','United','Pioneer','Premier','Elite','Prime','Apex','Summit','Crown','Techno','Micro','Smart','Digital','Cyber','Info','Data','Cloud','Green','Gold','NovaTech','AlphaBit','ByteCore','TechVista','InfoEdge','DataLink','NetAxis','WebSpark','CodeForce','LogiSys','SoftMatrix','TechBridge','DigiPath','NetStar','CloudBase','Amrut','Anand','Arun','Ashok','Balaji','Bala','Chandra','Dinesh','Gopal','Harish','Kamal','Kiran','Mani','Mohan','Murali','Naresh','Selvam','Murugan'];
const SUFFIXES = ['Technologies','Solutions','Systems','Software','Pvt Ltd','Ltd','Enterprises','Industries','Group','Holdings','Ventures','Services','Consulting','Networks','Digital','Infotech','Innovations','Analytics','Media','Communications','Logistics','Trading','Exports','Manufacturing','Engineering','Healthcare','Finance','Retail','Labs','Dynamics','Partners','Associates','Agency','Works','Corp','Global'];
const CITIES = ['Chennai','Mumbai','Delhi','Bangalore','Hyderabad','Kolkata','Pune','Ahmedabad','Coimbatore','Madurai','Trichy','Salem','Tirunelveli','Vellore','Erode','Tirupur','Kochi','Vijayawada','Nagpur','Indore','Chandigarh','Lucknow','Surat','Jaipur'];
const FIRST_M = ['Rajesh','Suresh','Mahesh','Ramesh','Dinesh','Ganesh','Ravi','Karthik','Vijay','Arun','Ashok','Mohan','Gopal','Balaji','Harish','Naresh','Kamal','Murali','Hari','Anand','Sanjay','Deepak','Vikram','Ajay','Rohit','Manoj','Prakash','Vinod','Santosh','Sunil','Arjun','Dev','Srikanth','Venkat','Praveen','Sridhar','Selvam','Murugan','Bala','Krishnan'];
const FIRST_F = ['Priya','Kavitha','Lakshmi','Meena','Radha','Seetha','Usha','Vani','Geeta','Anitha','Padma','Kamala','Saranya','Deepa','Divya','Nithya','Revathi','Suganya','Thenmozhi','Vasantha','Aishwarya','Bhavani','Chitra','Dharani','Lavanya'];
const LAST_N = ['Kumar','Raj','Rajan','Sharma','Patel','Reddy','Naidu','Pillai','Iyer','Nair','Krishnan','Subramanian','Natarajan','Chandrasekhar','Venkatesan','Sivakumar','Murugesan','Srinivasan','Ganesan','Annamalai','Palaniappan','Durai','Selvam','Arumugam','Pandian','Sundaram','Singh','Gupta','Mehta','Joshi','Mishra','Verma','Yadav'];
const TLDS = ['.com','.in','.co.in','.net','.org','.io','.tech','.co'];
const MODES = ['Cash','NEFT','RTGS','UPI','Cheque','IMPS','Online'];
const DESIG = ['CEO','MD','Director','CTO','Manager','Owner','Partner','CFO','VP','Head - IT'];
const STATUSES = ['ACTIVE','ACTIVE','ACTIVE','DUE_SOON','DUE_SOON','EXPIRED','RENEWED','RENEWED','FOLLOW_UP','NOT_RENEWING'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function rndF(a: number, b: number) { return Math.round((Math.random() * (b - a) + a) * 100) / 100; }
function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14); }
function mkDomain(name: string, i: number) { return slug(name) + (i % 3 === 0 ? rndInt(10,99) : '') + rnd(TLDS); }
function mkPhone() { const p=['98','97','96','95','94','93','92','91','90','89','88','87','86','85']; return '+91 '+rnd(p)+rndInt(10000000,99999999); }
function mkCompany(i: number) { 
  const baseName = i%2===0 ? `${rnd(PREFIXES)} ${rnd(SUFFIXES)}` : `${rnd(PREFIXES)} ${rnd(PREFIXES)} ${rnd(SUFFIXES)}`;
  return `${baseName} ${i + 1}`; // Ensure 100% uniqueness
}
function mkPerson(g?: string) { const gen=g??(Math.random()>0.5?'M':'F'); return { first: gen==='M'?rnd(FIRST_M):rnd(FIRST_F), last: rnd(LAST_N) }; }
function render(html: string, vars: Record<string,string>) {
  let r = html;
  for (const [k,v] of Object.entries(vars)) r = r.split(`{{${k}}}`).join(v);
  return r;
}

// ─── Email templates ─────────────────────────────────────────────────────────
function makeReminderHtml() {
  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>body{font-family:Arial,sans-serif;background:#f4f7f9;margin:0;padding:0}',
    '.w{max-width:600px;margin:0 auto;background:#fff}',
    '.hd{background:linear-gradient(135deg,#1a56db,#0d3b8e);padding:36px 40px;color:#fff}',
    '.hd h1{margin:0;font-size:22px}.hd p{margin:6px 0 0;font-size:14px;opacity:.85}',
    '.bd{padding:36px 40px}',
    '.al{background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:8px;padding:16px 20px;margin-bottom:24px}',
    '.al-n{font-size:32px;font-weight:800;color:#ea580c}',
    '.al-s{font-size:12px;color:#9a3412}',
    '.dc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px}',
    '.dr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}',
    '.dr:last-child{border-bottom:none}',
    '.lb{color:#64748b}.vl{font-weight:600;color:#1e293b}',
    '.bt{display:inline-block;background:#1a56db;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;margin:8px 4px}',
    '.ft{background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0}',
    '.ft p{font-size:11px;color:#94a3b8;margin:4px 0}',
    '</style></head><body>',
    '<div class="w"><div class="hd"><h1>Renewal Reminder</h1><p>Angler CRM &bull; Renewal Management</p></div>',
    '<div class="bd">',
    '<p style="font-size:16px;font-weight:600;color:#1a202c">Dear {{customer_name}},</p>',
    '<p style="font-size:14px;color:#4a5568;line-height:1.7">Your <strong>{{service_name}}</strong> service is coming up for renewal. Please take action before the expiry date to avoid service disruption.</p>',
    '<div class="al"><div style="font-size:11px;font-weight:700;color:#c2410c;text-transform:uppercase">Days Until Renewal</div>',
    '<div class="al-n">{{days_remaining}}</div><div class="al-s">days remaining before expiry on {{expiry_date}}</div></div>',
    '<div class="dc">',
    '<div class="dr"><span class="lb">Service</span><span class="vl">{{service_name}}</span></div>',
    '<div class="dr"><span class="lb">Identifier</span><span class="vl">{{identifier}}</span></div>',
    '<div class="dr"><span class="lb">Expiry Date</span><span class="vl">{{expiry_date}}</span></div>',
    '<div class="dr"><span class="lb">Amount Due</span><span style="font-weight:700;color:#1a56db">&#8377;{{amount_due}}</span></div>',
    '<div class="dr"><span class="lb">Account Manager</span><span class="vl">{{account_manager}}</span></div>',
    '</div>',
    '<div style="text-align:center;margin:28px 0"><a href="#" class="bt">Renew Now</a></div>',
    '</div>',
    '<div class="ft"><p><strong>{{company_name}}</strong> &bull; Automated Renewal Management</p>',
    '<p>This is an automated reminder. Please do not reply to this email.</p></div>',
    '</div></body></html>',
  ].join('');
}

function makeUrgentHtml() {
  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>body{font-family:Arial,sans-serif;background:#fff5f5;margin:0;padding:0}',
    '.w{max-width:600px;margin:0 auto;background:#fff}',
    '.hd{background:linear-gradient(135deg,#dc2626,#991b1b);padding:36px 40px;color:#fff}',
    '.hd h1{margin:0;font-size:22px}.hd p{margin:6px 0 0;font-size:14px;opacity:.85}',
    '.bd{padding:36px 40px}',
    '.cd{text-align:center;background:#dc2626;color:#fff;border-radius:12px;padding:24px;margin-bottom:28px}',
    '.cd-n{font-size:64px;font-weight:900;line-height:1;display:block}',
    '.cd-l{font-size:14px;opacity:.9;letter-spacing:2px;text-transform:uppercase}',
    '.dc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px}',
    '.dr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}',
    '.dr:last-child{border-bottom:none}',
    '.bt{display:block;background:#dc2626;color:#fff;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:700;font-size:15px;text-align:center;margin:8px 0}',
    '.ft{background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0}',
    '.ft p{font-size:11px;color:#94a3b8;margin:4px 0}',
    '</style></head><body>',
    '<div class="w"><div class="hd"><h1>&#9888; Urgent Renewal Notice</h1><p>Angler CRM &bull; Renewal Management</p></div>',
    '<div class="bd">',
    '<p style="font-size:16px;font-weight:600">Dear {{customer_name}},</p>',
    '<p style="font-size:14px;color:#4a5568;line-height:1.7">Your <strong>{{service_name}}</strong> will expire in <strong style="color:#dc2626">{{days_remaining}} days</strong>. Failure to renew will result in service interruption.</p>',
    '<div class="cd"><span class="cd-n">{{days_remaining}}</span><span class="cd-l">Days Remaining</span></div>',
    '<div class="dc">',
    '<div class="dr"><span style="color:#64748b">Service</span><span style="font-weight:600">{{service_name}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Identifier</span><span style="font-weight:600">{{identifier}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Expires On</span><span style="font-weight:700;color:#dc2626">{{expiry_date}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Amount Due</span><span style="font-weight:700;color:#1a56db">&#8377;{{amount_due}}</span></div>',
    '</div>',
    '<a href="#" class="bt">Renew Immediately &#8594;</a>',
    '<p style="font-size:12px;color:#64748b;text-align:center;margin-top:16px">Contact {{account_manager}} at your earliest convenience.</p>',
    '</div>',
    '<div class="ft"><p><strong>{{company_name}}</strong> &bull; Service suspended after {{expiry_date}}.</p></div>',
    '</div></body></html>',
  ].join('');
}

function makeQuoteHtml() {
  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>body{font-family:Arial,sans-serif;background:#f4f7f9;margin:0;padding:0}',
    '.w{max-width:600px;margin:0 auto;background:#fff}',
    '.hd{background:linear-gradient(135deg,#0f766e,#065f46);padding:36px 40px;color:#fff}',
    '.hd h1{margin:0;font-size:22px}.hd p{margin:6px 0 0;font-size:14px;opacity:.85}',
    '.bd{padding:36px 40px}',
    '.qt{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}',
    '.qt th{background:#f1f5f9;padding:10px 14px;text-align:left;font-weight:700;color:#374151;border-bottom:2px solid #e2e8f0}',
    '.qt td{padding:12px 14px;border-bottom:1px solid #f1f5f9;color:#374151}',
    '.am{text-align:right;font-weight:700;color:#0f766e;font-size:15px}',
    '.tr-bg{background:#f0fdf4}.tr-bg td{font-weight:800;font-size:16px;border-bottom:none}',
    '.bt{display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px}',
    '.ft{background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0}',
    '.ft p{font-size:11px;color:#94a3b8;margin:4px 0}',
    '</style></head><body>',
    '<div class="w"><div class="hd"><h1>Renewal Quotation</h1><p>{{company_name}} &bull; Renewal Management</p></div>',
    '<div class="bd">',
    '<p style="font-size:16px;font-weight:600">Dear {{customer_name}},</p>',
    '<p style="font-size:14px;color:#4a5568;line-height:1.7">Please find below the renewal quotation for <strong>{{service_name}}</strong>. Valid for 30 days.</p>',
    '<table class="qt"><thead><tr><th>Description</th><th>Period</th><th style="text-align:right">Amount</th></tr></thead>',
    '<tbody>',
    '<tr><td>{{service_name}} Renewal</td><td>1 Year (from {{expiry_date}})</td><td class="am">&#8377;{{amount_due}}</td></tr>',
    '<tr class="tr-bg"><td colspan="2"><strong>Total Amount Due</strong></td><td class="am">&#8377;{{amount_due}}</td></tr>',
    '</tbody></table>',
    '<p style="font-size:14px;color:#4a5568">Contact <strong>{{account_manager}}</strong> to proceed with renewal.</p>',
    '<div style="text-align:center;margin:28px 0"><a href="#" class="bt">Accept Quotation</a></div>',
    '</div>',
    '<div class="ft"><p><strong>{{company_name}}</strong> &bull; System-generated quotation.</p></div>',
    '</div></body></html>',
  ].join('');
}

function makeExpiryHtml() {
  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>body{font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0}',
    '.w{max-width:600px;margin:0 auto;background:#fff}',
    '.hd{background:#1f2937;padding:36px 40px;color:#fff}',
    '.hd h1{margin:0;font-size:22px}.hd p{margin:6px 0 0;font-size:14px;color:#9ca3af}',
    '.bn{background:#1f2937;text-align:center;padding:20px}',
    '.badge{display:inline-block;background:#dc2626;color:#fff;padding:8px 24px;border-radius:24px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px}',
    '.bd{padding:36px 40px}',
    '.ib{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:24px}',
    '.dc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px}',
    '.dr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}',
    '.dr:last-child{border-bottom:none}',
    '.bt{display:inline-block;background:#1f2937;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px}',
    '.ft{background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0}',
    '.ft p{font-size:11px;color:#94a3b8;margin:4px 0}',
    '</style></head><body>',
    '<div class="w"><div class="hd"><h1>Service Expiry Notice</h1><p>{{company_name}} &bull; Renewal Management</p></div>',
    '<div class="bn"><span class="badge">Service Expired</span></div>',
    '<div class="bd">',
    '<p style="font-size:16px;font-weight:600">Dear {{customer_name}},</p>',
    '<div class="ib">',
    '<p style="font-size:14px;color:#991b1b;margin:0;font-weight:600">Important: Service Interruption</p>',
    '<p style="font-size:13px;color:#7f1d1d;margin:8px 0 0;line-height:1.6">Your <strong>{{service_name}}</strong> service expired on <strong>{{expiry_date}}</strong>. Access may be suspended. Please renew immediately.</p>',
    '</div>',
    '<div class="dc">',
    '<div class="dr"><span style="color:#64748b">Service</span><span style="font-weight:600">{{service_name}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Identifier</span><span style="font-weight:600">{{identifier}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Expired On</span><span style="font-weight:700;color:#dc2626">{{expiry_date}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Amount Due</span><span style="font-weight:700">&#8377;{{amount_due}}</span></div>',
    '</div>',
    '<p style="font-size:14px;color:#4a5568;line-height:1.7">Contact <strong>{{account_manager}}</strong> immediately to restore service.</p>',
    '<div style="text-align:center;margin:28px 0"><a href="#" class="bt">Renew Service Now</a></div>',
    '</div>',
    '<div class="ft"><p><strong>{{company_name}}</strong> &bull; Contact {{account_manager}} for assistance.</p></div>',
    '</div></body></html>',
  ].join('');
}

function makeConfirmHtml() {
  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>body{font-family:Arial,sans-serif;background:#f0fdf4;margin:0;padding:0}',
    '.w{max-width:600px;margin:0 auto;background:#fff}',
    '.hd{background:linear-gradient(135deg,#16a34a,#166534);padding:36px 40px;color:#fff}',
    '.hd h1{margin:0;font-size:22px}.hd p{margin:6px 0 0;font-size:14px;opacity:.85}',
    '.sb{text-align:center;padding:28px 40px;background:#f0fdf4}',
    '.ck{font-size:48px;display:block;margin-bottom:8px}',
    '.st{font-size:20px;font-weight:800;color:#16a34a}',
    '.bd{padding:36px 40px}',
    '.rc{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center}',
    '.rc-p{font-size:13px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:.5px}',
    '.rc-d{font-size:28px;font-weight:900;color:#16a34a}',
    '.dc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px}',
    '.dr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}',
    '.dr:last-child{border-bottom:none}',
    '.ft{background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0}',
    '.ft p{font-size:11px;color:#94a3b8;margin:4px 0}',
    '</style></head><body>',
    '<div class="w"><div class="hd"><h1>&#10003; Renewal Confirmed</h1><p>{{company_name}} &bull; Renewal Management</p></div>',
    '<div class="sb"><span class="ck">&#127881;</span><div class="st">Service Successfully Renewed!</div>',
    '<p style="color:#166534;font-size:14px;margin:8px 0 0">Your service is now active and up to date.</p></div>',
    '<div class="bd">',
    '<p style="font-size:16px;font-weight:600">Dear {{customer_name}},</p>',
    '<p style="font-size:14px;color:#4a5568;line-height:1.7">Your <strong>{{service_name}}</strong> has been successfully renewed.</p>',
    '<div class="rc"><div class="rc-p">New Expiry Date</div><div class="rc-d">{{new_expiry_date}}</div></div>',
    '<div class="dc">',
    '<div class="dr"><span style="color:#64748b">Service</span><span style="font-weight:600">{{service_name}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Identifier</span><span style="font-weight:600">{{identifier}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Previous Expiry</span><span style="font-weight:600">{{expiry_date}}</span></div>',
    '<div class="dr"><span style="color:#64748b">New Expiry</span><span style="font-weight:700;color:#16a34a">{{new_expiry_date}}</span></div>',
    '<div class="dr"><span style="color:#64748b">Amount Paid</span><span style="font-weight:700">&#8377;{{amount_due}}</span></div>',
    '</div>',
    '<p style="font-size:14px;color:#4a5568;line-height:1.7">Thank you for your continued trust. We will send you a renewal reminder 30 days before your next renewal date.</p>',
    '</div>',
    '<div class="ft"><p><strong>{{company_name}}</strong> &bull; Thank you for your business!</p>',
    '<p>For queries, contact {{account_manager}}.</p></div>',
    '</div></body></html>',
  ].join('');
}

const TMPLS = [
  { name: '30-Day Renewal Reminder',    category_code: 'GENERAL',       channel: 'EMAIL', subject: 'Action Required: Your {{service_name}} renewal is due in 30 days',     body: makeReminderHtml() },
  { name: '7-Day Urgent Renewal Notice', category_code: 'GENERAL',       channel: 'EMAIL', subject: 'URGENT: {{service_name}} expires in 7 days - Immediate action required', body: makeUrgentHtml() },
  { name: 'Renewal Quotation Email',     category_code: 'QUOTATION',      channel: 'EMAIL', subject: 'Renewal Quotation for {{service_name}} - {{customer_name}}',           body: makeQuoteHtml() },
  { name: 'Service Expiry Notice',       category_code: 'EXPIRY',         channel: 'EMAIL', subject: 'NOTICE: {{service_name}} has expired - {{customer_name}}',             body: makeExpiryHtml() },
  { name: 'Renewal Confirmation',        category_code: 'CONFIRMATION',   channel: 'EMAIL', subject: 'Renewal Confirmed: {{service_name}} renewed until {{new_expiry_date}}', body: makeConfirmHtml() },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting 10-year comprehensive seed...');
  const existingClients = await (prisma as any).clientCompany.count();
  const existingAccounts = await (prisma as any).renewalAccount.count();
  console.log(`Existing: ${existingClients} clients, ${existingAccounts} accounts`);

  // 1. Seed email templates
  console.log('\nSeeding email templates...');
  const templateIds: number[] = [];
  for (const tmpl of TMPLS) {
    const ex = await (prisma as any).renewalNotificationTemplate.findFirst({ where: { name: tmpl.name } });
    if (ex) { templateIds.push(ex.id); console.log(`  exists: ${tmpl.name}`); continue; }
    const cr = await (prisma as any).renewalNotificationTemplate.create({
      data: { name: tmpl.name, category_code: tmpl.category_code, channel: tmpl.channel, subject: tmpl.subject, body_html: tmpl.body, compiled_html: tmpl.body, variables: JSON.stringify(['customer_name','service_name','identifier','expiry_date','days_remaining','amount_due','account_manager','company_name','new_expiry_date']), is_active: true }
    });
    templateIds.push(cr.id);
    console.log(`  created: ${tmpl.name} [${cr.id}]`);
  }

  // 2. Load reference data
  const [users, serviceMasters, providers] = await Promise.all([
    (prisma as any).user.findMany({ where: { status: { in: ['ACTIVE', 'INVITED'] } }, select: { id: true, first_name: true, last_name: true }, take: 30 }),
    (prisma as any).renewalServiceMaster.findMany({ select: { id: true, name: true } }),
    (prisma as any).renewalProvider.findMany({ select: { id: true, name: true } }),
  ]);
  const internalCo = await (prisma as any).company.findFirst({ select: { id: true, name: true } });
  const internalCompanyId: number = internalCo?.id ?? 1;
  const internalCompanyName: string = internalCo?.name ?? 'Angler Technologies';
  console.log(`\nUsers: ${users.length}, Services: ${serviceMasters.length}, Providers: ${providers.length}`);
  if (!users.length || !serviceMasters.length) { console.error('Missing reference data!'); process.exit(1); }

  // 3. Create 300 client companies with contacts
  console.log('\nCreating 300 client companies with contacts...');
  const newClients: Array<{id: number; name: string; email: string; dm: string}> = [];
  for (let i = 0; i < 300; i++) {
    const name = mkCompany(i + existingClients);
    const dm = mkDomain(name, i + existingClients);
    const pc = mkPerson('M');
    const pemail = `${pc.first.toLowerCase()}.${pc.last.toLowerCase()}@${dm}`;
    const cc = await (prisma as any).clientCompany.create({
      data: { name, created_at: dayjs().subtract(rndInt(1,3650),'day').toDate() }
    });
    newClients.push({ id: cc.id, name, email: pemail, dm });
    
    // Create RenewalContact
    for (let c = 0; c < rndInt(2,4); c++) {
      const cp = mkPerson(c===0?'M':undefined);
      await (prisma as any).renewalContact.create({
        data: { 
          client_company_id: cc.id, 
          name: `${cp.first} ${cp.last}`, 
          email: `${cp.first.toLowerCase()}.${cp.last.toLowerCase()}@${dm}`, 
          mobile: mkPhone(), 
          designation: rnd(DESIG), 
          is_primary: c===0,
          role: c===0?'PRIMARY':rnd(['TECHNICAL','BILLING','DECISION_MAKER']),
          is_renewal_contact: true,
          email_consent: true,
          phone_consent: true,
          whatsapp_consent: false,
          use_default_template: false,
          is_active: true
        }
      });
    }
    if ((i+1)%100===0) console.log(`  ${i+1}/300 companies`);
  }
  console.log(`Created ${newClients.length} companies`);

  // 4. Create renewal accounts with 10-year history
  console.log('\nCreating renewal accounts with 10-year history...');
  let aC=0, iC=0, cC=0, rC=0, pC=0, oC=0, dC=0, aLC=0;

  for (let ai = 0; ai < newClients.length; ai++) {
    const client = newClients[ai];
    const acctStatus = rnd(STATUSES);
    const user = rnd(users);
    const rexec = rnd(users);
    const acctCreated = dayjs().subtract(rndInt(30, 3650), 'day');

    const acct = await (prisma as any).renewalAccount.create({
      data: { 
        client_company_id: client.id, 
        company_id: internalCompanyId, 
        account_manager_id: user.id, 
        renewal_executive_id: rexec.id, 
        status: acctStatus, 
        order_number: `ORD-${String(existingAccounts+aC+1).padStart(5,'0')}`, 
        notes: `Account for ${client.name}`, 
        created_by_id: user.id,
        created_at: acctCreated.toDate() 
      }
    });
    aC++;

    // Find the primary contact we just created
    const primContact = await (prisma as any).renewalContact.findFirst({
      where: { client_company_id: client.id, is_primary: true }
    });

    const svcCount = rndInt(1, 4);
    for (let si = 0; si < svcCount; si++) {
      const svcM = rnd(serviceMasters);
      const prov = providers.length > 0 ? rnd(providers) : null;
      const svcSt: string = si===0 ? acctStatus : rnd(['ACTIVE','ACTIVE','DUE_SOON','RENEWED','EXPIRED']);
      const tmplId = rnd(templateIds);
      let expiry: dayjs.Dayjs;
      switch (svcSt) {
        case 'EXPIRED': expiry = dayjs().subtract(rndInt(1,180),'day'); break;
        case 'DUE_SOON': expiry = dayjs().add(rndInt(1,25),'day'); break;
        case 'FOLLOW_UP': expiry = dayjs().add(rndInt(5,45),'day'); break;
        case 'RENEWED': expiry = dayjs().add(rndInt(120,365),'day'); break;
        case 'NOT_RENEWING': expiry = dayjs().subtract(rndInt(1,30),'day'); break;
        default: expiry = dayjs().add(rndInt(30,365),'day');
      }
      const dm = mkDomain(client.name, si + ai * 10);
      const amtDue = rndF(1500, 50000);

      const svc = await (prisma as any).renewalServiceInstance.create({
        data: { 
          renewal_account_id: acct.id, 
          service_master_id: svcM.id, 
          provider_id: prov?.id ?? null, 
          identifier: dm, 
          activation_date: expiry.subtract(1,'year').toDate(), 
          expiry_date: expiry.toDate(), 
          amount_due: amtDue, 
          status: svcSt, 
          remarks: `Service initialized for ${client.name}`,
          customer_contact_id: primContact?.id ?? null,
          created_at: acctCreated.toDate() 
        }
      });
      iC++;

      // 10 years of history
      const numCycles = rndInt(1, 10);
      let cStart = expiry.subtract(numCycles, 'year');
      for (let ci = 0; ci < numCycles; ci++) {
        const cEnd = cStart.add(1, 'year');
        const isCurr = ci === numCycles - 1;
        const cSt = isCurr ? svcSt : 'RENEWED';
        const cAmtDue = rndF(1000, 50000);
        const cColl = cSt === 'RENEWED' ? cAmtDue : (['DUE_SOON','FOLLOW_UP'].includes(cSt) ? rndF(0, cAmtDue * 0.5) : cSt === 'EXPIRED' ? rndF(0, cAmtDue * 0.3) : 0);

        const cyc = await (prisma as any).renewalCycle.create({
          data: { 
            service_instance_id: svc.id, 
            activation_date: cStart.toDate(), 
            expiry_date: cEnd.toDate(), 
            amount_due: cAmtDue, 
            amount_collected: cColl, 
            status: cSt, 
            created_at: cStart.toDate() 
          }
        });
        cC++;

        if (cColl > 0) {
          await (prisma as any).renewalPayment.create({
            data: { 
              cycle_id: cyc.id, 
              amount: cColl, 
              payment_date: cStart.add(rndInt(10,90),'day').toDate(), 
              payment_mode: rnd(MODES), 
              collected_by_id: rnd(users).id, 
              remarks: rnd([null, 'Full payment', 'Advance payment', 'Balance cleared', 'Bank transfer']), 
              created_at: cStart.add(rndInt(10,90),'day').toDate() 
            }
          });
          pC++;
        }

        if (isCurr && svcSt !== 'NOT_RENEWING') {
          const steps = [
            { n: 1, o: -30, a: 'CALL_REMINDER', ch: 'PHONE' },
            { n: 2, o: -15, a: 'FOLLOW_UP_EMAIL', ch: 'EMAIL' },
            { n: 3, o: 0,  a: 'EXPIRY_ALERT', ch: 'EMAIL' },
          ];
          for (const rs of steps) {
            const dd = expiry.add(rs.o, 'day');
            let rSt = 'PENDING'; let compAt: Date|null = null; let compById: number|null = null; let skipAt: Date|null = null; let skipR: string|null = null;
            if (svcSt === 'EXPIRED' && rs.n < 3) { rSt = 'COMPLETED'; compAt = dd.add(1,'day').toDate(); compById = rnd(users).id; }
            else if (svcSt === 'DUE_SOON' && rs.n === 1) { rSt = 'COMPLETED'; compAt = dd.add(1,'day').toDate(); compById = rnd(users).id; }
            else if (svcSt === 'DUE_SOON' && rs.n === 2) {
              const rv = (ai + si) % 3;
              if (rv === 0) { rSt = 'DUE'; }
              else if (rv === 1) { rSt = 'COMPLETED'; compAt = dd.add(1,'day').toDate(); compById = rnd(users).id; }
              else { rSt = 'SKIPPED'; skipAt = dd.add(1,'day').toDate(); skipR = 'Customer requested callback'; }
            } else if (svcSt === 'FOLLOW_UP' && rs.n < 3) { rSt = 'COMPLETED'; compAt = dd.add(1,'day').toDate(); compById = rnd(users).id; }
            await (prisma as any).renewalReminder.create({
              data: { cycle_id: cyc.id, step_number: rs.n, offset_days: rs.o, due_date: dd.toDate(), action_type: rs.a, channel: rs.ch, recipient_type: 'PRIMARY', assigned_user_id: rnd(users).id, template_id: rs.ch === 'EMAIL' ? tmplId : null, status: rSt, completed_at: compAt, completed_by_id: compById, skipped_at: skipAt, skip_reason: skipR, is_mandatory: rs.n === 3 }
            });
            rC++;
          }
        }
        cStart = cEnd;
      }

      // Documents
      if (rndInt(0,2) > 0) {
        const docTypes = ['INVOICE','RENEWAL_ORDER','PAYMENT_RECEIPT','SUPPORT_CONTRACT'];
        for (let di = 0; di < rndInt(1,3); di++) {
          const dt = rnd(docTypes);
          await (prisma as any).renewalDocument.create({
            data: { 
              renewal_account_id: acct.id, 
              document_type: dt, 
              name: `${dt}_${client.name.replace(/\s/g,'_').slice(0,10)}_${dayjs().format('YYYYMMDD')}.pdf`, 
              url: `https://storage.anglercrm.com/docs/${acct.id}/${svc.id}/${Date.now()}.pdf`, 
              uploaded_by_id: rnd(users).id 
            }
          });
          dC++;
        }
      }

      // Outbox with fully rendered HTML
      if (!['RENEWED','NOT_RENEWING'].includes(svcSt) && rndInt(0,2) > 0) {
        const contactEmail = client.email || `info@${dm}`;
        const contactName = primContact?.name ?? `${client.name} Team`;
        const expiryStr = expiry.format('DD MMM YYYY');
        const daysR = expiry.diff(dayjs(), 'day');
        const amtStr = amtDue.toLocaleString('en-IN');
        const am = `${user.first_name} ${user.last_name ?? ''}`.trim();
        const tIdx = svcSt === 'EXPIRED' ? 3 : (Math.abs(daysR) <= 7 ? 1 : 0);
        const tmpl = TMPLS[tIdx];
        const vars: Record<string,string> = {
          customer_name: contactName, service_name: svcM.name, identifier: dm,
          expiry_date: expiryStr, days_remaining: String(Math.abs(daysR)),
          amount_due: amtStr, account_manager: am, company_name: internalCompanyName,
          new_expiry_date: expiry.add(1,'year').format('DD MMM YYYY'),
        };
        const rendBody = render(tmpl.body, vars);
        const rendSubj = render(tmpl.subject, vars);
        const outSt = rnd(['PENDING_APPROVAL','PENDING_APPROVAL','SENT','SENT','SKIPPED']);
        await (prisma as any).notificationOutbox.create({
          data: {
            channel: 'EMAIL', recipient: contactEmail, recipient_name: contactName,
            template_id: templateIds[tIdx], subject: rendSubj, rendered_body: rendBody,
            status: outSt, requires_approval: outSt === 'PENDING_APPROVAL',
            mapping_context: JSON.stringify({ instance_id: svc.id, account_id: acct.id, client_name: client.name, service_name: svcM.name, identifier: dm }),
            sent_at: outSt === 'SENT' ? dayjs().subtract(rndInt(1,30),'day').toDate() : null,
            created_at: dayjs().subtract(rndInt(1,60),'day').toDate(),
          }
        });
        oC++;
      }
    }

    // Audit log
    await (prisma as any).renewalAuditLog.create({
      data: { 
        renewal_account_id: acct.id, 
        entity_type: 'ACCOUNT',
        entity_id: acct.id,
        action: 'CREATED', 
        performed_by_id: rnd(users).id, 
        performed_at: acctCreated.toDate() 
      }
    });
    aLC++;

    if (aC % 100 === 0) {
      console.log(`  ${aC} accts | ${iC} svc | ${cC} cycles | ${rC} reminders | ${pC} payments | ${oC} outbox`);
    }
  }

  console.log('\n=== Seed complete! New data added: ===');
  console.log(`  Accounts: ${aC} | Instances: ${iC} | Cycles: ${cC}`);
  console.log(`  Reminders: ${rC} | Payments: ${pC} | Documents: ${dC}`);
  console.log(`  Outbox: ${oC} | Audit logs: ${aLC} | Templates: ${templateIds.length}`);

  const [totalC, totalA, totalT, totalO] = await Promise.all([
    (prisma as any).clientCompany.count(),
    (prisma as any).renewalAccount.count(),
    (prisma as any).renewalNotificationTemplate.count(),
    (prisma as any).notificationOutbox.count(),
  ]);
  console.log('\n=== Grand Totals in DB: ===');
  console.log(`  ClientCompany: ${totalC} | RenewalAccount: ${totalA}`);
  console.log(`  Templates: ${totalT} | Outbox: ${totalO}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Seed error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});

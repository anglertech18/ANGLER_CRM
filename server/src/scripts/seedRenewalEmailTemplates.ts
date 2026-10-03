import { prisma } from '../lib/prisma';
import { ensureResponsiveEmailHtml } from '../utils/emailHtmlCompatibility';

/**
 * Seed standard Renewal Email Notification Templates (the actual email message
 * received by clients that carries attached Order Forms or Proforma Invoices).
 * 
 * Scoped to ANGLER and TRINETRA parent companies and their Brand Profiles.
 * Safe to run repeatedly (upsert by name & channel).
 */
export async function seedRenewalEmailTemplates() {
  console.log('[Seed] Seeding Renewal Email Notification Templates for ANGLER and TRINETRA...');

  // 1. Resolve parent companies
  const anglerCompany = await (prisma as any).company.findFirst({
    where: { name: { contains: 'ANGLER' }, is_active: true },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  const trinetraCompany = await (prisma as any).company.findFirst({
    where: { name: { contains: 'Trinetra' }, is_active: true },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  // 2. Resolve Brand Profiles
  const anglerProfile = await (prisma as any).renewalBrandProfile.findFirst({
    where: {
      OR: [
        { company_id: anglerCompany?.id },
        { profile_name: { contains: 'ANGLER' } },
        { is_default: true },
      ],
    },
    select: { id: true, profile_name: true },
  });

  const trinetraProfile = await (prisma as any).renewalBrandProfile.findFirst({
    where: {
      OR: [
        { company_id: trinetraCompany?.id },
        { profile_name: { contains: 'Trinetra' } },
      ],
    },
    select: { id: true, profile_name: true },
  });

  // ── 3. ANGLER RENEWAL EMAIL TEMPLATE (Carries Order Form PDF) ───────────────
  const anglerEmailHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#334155;line-height:1.6;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <tr>
          <td bgcolor="#074388" style="padding:24px 32px;background:linear-gradient(135deg,#074388 0%,#0c5cb7 100%);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">
                  ANGLER Technologies
                </td>
                <td align="right" style="color:#93c5fd;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">
                  Renewal Notice
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;font-weight:bold;color:#0f172a;margin-top:0;margin-bottom:12px;">
              Subscription Renewal Reminder
            </p>

            <p style="margin-top:0;margin-bottom:16px;color:#475569;">
              Dear <strong>{{customer_name}}</strong>,
            </p>

            <p style="margin-top:0;margin-bottom:20px;color:#475569;">
              This is a courtesy notification that your subscription for <strong>{{service_name}}</strong> ({{domain_url}}) is due for renewal on <strong style="color:#074388;">{{expiry_date}}</strong>.
            </p>

            <!-- Service Details Summary Table -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:bold;width:38%;">Customer Company</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-weight:600;">{{client_name}}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:bold;">Service Item</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-weight:600;">{{service_name}}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:bold;">Order Reference</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#074388;font-family:monospace;font-weight:bold;">ORD-{{order_number}}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:bold;">Renewal Expiry Date</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#dc2626;font-weight:bold;">{{expiry_date}}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;font-size:12px;color:#64748b;font-weight:bold;">Renewal Amount Due</td>
                <td style="padding:14px 18px;font-size:15px;color:#047857;font-weight:800;">{{amount_due}}</td>
              </tr>
            </table>

            <!-- Attached Order Form Callout Box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="top" style="font-size:22px;line-height:1;">📄</td>
                      <td style="font-size:13px;color:#1e3a8a;line-height:1.5;">
                        <strong style="font-size:14px;color:#1d4ed8;display:block;margin-bottom:2px;">Attached: Service Renewal Order Form</strong>
                        The official renewal order form (<strong>ORD-{{order_number}}.pdf</strong>) has been generated and attached to this email. Please review the service specifications and return a signed copy or issue your Purchase Order to ensure continuous service uninterrupted.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin-top:0;margin-bottom:24px;color:#475569;font-size:13px;">
              Should you require any changes or wish to upgrade your configuration, please reach out to your Account Executive <strong>{{sender_name}}</strong> directly.
            </p>

            <!-- Action Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:24px;">
              <tr>
                <td bgcolor="#074388" style="border-radius:8px;text-align:center;">
                  <a href="mailto:support@angleritech.com?subject=Confirmation%20of%20Renewal%20for%20ORD-{{order_number}}" target="_blank" style="padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;border-radius:8px;letter-spacing:0.3px;">
                    Confirm & Renew Now →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Signoff -->
            <div style="border-top:1px solid #f1f5f9;padding-top:20px;font-size:12px;color:#64748b;">
              <p style="margin:0 0 4px 0;">Warm regards,</p>
              <p style="margin:0 0 2px 0;font-weight:bold;color:#1e293b;">{{sender_name}}</p>
              <p style="margin:0;color:#64748b;">Renewals & Customer Success Team · ANGLER Technologies</p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#f8fafc" style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5;">
            ANGLER Technologies India Pvt Ltd., · No. 34/2, Mettupalayam Road, Coimbatore - 641 043<br/>
            Phone: +91 422 4390777 · Web: <a href="https://www.angleritech.com" style="color:#074388;text-decoration:none;">www.angleritech.com</a>
          </td>
        </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>`;

  // ── 4. TRINETRA RENEWAL EMAIL TEMPLATE (Carries Proforma Invoice PDF) ────────
  const trinetraEmailHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#334155;line-height:1.6;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <tr>
          <td bgcolor="#002060" style="padding:24px 32px;background:linear-gradient(135deg,#002060 0%,#1e3a8a 100%);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">
                  TRINETRA Wireless
                </td>
                <td align="right" style="color:#93c5fd;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">
                  Annual Renewal Notice
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;font-weight:bold;color:#0f172a;margin-top:0;margin-bottom:12px;">
              Fleet & Asset Management Subscription Renewal
            </p>

            <p style="margin-top:0;margin-bottom:16px;color:#475569;">
              Dear <strong>{{customer_name}}</strong>,
            </p>

            <p style="margin-top:0;margin-bottom:20px;color:#475569;">
              Thank you for trusting Trinetra for your fleet monitoring and mobility solutions. Your subscription for <strong>{{service_name}}</strong> ({{domain_url}}) is expiring on <strong style="color:#002060;">{{expiry_date}}</strong>.
            </p>

            <!-- Details Table -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:bold;width:38%;">Client Company</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-weight:600;">{{client_name}}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:bold;">Solution / Modules</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-weight:600;">{{service_name}}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:bold;">Invoice / Order Ref</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#002060;font-family:monospace;font-weight:bold;">PI-{{order_number}}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:bold;">Valid Up To</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#b91c1c;font-weight:bold;">{{expiry_date}}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;font-size:12px;color:#64748b;font-weight:bold;">Total Amount Payable</td>
                <td style="padding:14px 18px;font-size:15px;color:#047857;font-weight:800;">{{amount_due}}</td>
              </tr>
            </table>

            <!-- Attached Proforma Invoice Callout Box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="top" style="font-size:22px;line-height:1;">📑</td>
                      <td style="font-size:13px;color:#166534;line-height:1.5;">
                        <strong style="font-size:14px;color:#15803d;display:block;margin-bottom:2px;">Attached: Official Proforma Invoice</strong>
                        Please find attached the formal Proforma Invoice (<strong>PI-{{order_number}}.pdf</strong>) detailing unit pricing, tax components, and electronic bank remittance information for your finance approval.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin-top:0;margin-bottom:24px;color:#475569;font-size:13px;">
              To ensure uninterrupted GPS tracking, sensor telemetry, and server uptime, please release payment or share the remittance confirmation with our support desk.
            </p>

            <!-- Action Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:24px;">
              <tr>
                <td bgcolor="#002060" style="border-radius:8px;text-align:center;">
                  <a href="mailto:renewals@trinetrawireless.com?subject=Payment%20Confirmation%20for%20PI-{{order_number}}" target="_blank" style="padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;border-radius:8px;letter-spacing:0.3px;">
                    Proceed with Renewal →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Signoff -->
            <div style="border-top:1px solid #f1f5f9;padding-top:20px;font-size:12px;color:#64748b;">
              <p style="margin:0 0 4px 0;">Best regards,</p>
              <p style="margin:0 0 2px 0;font-weight:bold;color:#1e293b;">{{sender_name}}</p>
              <p style="margin:0;color:#64748b;">Client Services & Operations · Trinetra Wireless Solutions</p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#f8fafc" style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5;">
            Trinetra Wireless Solutions Pvt Ltd., · No. 34/2, Mettupalayam Road, Coimbatore - 641 043<br/>
            Phone: +91 422 4390777 · Web: <a href="https://www.trinetrawireless.com" style="color:#002060;text-decoration:none;">www.trinetrawireless.com</a>
          </td>
        </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>`;

  const templatesToSeed = [
    {
      name: 'ANGLER — Renewal Reminder & Order Form Notification',
      category_code: 'ANGLER_RENEWAL',
      channel: 'EMAIL',
      subject: 'Action Required: Service Renewal Notice for {{service_name}} — {{domain_url}}',
      body_html: ensureResponsiveEmailHtml(anglerEmailHtml.trim()),
      brand_profile_id: anglerProfile?.id || null,
      variables: JSON.stringify(['customer_name', 'client_name', 'service_name', 'domain_url', 'order_number', 'expiry_date', 'amount_due', 'sender_name']),
      is_published: true,
      is_active: true,
    },
    {
      name: 'TRINETRA — Renewal Reminder & Proforma Invoice Notification',
      category_code: 'TRINETRA_RENEWAL',
      channel: 'EMAIL',
      subject: 'Upcoming Renewal Notice: {{service_name}} — {{customer_name}}',
      body_html: ensureResponsiveEmailHtml(trinetraEmailHtml.trim()),
      brand_profile_id: trinetraProfile?.id || null,
      variables: JSON.stringify(['customer_name', 'client_name', 'service_name', 'domain_url', 'order_number', 'expiry_date', 'amount_due', 'sender_name']),
      is_published: true,
      is_active: true,
    },
  ];

  for (const t of templatesToSeed) {
    const existing = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: { name: t.name, channel: t.channel },
    });

    if (existing) {
      await (prisma as any).renewalNotificationTemplate.update({
        where: { id: existing.id },
        data: {
          category_code: t.category_code,
          subject: t.subject,
          body_html: t.body_html,
          compiled_html: t.body_html,
          brand_profile_id: t.brand_profile_id,
          variables: t.variables,
          is_published: t.is_published,
          is_active: t.is_active,
        },
      });
      console.log(`[Seed] ✅ Updated template: "${t.name}" (ID #${existing.id})`);
    } else {
      const created = await (prisma as any).renewalNotificationTemplate.create({
        data: {
          ...t,
          compiled_html: t.body_html,
        },
      });
      console.log(`[Seed] ✅ Created template: "${t.name}" (ID #${created.id})`);
    }
  }

  console.log('[Seed] Finished seeding Renewal Email Notification Templates.');
}

// Allow direct CLI execution: npx ts-node src/scripts/seedRenewalEmailTemplates.ts
if (require.main === module) {
  seedRenewalEmailTemplates()
    .catch((err) => {
      console.error('[Seed] Error seeding templates:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

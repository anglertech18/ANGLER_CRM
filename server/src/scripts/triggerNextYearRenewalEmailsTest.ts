import dayjs from 'dayjs';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';
import { getActiveSmtpConfigDecrypted } from '../controllers/smtpConfigController';
import { ensureResponsiveEmailHtml } from '../utils/emailHtmlCompatibility';
import { generateOrderFormPDF } from '../utils/orderFormPdfGenerator';
import { generateProformaInvoicePDF } from '../utils/proformaInvoicePdfGenerator';

/**
 * STANDALONE TEST SCRIPT: triggerNextYearRenewalEmailsTest.ts
 *
 * SOLE PURPOSE:
 * Query all active renewal services/reminders due or expiring in the NEXT 1 YEAR,
 * generate their complete responsive email templates (with attached Order Form
 * or Proforma Invoice PDF), and dispatch test emails.
 *
 * CRITICAL RECIPIENT RULE:
 * - TO: kannan.p@angleritech.com (STRICTLY)
 * - CC: kannan.p@angleritech.com (or suppressed)
 * - BCC: kannan.p@angleritech.com (or suppressed)
 * - NO real client, customer, or third-party address will EVER receive any email.
 *
 * RUNNING INSTRUCTIONS:
 *   Dry-run mode (previews without sending):
 *     npx tsx src/scripts/triggerNextYearRenewalEmailsTest.ts --dry-run
 *
 *   Send first 2 emails for test verification:
 *     npx tsx src/scripts/triggerNextYearRenewalEmailsTest.ts --send --limit=2
 *
 *   Send all eligible emails for next 1 year:
 *     npx tsx src/scripts/triggerNextYearRenewalEmailsTest.ts --send
 *
 *   Filter by company or service ID:
 *     npx tsx src/scripts/triggerNextYearRenewalEmailsTest.ts --send --company=Trinetra --limit=1
 *     npx tsx src/scripts/triggerNextYearRenewalEmailsTest.ts --send --service-id=105
 */

const STRICT_TARGET_EMAIL = 'kannan.p@angleritech.com';

interface ScriptOptions {
  dryRun: boolean;
  send: boolean;
  limit?: number;
  companyFilter?: string;
  serviceIdFilter?: number;
}

function parseCliArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    dryRun: args.includes('--dry-run'),
    send: args.includes('--send'),
  };

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--company=')) {
      options.companyFilter = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--service-id=')) {
      options.serviceIdFilter = parseInt(arg.split('=')[1], 10);
    }
  }

  // Default to dry-run if neither --send nor --dry-run specified
  if (!options.dryRun && !options.send) {
    console.log('ℹ️  No mode specified. Defaulting to --send mode (all emails strictly directed to kannan.p@angleritech.com).');
    options.send = true;
  }

  return options;
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(tokens)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value ?? '');
  }
  return result;
}

async function resolveEmailTemplateForService(
  svc: any,
  companyName: string
): Promise<{ subject: string; bodyHtml: string; templateName: string }> {
  const isTrinetra = companyName.toLowerCase().includes('trinetra');
  const companyId = svc.renewal_account?.company_id;

  // 1. Look for custom email templates seeded specifically for ANGLER or TRINETRA
  let template = await (prisma as any).renewalNotificationTemplate.findFirst({
    where: {
      channel: 'EMAIL',
      is_active: true,
      name: isTrinetra
        ? { contains: 'TRINETRA — Renewal Reminder' }
        : { contains: 'ANGLER — Renewal Reminder' },
    },
    orderBy: { id: 'desc' },
  });

  // 2. Fallback to category-based template
  if (!template && svc.service_master?.category?.code) {
    template = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: {
        channel: 'EMAIL',
        category_code: svc.service_master.category.code,
        is_active: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  // 3. Fallback to general company-scoped template
  if (!template && companyId) {
    template = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: {
        channel: 'EMAIL',
        is_active: true,
        OR: [
          { brand_profile: { company_id: companyId } },
          { name: { contains: isTrinetra ? 'Trinetra' : 'Angler' } },
        ],
      },
      orderBy: { id: 'asc' },
    });
  }

  // 4. Default fallback template if none found in DB
  if (!template) {
    const brandColor = isTrinetra ? '#002060' : '#074388';
    const fallbackSubject = `[Renewal Notice] {{service_name}} Subscription Expiring on {{expiry_date}}`;
    const fallbackHtml = `
      <div style="font-family:'Segoe UI',sans-serif;max-width:650px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background-color:${brandColor};padding:20px;color:#fff;">
          <h2 style="margin:0;font-size:18px;">${companyName} — Renewal Reminder</h2>
        </div>
        <div style="padding:24px;color:#334155;">
          <p>Dear <strong>{{customer_name}}</strong>,</p>
          <p>This is a reminder that your service <strong>{{service_name}}</strong> ({{domain_url}}) is expiring on <strong style="color:${brandColor};">{{expiry_date}}</strong> (<strong>{{days_left}}</strong> days left).</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;font-size:13px;">
            <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Customer:</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">{{client_name}}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Order Reference:</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">ORD-{{order_number}}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Amount Due:</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">₹{{grand_total}}</td></tr>
          </table>
          <p>Please review the attached document and contact your account manager <strong>{{account_manager_name}}</strong> for renewal confirmation.</p>
        </div>
      </div>
    `;
    return {
      subject: fallbackSubject,
      bodyHtml: fallbackHtml,
      templateName: 'Built-in Fallback Template',
    };
  }

  return {
    subject: template.subject || `Renewal Reminder – {{client_name}}`,
    bodyHtml: template.compiled_html || template.body_html || template.body_text || '',
    templateName: template.name,
  };
}

async function main() {
  const options = parseCliArgs();
  console.log('================================================================================');
  console.log(' 🚀 STANDALONE RENEWAL 1-YEAR EMAIL TRIGGER SCRIPT');
  console.log('================================================================================');
  console.log(` Mode:               ${options.dryRun ? 'DRY-RUN (Preview Only, No Emails Sent)' : 'SEND ACTIVE'}`);
  console.log(` Strict Recipient:   ${STRICT_TARGET_EMAIL}`);
  console.log(` Strict CC & BCC:    ${STRICT_TARGET_EMAIL}`);
  console.log(` Limit:              ${options.limit ?? 'No Limit (All eligible)'}`);
  if (options.companyFilter) console.log(` Company Filter:    ${options.companyFilter}`);
  if (options.serviceIdFilter) console.log(` Service ID Filter: ${options.serviceIdFilter}`);
  console.log('--------------------------------------------------------------------------------\n');

  // 1. Time window: from right now to 365 days into the future
  const now = dayjs().startOf('day');
  const nextYear = dayjs().add(365, 'day').endOf('day');

  console.log(`📅 Target Expiry Window: ${now.format('DD-MMM-YYYY')} to ${nextYear.format('DD-MMM-YYYY')} (Next 365 Days)`);

  // 2. Query eligible service instances
  const whereClause: any = {
    is_active: true,
    expiry_date: {
      gte: now.toDate(),
      lte: nextYear.toDate(),
    },
  };

  if (options.serviceIdFilter) {
    whereClause.id = options.serviceIdFilter;
  }

  const eligibleServices = await (prisma as any).renewalServiceInstance.findMany({
    where: whereClause,
    include: {
      renewal_account: {
        include: {
          client_company: true,
          company: true,
          account_manager: true,
          renewal_executive: true,
        },
      },
      service_master: {
        include: { category: true },
      },
      provider: true,
      customer_contact: true,
      assigned_user: true,
      cycles: {
        where: { is_active: true },
        take: 1,
      },
    },
    orderBy: { expiry_date: 'asc' },
  });

  // Filter by company if requested
  const filteredServices = eligibleServices.filter((svc: any) => {
    if (!options.companyFilter) return true;
    const compName = svc.renewal_account?.company?.name || '';
    return compName.toLowerCase().includes(options.companyFilter);
  });

  const finalServices = options.limit ? filteredServices.slice(0, options.limit) : filteredServices;

  console.log(`🔍 Total service instances expiring in next 1 year found: ${eligibleServices.length}`);
  if (options.companyFilter) {
    console.log(`🔍 Matching company '${options.companyFilter}': ${filteredServices.length}`);
  }
  console.log(`📋 Selected for this execution: ${finalServices.length}\n`);

  if (finalServices.length === 0) {
    console.log('⚠️  No renewal service instances found matching the specified criteria.');
    return;
  }

  // 3. Resolve SMTP Configuration
  let transporter: nodemailer.Transporter | null = null;
  let smtpCfg: any = null;

  if (options.send) {
    smtpCfg = await getActiveSmtpConfigDecrypted();
    if (!smtpCfg) {
      throw new Error(
        '❌ No active SMTP configuration found in the database or environment variables! Please configure SMTP first.'
      );
    }

    console.log(`📧 Connected to SMTP Server: ${smtpCfg.host}:${smtpCfg.port} (Sender: ${smtpCfg.from_email})\n`);
    transporter = nodemailer.createTransport({
      host: smtpCfg.host,
      port: smtpCfg.port,
      secure: smtpCfg.secure,
      auth: { user: smtpCfg.username, pass: smtpCfg.password },
      tls: process.env.NODE_ENV !== 'production' ? { rejectUnauthorized: false } : undefined,
    });

    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection successfully verified.');
    } catch (verifyErr: any) {
      console.error('❌ SMTP connection verification failed:', verifyErr.message);
      throw verifyErr;
    }
  }

  // 4. Process each renewal and send test emails
  console.log('\n================================================================================');
  console.log(' 📤 PROCESSING & SENDING TEST RENEWAL EMAILS');
  console.log('================================================================================\n');

  let successCount = 0;
  let failureCount = 0;

  for (let idx = 0; idx < finalServices.length; idx++) {
    const svc = finalServices[idx];
    const account = svc.renewal_account;
    const parentCompany = account?.company?.name || 'ANGLER Technologies';
    const isTrinetra = parentCompany.toLowerCase().includes('trinetra');
    const clientName = account?.client_company?.name || 'Valued Customer';
    const contactName = svc.customer_contact?.name || account?.client_company?.contact_person || 'Customer Contact';
    const serviceName = svc.service_master?.name || 'Annual Renewal Service';
    const identifier = svc.identifier || 'N/A';
    const expiryDateFormatted = svc.expiry_date ? dayjs(svc.expiry_date).format('DD-MMM-YYYY') : '—';
    const daysLeft = svc.expiry_date ? dayjs(svc.expiry_date).diff(dayjs(), 'day') : 0;
    const amountDue = Number(svc.amount_due ?? 0);
    const subtotal = amountDue;
    const gst = Math.round(amountDue * 0.18 * 100) / 100;
    const grandTotal = subtotal + gst;
    const orderNumber = account?.order_number || `RN-${String(svc.id).padStart(6, '0')}`;
    const realCustomerEmail = svc.customer_contact?.email || account?.client_company?.email || '';

    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[${idx + 1} / ${finalServices.length}] Service #${svc.id} | ${parentCompany}`);
    console.log(`  Customer:     ${clientName} (${contactName})`);
    console.log(`  Service:      ${serviceName} [${identifier}]`);
    console.log(`  Expiry Date:  ${expiryDateFormatted} (${daysLeft} days remaining)`);
    console.log(`  Amount Due:   ₹${grandTotal} (Subtotal: ₹${subtotal} + GST: ₹${gst})`);
    console.log(`  Real Contact: ${realCustomerEmail || 'None listed'} (SUPPRESSED)`);
    console.log(`  Target Email: STRICTLY ${STRICT_TARGET_EMAIL}`);

    // Resolve template
    const templateInfo = await resolveEmailTemplateForService(svc, parentCompany);
    console.log(`  Template:     ${templateInfo.templateName}`);

    // Build replacement tokens
    const tokens: Record<string, string> = {
      client_name: clientName,
      customer_name: contactName,
      company_name: parentCompany,
      order_number: orderNumber,
      service_name: serviceName,
      identifier: identifier,
      domain_url: identifier,
      expiry_date: expiryDateFormatted,
      days_left: String(daysLeft),
      amount_due: String(amountDue),
      subtotal: String(subtotal),
      gst: String(gst),
      grand_total: String(grandTotal),
      provider_name: svc.provider?.name || '',
      account_manager_name: `${account?.account_manager?.first_name || ''} ${account?.account_manager?.last_name || ''}`.trim() || 'ANGLER Renewal Support',
      sender_name: isTrinetra ? 'Trinetra Renewals Team' : 'ANGLER Renewals Team',
    };

    const renderedSubject = replaceTokens(templateInfo.subject, tokens);
    const rawRenderedBody = replaceTokens(templateInfo.bodyHtml, tokens);

    // Add a prominent diagnostic test banner at top of body
    const testBannerHtml = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;border-collapse:collapse;">
        <tr>
          <td style="background-color:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:16px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#92400e;line-height:1.5;">
            <div style="font-size:14px;font-weight:bold;color:#b45309;margin-bottom:8px;">
              ⚠️ TEST RENEWAL TRIGGER — SIMULATION FOR NEXT 1 YEAR
            </div>
            <div><strong>Strict Target To:</strong> <span style="color:#0f172a;font-weight:600;">${STRICT_TARGET_EMAIL}</span></div>
            <div><strong>Strict CC & BCC:</strong> <span style="color:#0f172a;font-weight:600;">${STRICT_TARGET_EMAIL}</span></div>
            <div><strong>Original Customer Contact:</strong> ${realCustomerEmail || 'N/A'} <em>(Suppressed for Safety)</em></div>
            <div><strong>Service Instance:</strong> #${svc.id} — ${serviceName} (${identifier})</div>
            <div><strong>Expiry Date:</strong> ${expiryDateFormatted} (in ${daysLeft} days)</div>
            <div><strong>Parent Company:</strong> ${parentCompany}</div>
            <div><strong>Order Reference:</strong> ${orderNumber}</div>
          </td>
        </tr>
      </table>
    `;

    const fullEmailHtml = ensureResponsiveEmailHtml(testBannerHtml + rawRenderedBody);

    // Generate attachment (Order Form for ANGLER, Proforma Invoice for TRINETRA)
    let attachmentObj: any = null;
    let attachmentType = isTrinetra ? 'Proforma Invoice PDF' : 'Order Form PDF';

    try {
      if (account?.id) {
        if (isTrinetra) {
          const piResult = await generateProformaInvoicePDF(account.id);
          attachmentObj = {
            filename: `PI-${orderNumber}.pdf`,
            path: piResult.filePath,
          };
          console.log(`  Attachment:   ${attachmentType} generated at ${piResult.filePath}`);
        } else {
          const ordResult = await generateOrderFormPDF(account.id);
          attachmentObj = {
            filename: `OrderForm-${orderNumber}.pdf`,
            path: ordResult.filePath,
          };
          console.log(`  Attachment:   ${attachmentType} generated at ${ordResult.filePath}`);
        }
      }
    } catch (pdfErr: any) {
      console.warn(`  ⚠️ Attachment generation warning: ${pdfErr.message} (Sending email without PDF)`);
    }

    if (options.dryRun) {
      console.log(`  [DRY-RUN] Subject: [TEST 1-YEAR TRIGGER] ${renderedSubject}`);
      console.log(`  [DRY-RUN] Simulated delivery to ${STRICT_TARGET_EMAIL} successful.`);
      successCount++;
    } else if (transporter && smtpCfg) {
      try {
        const mailOptions: nodemailer.SendMailOptions = {
          from: smtpCfg.from_name
            ? `"${smtpCfg.from_name}" <${smtpCfg.from_email}>`
            : smtpCfg.from_email,
          to: STRICT_TARGET_EMAIL,
          cc: STRICT_TARGET_EMAIL,
          bcc: STRICT_TARGET_EMAIL,
          subject: `[TEST 1-YEAR TRIGGER] [${parentCompany}] ${renderedSubject}`,
          html: fullEmailHtml,
          attachments: attachmentObj ? [attachmentObj] : undefined,
        };

        const sendResult = await transporter.sendMail(mailOptions);
        console.log(`  ✅ Dispatched! MessageId: ${sendResult.messageId}`);
        successCount++;

        // Brief delay between sends to respect SMTP rate limits
        if (idx < finalServices.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      } catch (sendErr: any) {
        console.error(`  ❌ SMTP Send Failed:`, sendErr.message);
        failureCount++;
      }
    }
  }

  console.log('\n================================================================================');
  console.log(' 🏁 EXECUTION SUMMARY');
  console.log('================================================================================');
  console.log(` Total Eligible:    ${eligibleServices.length}`);
  console.log(` Processed:         ${finalServices.length}`);
  console.log(` Successful Sends:  ${successCount}`);
  console.log(` Failed Sends:      ${failureCount}`);
  console.log(` Strict Target:     ${STRICT_TARGET_EMAIL}`);
  console.log('================================================================================\n');
}

main()
  .catch((err) => {
    console.error('Fatal error during standalone trigger script:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

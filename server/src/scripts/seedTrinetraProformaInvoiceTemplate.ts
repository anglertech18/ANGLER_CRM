import { prisma } from '../lib/prisma';

/**
 * Seeds the Trinetra Proforma Invoice template (email/print HTML).
 * Company is resolved dynamically from the Company master — no hardcoded IDs.
 * Also links the template to the Trinetra brand profile and syncs the
 * bank details shown on the real Trinetra proforma invoice (State Bank of India).
 *
 * Reference layout: `md files/ref/trinetra performa invoice template.pdf`
 */
export const TRINETRA_PROFORMA_INVOICE_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 15px; }
  .invoice-container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #1E3A8A; padding: 12px; box-sizing: border-box; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .logo-cell img { max-width: 150px; height: auto; }
  .title-cell { text-align: right; }
  .title-cell h1 { font-size: 15px; margin: 0; color: #0f172a; letter-spacing: 1px; }

  table.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.meta-table td { font-size: 10.5px; padding: 2px 4px; vertical-align: top; }
  .lbl { font-weight: bold; white-space: nowrap; }

  table.parties-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.parties-table td { border: 1px solid #64748b; padding: 5px 7px; font-size: 10.5px; vertical-align: top; }

  table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.items-table th, table.items-table td { border: 1px solid #64748b; padding: 4px 5px; font-size: 10.5px; }
  table.items-table th { background-color: #d1d5db; text-align: center; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .row-total td { font-weight: bold; }
  .row-grand td { background-color: #dbeafe; font-weight: bold; }

  .amount-words { font-weight: bold; margin: 6px 0; font-size: 10.5px; }

  table.bank-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.bank-table td { border: 1px solid #64748b; padding: 4px 6px; font-size: 10.5px; }
  table.bank-table td:first-child { font-weight: bold; width: 28%; background-color: #f1f5f9; }
  .bank-title { font-weight: bold; margin-bottom: 3px; font-size: 10.5px; }

  .terms-section { margin-top: 8px; font-size: 9.5px; line-height: 1.4; }
  .terms-title { font-weight: bold; font-size: 11px; margin-bottom: 3px; }
  .terms-list { margin: 0; padding-left: 15px; list-style-type: decimal; }
  .terms-list li { margin-bottom: 3px; text-align: justify; }
  .sys-note { text-align: center; font-style: italic; margin-top: 8px; font-size: 10px; }

  .footer-banner { margin-top: 10px; border-top: 2px solid #1E3A8A; padding-top: 6px; font-size: 9px; line-height: 1.35; color: #334155; }
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-company { font-size: 13px; font-weight: bold; color: #1E3A8A; margin-bottom: 3px; }
</style>
</head>
<body>

<div class="invoice-container">
  <!-- Header: Logo + Title -->
  <div class="header-row">
    <div class="logo-cell"><img src="{{logo_url}}" alt="Trinetra"></div>
    <div class="title-cell"><h1>PROFORMA INVOICE</h1></div>
  </div>

  <!-- Invoice Meta -->
  <table class="meta-table">
    <tr>
      <td class="lbl">Proforma Invoice No. &amp; Date</td>
      <td>: {{invoice_no}} dated {{invoice_date}}</td>
      <td class="lbl">Billing Period</td>
      <td>{{billing_period_start}} to {{billing_period_end}}</td>
    </tr>
    <tr>
      <td></td><td></td>
      <td class="lbl">Payment Due Date</td>
      <td>: {{payment_due_date}}</td>
    </tr>
  </table>

  <!-- Invoiced To / Customer Order -->
  <table class="parties-table">
    <tr>
      <td width="64%">
        <strong>Invoiced To:</strong><br>
        <strong>M/s. {{customer_name}},</strong><br>
        {{customer_address}}<br>
        Kind Attn: Mr. {{contact_person}}<br>
        GST No : {{customer_gst_no}}
      </td>
      <td width="36%">
        <strong>Customer Order No. &amp; Date</strong><br>
        {{customer_order_no}} dated {{order_date}}<br>
        {{po_reference}}
      </td>
    </tr>
  </table>

  <!-- Items -->
  <table class="items-table">
    <tr>
      <th width="5%">Sno</th>
      <th width="38%">Item Description</th>
      <th width="9%">SAC Code</th>
      <th width="9%">No. of Devices</th>
      <th width="12%">Unit Cost (Rs.)</th>
      <th width="11%">No. of months</th>
      <th width="16%">Amount (Rs.)</th>
    </tr>
    {{items_rows}}
    <tr class="row-total">
      <td colspan="6" class="text-right">TOTAL AMOUNT</td>
      <td class="text-right">{{total_amount}}</td>
    </tr>
    <tr>
      <td colspan="6" class="text-right"><strong>CGST @ 9%</strong></td>
      <td class="text-right"><strong>{{cgst_amount}}</strong></td>
    </tr>
    <tr>
      <td colspan="6" class="text-right"><strong>SGST @ 9%</strong></td>
      <td class="text-right"><strong>{{sgst_amount}}</strong></td>
    </tr>
    <tr class="row-grand">
      <td colspan="6" class="text-right">Grand Total</td>
      <td class="text-right">{{grand_total}}</td>
    </tr>
  </table>

  <div class="amount-words">Amount in Words : {{amount_in_words}}</div>

  <!-- Bank Details -->
  <div class="bank-title">Bank details for online payment transfer:</div>
  <table class="bank-table">
    <tr><td>Company Name</td><td>{{bank_account_name}}</td></tr>
    <tr><td>Name of Bank</td><td>{{bank_name}}</td></tr>
    <tr><td>Bank Branch Name</td><td>{{bank_branch}}</td></tr>
    <tr><td>Branch Address</td><td>{{bank_branch_address}}</td></tr>
    <tr><td>IFSC CODE</td><td>{{bank_ifsc}}</td></tr>
    <tr><td>Account Number</td><td>{{bank_account_no}}</td></tr>
    <tr><td>Payment Terms</td><td>100% in Advance</td></tr>
  </table>

  <!-- Terms & Conditions -->
  <div class="terms-section">
    <div class="terms-title">Terms &amp; Conditions <span style="float:right; font-weight:normal;">E. &amp; O.E.</span></div>
    <ol class="terms-list">
      <li>Payment to be made by A/C Payee Cheque / Banker's Cheque / DD in favour of TRINETRA Wireless Pvt Ltd &amp; Payable at Coimbatore</li>
      <li>Payment terms as per order form; otherwise interest at 24% p.a. will be charged</li>
      <li>TDS deduction is applicable only for Tax Invoice and not for Proforma Invoice</li>
      <li>GST should not be claimed against proforma invoice</li>
      <li>All disputes are subject to Coimbatore Jurisdiction</li>
    </ol>
    <div class="sys-note">This is a system generated Proforma Invoice and requires no signature</div>
  </div>

  <!-- Footer -->
  <div class="footer-banner">
    <div class="footer-row">
      <div>
        <div class="footer-company">TRINETRA Wireless Pvt Ltd</div>
        <strong>Company Name&nbsp;&nbsp;&nbsp;TRINETRA Wireless Pvt Ltd</strong>
      </div>
      <div style="text-align:right;">
        Address : #1245 (Old No. 1144) Trichy Road, Coimbatore - 641 045, India<br>
        Tel : +91 422 3192939 / 2321307 &nbsp;&nbsp; Fax : +91 422 2313936<br>
        CIN : U74999TZ2009PTC015679 &nbsp;&nbsp; GST No. 33AADCT3199B1ZJ<br>
        PAN No. AADCT3199B &nbsp;&nbsp; I.E.Code No. 3209019495
      </div>
    </div>
  </div>
</div>

</body>
</html>
`;

const TEMPLATE_NAME = 'Trinetra Proforma Invoice';

export async function seedTrinetraProformaInvoiceTemplate() {
  try {
    // ── Resolve Trinetra parent company from masters (never hardcode ID) ────
    const trinetraCompany = await (prisma as any).company.findFirst({
      where: { name: 'Trinetra', is_active: true },
      select: { id: true, name: true },
    }) || await (prisma as any).company.findFirst({
      where: { name: { contains: 'Trinetra' }, is_active: true },
      select: { id: true, name: true },
      orderBy: { id: 'desc' },
    });

    if (!trinetraCompany) {
      console.warn('[seedTrinetraProformaInvoiceTemplate] Trinetra company not found in Company masters — seeding template without company linkage');
    }

    // ── Resolve (or align) the Trinetra brand profile ───────────────────────
    // Brand profile carries the logo + bank details used on the invoice.
    const trinetraBrandPatch = {
      company_name: 'TRINETRA Wireless Pvt Ltd',
      logo_url: '/uploads/branding/trinetra_logo.png',
      website_url: 'www.trinetrawireless.com',
      sender_email: 'support@trinetrawireless.com',
      bank_name: 'State Bank of India',
      bank_branch: 'Red Fields Branch',
      bank_ifsc: 'SBIN0006577',
      bank_account_no: '30995705595',
      bank_account_name: 'TRINETRA Wireless Pvt Ltd',
    };

    let brandProfile: any = await (prisma as any).renewalBrandProfile.findFirst({
      where: trinetraCompany ? { company_id: trinetraCompany.id } : { profile_name: 'Trinetra Default' },
      orderBy: { is_default: 'desc' },
    });

    if (brandProfile) {
      brandProfile = await (prisma as any).renewalBrandProfile.update({
        where: { id: brandProfile.id },
        data: { ...trinetraBrandPatch },
      });
      console.log(`[seedTrinetraProformaInvoiceTemplate] Synced Trinetra brand profile ID #${brandProfile.id} (company: ${trinetraCompany?.name || 'n/a'})`);
    }

    // ── Upsert the proforma invoice template ────────────────────────────────
    const payload = {
      category_code: 'PROFORMA_INVOICE',
      channel: 'EMAIL',
      subject: 'Trinetra Proforma Invoice - {{invoice_no}}',
      body_html: TRINETRA_PROFORMA_INVOICE_HTML,
      compiled_html: TRINETRA_PROFORMA_INVOICE_HTML,
      is_active: true,
      brand_profile_id: brandProfile?.id || null,
    };

    const existing = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: { name: TEMPLATE_NAME },
    });

    let templateId: number;
    if (existing) {
      const updated = await (prisma as any).renewalNotificationTemplate.update({
        where: { id: existing.id },
        data: payload,
      });
      templateId = updated.id;
      console.log('[seedTrinetraProformaInvoiceTemplate] Updated existing Trinetra Proforma Invoice template ID:', templateId);
    } else {
      const created = await (prisma as any).renewalNotificationTemplate.create({
        data: { name: TEMPLATE_NAME, ...payload },
      });
      templateId = created.id;
      console.log('[seedTrinetraProformaInvoiceTemplate] Created new Trinetra Proforma Invoice template ID:', templateId);
    }

    if (trinetraCompany) {
      console.log(`[seedTrinetraProformaInvoiceTemplate] Template #${templateId} linked to company "${trinetraCompany.name}" (ID #${trinetraCompany.id}) via brand profile`);
    }
  } catch (err) {
    console.error('[seedTrinetraProformaInvoiceTemplate] Error seeding Trinetra proforma invoice template:', err);
  }
}

if (require.main === module) {
  seedTrinetraProformaInvoiceTemplate()
    .finally(async () => {
      await prisma.$disconnect();
    });
}

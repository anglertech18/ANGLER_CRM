import { prisma } from '../lib/prisma';

export const TRINETRA_ORDER_FORM_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 15px; }
  .contract-container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #002060; padding: 10px; box-sizing: border-box; }
  .header-top { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; font-weight: bold; }
  .header-top a { color: #002060; text-decoration: underline; }
  .title-banner { background-color: #002060; color: #ffffff; text-align: center; font-size: 14px; font-weight: bold; padding: 6px; border: 1px solid #002060; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
  
  table.form-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
  table.form-table td, table.form-table th { border: 1px solid #002060; padding: 4px 6px; font-size: 11px; vertical-align: middle; }
  .bg-blue-header { background-color: #d9e1f2; font-weight: bold; text-align: center; color: #002060; }
  .bg-light-blue { background-color: #f2f5f9; font-weight: bold; }
  .text-blue { color: #002060; font-weight: bold; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  
  .terms-section { margin-top: 8px; border: 1px solid #002060; padding: 6px; font-size: 9.5px; line-height: 1.35; }
  .terms-title { font-weight: bold; margin-bottom: 4px; font-size: 10.5px; text-decoration: underline; color: #002060; }
  .terms-list { margin: 0; padding-left: 14px; list-style-type: decimal; }
  .terms-list li { margin-bottom: 4px; text-align: justify; }

  .sig-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .sig-table td { border: 1px solid #002060; height: 45px; vertical-align: bottom; text-align: center; font-size: 10px; font-weight: bold; padding-bottom: 4px; }
  
  .footer-banner { margin-top: 10px; border-top: 2px solid #002060; padding-top: 5px; font-size: 9px; line-height: 1.3; color: #002060; }
  .footer-logo { font-size: 16px; font-weight: bold; color: #002060; margin-bottom: 2px; }
  .footer-row { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>

<div class="contract-container">
  <!-- Header Top Links -->
  <table class="header-top" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="left" style="font-size:11px;font-weight:bold;">Trinetra Customer Contract</td>
      <td align="right" style="font-size:11px;font-weight:bold;"><a href="https://www.trinetrawireless.com" target="_blank">www.trinetrawireless.com</a></td>
    </tr>
  </table>

  <!-- Title Banner -->
  <div class="title-banner">TRINETRA ORDER FORM</div>

  <!-- Customer & Internal Grid Table -->
  <table class="form-table">
    <tr>
      <td width="22%" class="bg-light-blue">Customer Name</td>
      <td width="43%" class="text-center text-blue"><strong>{{customer_name}}</strong></td>
      <td width="35%" colspan="2" class="bg-blue-header">To be filled by Trinetra Only</td>
    </tr>
    <tr>
      <td class="bg-light-blue">Address</td>
      <td class="text-center">{{customer_address}}</td>
      <td width="15%" class="bg-light-blue">Order #</td>
      <td width="20%" class="text-center text-blue">{{order_number}}</td>
    </tr>
    <tr>
      <td class="bg-light-blue">City & Pin Code</td>
      <td class="text-center">{{customer_city_pincode}}</td>
      <td class="bg-light-blue">Order Date</td>
      <td class="text-center text-blue">{{order_date}}</td>
    </tr>
    <tr>
      <td class="bg-light-blue">Phone No</td>
      <td class="text-center">{{customer_phone}}</td>
      <td class="bg-light-blue">Marketing Ref.</td>
      <td class="text-center text-blue">{{marketing_ref}}</td>
    </tr>
    <tr>
      <td class="bg-light-blue">Mobile No</td>
      <td class="text-center">{{customer_mobile}}</td>
      <td class="bg-light-blue">Mktg SBU</td>
      <td class="text-center text-blue">{{mktg_sbu}}</td>
    </tr>
    <tr>
      <td class="bg-light-blue">Email Id</td>
      <td class="text-center text-blue">{{customer_email}}</td>
      <td class="bg-light-blue">Mktg Executive</td>
      <td class="text-center text-blue">{{mktg_executive}}</td>
    </tr>
    <tr>
      <td class="bg-light-blue">Contact Person</td>
      <td class="text-center"><strong>{{contact_person}}</strong></td>
      <td class="bg-light-blue">Tech SBU</td>
      <td class="text-center text-blue">{{tech_sbu}}</td>
    </tr>
    <tr>
      <td class="bg-light-blue">Designation</td>
      <td class="text-center">{{contact_designation}}</td>
      <td class="bg-light-blue">Tech Vertical</td>
      <td class="text-center text-blue">{{tech_vertical}}</td>
    </tr>
  </table>

  <!-- Services / Features Table -->
  <table class="form-table">
    <tr class="bg-blue-header">
      <th width="28%">Feature</th>
      <th width="32%">Description</th>
      <th width="12%">Duration</th>
      <th width="16%">Period</th>
      <th width="12%">Amount<br><span style="font-weight:normal;">In Rs.</span></th>
    </tr>
    <tr>
      <td>1. {{service_title}}</td>
      <td class="text-center">{{domain_url}}</td>
      <td class="text-center">1 Month</td>
      <td class="text-center">{{duration_period}}</td>
      <td class="text-right">{{subtotal}}</td>
    </tr>
    <tr>
      <td colspan="4" class="text-right font-bold bg-light-blue">Total</td>
      <td class="text-right text-blue">{{subtotal}}</td>
    </tr>
    <tr>
      <td colspan="4" class="text-right font-bold bg-light-blue">GST / Service Tax @ {{tax_percentage}}</td>
      <td class="text-right text-blue">{{tax_amount}}</td>
    </tr>
    <tr>
      <td colspan="4" class="text-right font-bold bg-light-blue">Grand Total</td>
      <td class="text-right text-blue"><strong>{{grand_total}}</strong></td>
    </tr>
  </table>

  <!-- Payment Terms Table -->
  <table class="form-table">
    <tr>
      <td width="30%" class="bg-light-blue">PAYMENT TERMS</td>
      <td width="70%" class="text-center"><strong>{{payment_terms_label}}</strong></td>
    </tr>
    <tr>
      <td class="bg-light-blue">Payment %</td>
      <td class="text-center">{{payment_percentage}}</td>
    </tr>
    <tr>
      <td class="bg-light-blue">Total Value in Rs.</td>
      <td class="text-center text-blue"><strong>{{grand_total}}</strong></td>
    </tr>
  </table>

  <!-- Terms and Conditions Block -->
  <div class="terms-section">
    <div class="terms-title">Terms and conditions :</div>
    <ol class="terms-list">
      <li>This order form is as an authorisation from the said client retaining the services of Trinetra for domain name registration, displaying the client's information on the Internet, hosting, designing, software application development and remitting foreign exchange for the same as applicable.</li>
      <li>Pricing may vary according to the clients demand for extra or special requirements or features, for which a separate order form will have to be issued. Also, prices may vary based on local currency fluctuations and Trinetra has the right to revise recurring pricing yearly depending on change in Domain registration / US server costs.</li>
      <li>Strict adherence to payment structure will enable Trinetra to provide prompt and effective service. Delayed payment or non-payment of payment charges / dues will lead to project stoppage / automatic account deactivation.</li>
      <li>Service Tax / GST is applicable and is charged accordingly in the order form. Sales Tax and other taxes at present are nil, if the Government imposes such direct / indirect taxes then same will be applicable over & above quoted price vide our invoice or supplementary invoice and to be paid for by client retrospectively.</li>
      <li>Trinetra will utilize its best efforts to maintain acceptable performance of services contracted for the various Packages, but Trinetra makes absolutely no warranties whatsoever, express or implied, including warranty of merchantability or fitness for a particular purpose. Trinetra cannot guarantee continuous service, service at any particular time, or integrity of data stored or transmitted via its system or via the Internet.</li>
      <li>All payments are to be made in the form of Cheque / Demand Draft - account payee in favour of Trinetra. All payments are non-refundable. All disputes are subject to Coimbatore Jurisdiction only.</li>
    </ol>
  </div>

  <!-- Signatures Table -->
  <table class="sig-table">
    <tr>
      <td width="50%">
        Authorised Signatory<br>
        <span style="font-weight:normal;">For Trinetra</span>
      </td>
      <td width="50%">
        Authorised Signatory<br>
        <span style="font-weight:normal;">For Customer</span>
      </td>
    </tr>
  </table>

  <!-- Official Footer Banner -->
  <div class="footer-banner">
    <div class="footer-logo">Trinetra</div>
    <table class="footer-row" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="left" valign="bottom">
        #1247 (Old # 1144) Trichy Road, Coimbatore - 641 045, India<br>
        <strong>Operations @ USA, CA, UK, UAE, IN, SG, HK, AU</strong><br>
        <a href="mailto:support@trinetrawireless.com" style="color:#002060;">support@trinetrawireless.com</a>
      </td>
        <td align="right" valign="bottom" style="text-align:right;">
        Tel : +91-422-2312707, 2313938<br>
        Fax : +91-422-2313936<br>
        Visit us at : <a href="https://www.trinetrawireless.com" target="_blank" style="color:#002060;">www.trinetrawireless.com</a> &nbsp;|&nbsp; Pg. 1/1
      </td>
      </tr>
    </table>
  </div>
</div>

</body>
</html>
`;

export async function seedTrinetraOrderFormTemplate() {
  try {
    const existing = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: { name: 'Trinetra Order Form & Customer Contract' },
    });

    let templateId: number;
    if (existing) {
      const updated = await (prisma as any).renewalNotificationTemplate.update({
        where: { id: existing.id },
        data: {
          category_code: 'CONTRACT',
          channel: 'EMAIL',
          subject: 'Trinetra Order Form & Customer Contract - {{order_number}}',
          body_html: TRINETRA_ORDER_FORM_HTML,
          compiled_html: TRINETRA_ORDER_FORM_HTML,
          is_active: true,
        },
      });
      templateId = updated.id;
      console.log('[seedTrinetraOrderFormTemplate] Updated existing Trinetra Order Form template ID:', templateId);
    } else {
      const created = await (prisma as any).renewalNotificationTemplate.create({
        data: {
          name: 'Trinetra Order Form & Customer Contract',
          category_code: 'CONTRACT',
          channel: 'EMAIL',
          subject: 'Trinetra Order Form & Customer Contract - {{order_number}}',
          body_html: TRINETRA_ORDER_FORM_HTML,
          compiled_html: TRINETRA_ORDER_FORM_HTML,
          is_active: true,
        },
      });
      templateId = created.id;
      console.log('[seedTrinetraOrderFormTemplate] Created new Trinetra Order Form template ID:', templateId);
    }

    // Map Parent Company #2 (Trinetra) to Trinetra Order Form template
    const trinetraCompany = await (prisma as any).company.findFirst({
      where: { name: { contains: 'Trinetra' } }
    });
    if (trinetraCompany) {
      await (prisma as any).company.update({
        where: { id: trinetraCompany.id },
        data: { order_form_template_id: templateId }
      });
      console.log(`[seedTrinetraOrderFormTemplate] Mapped Parent Company "${trinetraCompany.name}" (ID #${trinetraCompany.id}) -> Order Form Template ID #${templateId}`);
    }

    // Also map Parent Company #1 (Angler Technologies) to ANGLER Order Form template
    const anglerCompany = await (prisma as any).company.findFirst({
      where: { name: { contains: 'Angler' } }
    });
    const anglerTemplate = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: { name: 'ANGLER Order Form & Customer Contract' }
    });
    if (anglerCompany && anglerTemplate) {
      await (prisma as any).company.update({
        where: { id: anglerCompany.id },
        data: { order_form_template_id: anglerTemplate.id }
      });
      console.log(`[seedTrinetraOrderFormTemplate] Mapped Parent Company "${anglerCompany.name}" (ID #${anglerCompany.id}) -> Order Form Template ID #${anglerTemplate.id}`);
    }

  } catch (err) {
    console.error('[seedTrinetraOrderFormTemplate] Error seeding Trinetra order form template:', err);
  }
}

import { prisma } from '../lib/prisma';

export const ANGLER_ORDER_FORM_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 15px; }
  .contract-container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #333; padding: 10px; box-sizing: border-box; }
  .header-top { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; font-weight: bold; }
  .header-top a { color: #0056b3; text-decoration: underline; }
  .title-banner { background-color: #d9d9d9; text-align: center; font-size: 14px; font-weight: bold; padding: 5px; border: 1px solid #333; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
  
  table.form-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
  table.form-table td, table.form-table th { border: 1px solid #333; padding: 4px 6px; font-size: 11px; vertical-align: middle; }
  .bg-grey { background-color: #e9ecef; font-weight: bold; text-align: center; }
  .bg-light-grey { background-color: #f8f9fa; font-weight: bold; }
  .text-blue { color: #002060; font-weight: bold; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  
  .terms-section { margin-top: 8px; border: 1px solid #333; padding: 6px; font-size: 9.5px; line-height: 1.35; }
  .terms-title { font-weight: bold; margin-bottom: 4px; font-size: 10.5px; text-decoration: underline; }
  .terms-list { margin: 0; padding-left: 0; list-style-type: none; }
  .terms-list li { margin-bottom: 4px; text-align: justify; }

  .sig-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .sig-table td { border: 1px solid #333; height: 45px; vertical-align: bottom; text-align: center; font-size: 10px; font-weight: bold; padding-bottom: 4px; }
  
  .footer-banner { margin-top: 10px; border-top: 2px solid #002060; padding-top: 5px; font-size: 9px; line-height: 1.3; }
  .footer-logo { font-size: 16px; font-weight: bold; color: #002060; }
  .footer-row { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>

<div class="contract-container">
  <!-- Header Top Links -->
  <table class="header-top" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="left" style="font-size:11px;font-weight:bold;"><u>ANGLER Customer Contract</u></td>
      <td align="right" style="font-size:11px;font-weight:bold;"><a href="http://www.angleritech.com" target="_blank">www.angleritech.com</a></td>
    </tr>
  </table>

  <!-- Title Banner -->
  <div class="title-banner">ANGLER ORDER FORM</div>

  <!-- Customer & Internal Grid Table -->
  <table class="form-table">
    <tr>
      <td width="22%" class="bg-light-grey">Customer Name</td>
      <td width="43%" class="text-center text-blue"><strong>{{customer_name}}</strong></td>
      <td width="35%" colspan="2" class="bg-grey">To be filled by ANGLER Only</td>
    </tr>
    <tr>
      <td class="bg-light-grey">Address</td>
      <td class="text-center">{{customer_address}}</td>
      <td width="15%" class="bg-light-grey">Order #</td>
      <td width="20%" class="text-center text-blue">{{order_number}}</td>
    </tr>
    <tr>
      <td class="bg-light-grey">City & Pin Code</td>
      <td class="text-center">{{customer_city_pincode}}</td>
      <td class="bg-light-grey">Order Date</td>
      <td class="text-center text-blue">{{order_date}}</td>
    </tr>
    <tr>
      <td class="bg-light-grey">Phone No</td>
      <td class="text-center">{{customer_phone}}</td>
      <td class="bg-light-grey">Marketing Ref.</td>
      <td class="text-center text-blue">{{marketing_ref}}</td>
    </tr>
    <tr>
      <td class="bg-light-grey">Mobile No</td>
      <td class="text-center">{{customer_mobile}}</td>
      <td class="bg-light-grey">Mktg SBU</td>
      <td class="text-center text-blue">{{mktg_sbu}}</td>
    </tr>
    <tr>
      <td class="bg-light-grey">Email Id</td>
      <td class="text-center text-blue">{{customer_email}}</td>
      <td class="bg-light-grey">Mktg Executive</td>
      <td class="text-center text-blue">{{mktg_executive}}</td>
    </tr>
    <tr>
      <td class="bg-light-grey">Contact Person</td>
      <td class="text-center"><strong>{{contact_person}}</strong></td>
      <td class="bg-light-grey">Tech SBU</td>
      <td class="text-center text-blue">{{tech_sbu}}</td>
    </tr>
    <tr>
      <td class="bg-light-grey">Designation</td>
      <td class="text-center">{{contact_designation}}</td>
      <td class="bg-light-grey">Tech Vertical</td>
      <td class="text-center text-blue">{{tech_vertical}}</td>
    </tr>
  </table>

  <!-- Services / Features Table -->
  <table class="form-table">
    <tr class="bg-grey">
      <th width="30%">Feature</th>
      <th width="30%">Description</th>
      <th width="12%">Duration</th>
      <th width="16%">Period</th>
      <th width="12%">Amount<br><span style="font-weight:normal;">In Rs.</span></th>
    </tr>
    <tr>
      <td>1. {{service_title}}</td>
      <td class="text-center"><a href="http://{{domain_url}}" target="_blank" style="color:#0056b3;">{{domain_url}}</a></td>
      <td class="text-center">1 year</td>
      <td class="text-center">{{duration_period}}</td>
      <td class="text-right">{{subtotal}}</td>
    </tr>
    <tr>
      <td colspan="4" class="text-right font-bold bg-light-grey">Total</td>
      <td class="text-right text-blue">{{subtotal}}</td>
    </tr>
    <tr>
      <td colspan="4" class="text-right font-bold bg-light-grey">Service Tax / GST @ {{tax_percentage}}</td>
      <td class="text-right text-blue">{{tax_amount}}</td>
    </tr>
    <tr>
      <td colspan="4" class="text-right font-bold bg-light-grey">Grand Total</td>
      <td class="text-right text-blue"><strong>{{grand_total}}</strong></td>
    </tr>
  </table>

  <!-- Payment Terms Table -->
  <table class="form-table">
    <tr>
      <td width="30%" class="bg-light-grey">PAYMENT TERMS</td>
      <td width="70%" class="text-center"><strong>{{payment_terms_label}}</strong></td>
    </tr>
    <tr>
      <td class="bg-light-grey">Payment %</td>
      <td class="text-center">{{payment_percentage}}</td>
    </tr>
    <tr>
      <td class="bg-light-grey">Total Value in Rs.</td>
      <td class="text-center text-blue"><strong>{{grand_total}}</strong></td>
    </tr>
  </table>

  <!-- Terms and Conditions Block -->
  <div class="terms-section">
    <div class="terms-title">Terms and conditions :</div>
    <ol class="terms-list" style="padding-left:14px; list-style-type: decimal;">
      <li>This order form is as an authorisation from the said client retaining the services of ANGLER Technologies India Pvt Ltd., (ANGLER) for domain name registration, displaying the client 's information on the Internet, hosting, designing, software application development and remitting foreign exchange for the same as applicable.</li>
      <li>Pricing may vary according to the clients demand for extra or special requirements or features, for which a separate order form will have to be issued. Also, prices may vary based on local currency fluctuations and ANGLER has the right to revise recurring pricing yearly depending on change in Domain registration / US server costs.</li>
      <li>Strict adherence to payment structure will enable ANGLER to provide prompt and effective service. Delayed payment or non-payment of payment charges / dues will lead to project stoppage / automatic account deactivation.</li>
      <li>Service Tax / GST is applicable and is charged accordingly in the order form. Sales Tax and other taxes at present are nil, if the Government imposes such direct / indirect taxes (other than Service Tax) then same will be applicable over & above quoted price vide our invoice or supplementary invoice and to be paid for by client retrospectively.</li>
      <li>ANGLER will utilize its best efforts to maintain acceptable performance of services contracted for the various Packages, but ANGLER makes absolutely no warranties whatsoever, express or implied, including warranty of merchantability or fitness for a particular purpose. ANGLER cannot guarantee continuous service, service at any particular time, or integrity of data stored or transmitted via its system or via the Internet.</li>
      <li>All payments are to be made in the form of Cheque / Demand Draft / NEFT - account payee in favour of ANGLER Technologies India Pvt Ltd., Coimbatore. All payments are non-refundable. All disputes are subject to Coimbatore Jurisdiction only.</li>
    </ol>
  </div>

  <!-- Signatures Table -->
  <table class="sig-table">
    <tr>
      <td width="50%">
        Authorised Signatory<br>
        <span style="font-weight:normal;">For ANGLER Technologies India Pvt Ltd</span>
      </td>
      <td width="50%">
        Authorised Signatory<br>
        <span style="font-weight:normal;">For Customer</span>
      </td>
    </tr>
  </table>

  <!-- Official Footer Banner -->
  <div class="footer-banner">
    <div class="footer-logo">ANGLER Technologies India Pvt Ltd.,</div>
    <table class="footer-row" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="left" valign="bottom">
        #1247 (Old # 1144) Trichy Road, Coimbatore - 641 045, India<br>
        <strong>Operations @ USA, CA, UK, UAE, IN, SG, HK, AU</strong><br>
        <a href="mailto:support@angleritech.com" style="color:#0056b3;">support@angleritech.com</a>
      </td>
        <td align="right" valign="bottom" style="text-align:right;">
        Tel : +91-422-2312707, 2313938<br>
        Fax : +91-422-2313936<br>
        Visit us at : <a href="http://www.angleritech.com" target="_blank" style="color:#0056b3;">www.angleritech.com</a> &nbsp;|&nbsp; Pg. 1/1
      </td>
      </tr>
    </table>
  </div>
</div>

</body>
</html>
`;

export async function seedOrderFormTemplate() {
  try {
    const existing = await (prisma as any).renewalNotificationTemplate.findFirst({
      where: { name: 'ANGLER Order Form & Customer Contract' },
    });

    if (existing) {
      await (prisma as any).renewalNotificationTemplate.update({
        where: { id: existing.id },
        data: {
          category_code: 'CONTRACT',
          channel: 'EMAIL',
          subject: 'ANGLER Order Form & Customer Contract - {{order_number}}',
          body_html: ANGLER_ORDER_FORM_HTML,
          compiled_html: ANGLER_ORDER_FORM_HTML,
          is_active: true,
        },
      });
      console.log('[seedOrderFormTemplate] Updated existing ANGLER Order Form template ID:', existing.id);
    } else {
      const created = await (prisma as any).renewalNotificationTemplate.create({
        data: {
          name: 'ANGLER Order Form & Customer Contract',
          category_code: 'CONTRACT',
          channel: 'EMAIL',
          subject: 'ANGLER Order Form & Customer Contract - {{order_number}}',
          body_html: ANGLER_ORDER_FORM_HTML,
          compiled_html: ANGLER_ORDER_FORM_HTML,
          is_active: true,
        },
      });
      console.log('[seedOrderFormTemplate] Created new ANGLER Order Form template ID:', created.id);
    }
  } catch (err) {
    console.error('[seedOrderFormTemplate] Error seeding order form template:', err);
  }
}

import { PrismaClient } from './v2-client';
import { ensureResponsiveEmailHtml } from '../src/utils/emailHtmlCompatibility';
const prisma = new PrismaClient();

function getBankDetailsTable() {
  return `
    <table width="100%" style="border: 1px solid #e2e8f0; border-collapse: collapse; margin-top: 15px; font-size: 13px; color: #334155;">
      <tr bgcolor="#f8fafc"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;" width="40%">Company Name</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">ANGLER Technologies India Pvt Ltd</td></tr>
      <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Name of Bank</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">HDFC Bank Ltd</td></tr>
      <tr bgcolor="#f8fafc"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Bank Branch Name</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Trichy Road Branch</td></tr>
      <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Branch Address</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Coimbatore, Tamil Nadu, India</td></tr>
      <tr bgcolor="#f8fafc"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">SWIFT CODE</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">HDFCINBBXXX</td></tr>
      <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">IFSC CODE</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">HDFC0000031</td></tr>
      <tr bgcolor="#f8fafc"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Account Number</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">00312000001234</td></tr>
    </table>
  `;
}

function getServiceTable(serviceDesc: string, serviceType: string) {
  return `
    <table width="100%" style="border: 1px solid #e2e8f0; border-collapse: collapse; margin-top: 15px; font-size: 13px; color: #334155;">
      <thead>
        <tr bgcolor="#f1f5f9" style="font-weight: bold; text-align: left;">
          <th style="padding: 10px; border: 1px solid #e2e8f0;">Service</th>
          <th style="padding: 10px; border: 1px solid #e2e8f0;">Service Type</th>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Subtotal</th>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">GST @ 18%</th>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Total</th>
          <th style="padding: 10px; border: 1px solid #e2e8f0;">Expiry Date</th>
          <th style="padding: 10px; border: 1px solid #e2e8f0;">Term</th>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Days to Expiry</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${serviceDesc} for the domain {{identifier}}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${serviceType}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">&#8377;{{subtotal}}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">&#8377;{{gst}}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f766e;">&#8377;{{total}}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">{{expiry_date}}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">{{term}}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #b91c1c;">{{days_remaining}}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function getFAQSection() {
  return `
    <div style="margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
      <h3 style="margin: 0 0 10px 0; color: #b91c1c; font-size: 14px; font-weight: bold;">What if I don't renew the services?</h3>
      <ol style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong>Service Suspension:</strong> The services will be automatically suspended and stop functioning. All associated services related to the suspended services, such as email, website, or applications will stop functioning.</li>
        <li><strong>Redemption Period Cost:</strong> Domains not renewed even in the grace period enter into the redemption period and you may have to pay an additional up to 10 times redemption cost along with the renewal cost to retrieve your domain.</li>
      </ol>
    </div>
  `;
}

const templates = [
  {
    name: 'Covering Mail — Domain & Server Renewal',
    category_code: 'DOMAIN_SERVER',
    channel: 'EMAIL',
    subject: 'Renewal Reminder: Your domain & Server is about to expire - {{identifier}}',
    body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #074388; color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Renewal Reminder</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">renewals@angleritech.com | +91-422-2312707</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; line-height: 1.6; font-size: 14px; color: #334155;">
          <p>Dear Mr. {{customer_name}},</p>
          <p>M/s. {{company_name}}</p>
          <p>The domain(s) and server listed below are due for renewal within next {{days_remaining}} days.</p>
          
          ${getServiceTable('Domain & Server Renewal', 'Domain & Server')}
          
          <p style="margin-top: 20px;">Please find the attached Order Form for Domain & Server Renewal and request you to kindly arrange to send the signed order form for our official records along with payment.</p>
          <p>Kindly renew by paying <strong>&#8377;{{total}}/-</strong> by cheque/DD in favor of <strong>ANGLER Technologies India Pvt Ltd</strong> (or)</p>
          <p>You can also transfer the payment via Online and the Bank details are given below for your kind reference:</p>
          
          <h4 style="margin: 20px 0 5px 0; color: #074388;">Bank Details for Online Payment Transfer:</h4>
          ${getBankDetailsTable()}
          
          <p style="margin-top: 15px; font-weight: bold; color: #b91c1c;">Kindly note that the renewal process should be done at least 20 days before the expiry date.</p>
          <p>Expecting your early action in this regard.</p>
          
          ${getFAQSection()}
        </div>
        <div style="background-color: #f8fafc; padding: 15px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          Regards,<br/><strong>Team Angler</strong><br/>ANGLER Technologies India Pvt. Ltd
        </div>
      </div>
    `
  },
  {
    name: 'Covering Mail — Domain Renewal',
    category_code: 'DOMAIN',
    channel: 'EMAIL',
    subject: 'Renewal Reminder: Your domain services are about to expire - {{identifier}}',
    body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #074388; color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Renewal Reminder</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">renewals@angleritech.com | +91-422-2312707</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; line-height: 1.6; font-size: 14px; color: #334155;">
          <p>Dear Mr. {{customer_name}},</p>
          <p>M/s. {{company_name}}</p>
          <p>The domain(s) listed below are due for renewal within next {{days_remaining}} days.</p>
          
          ${getServiceTable('Domain Renewal', 'Domain')}
          
          <p style="margin-top: 20px;">Please find the attached Order Form for Domain Renewal and request you to kindly arrange to send the signed order form for our official records along with payment.</p>
          <p>Kindly renew by paying <strong>&#8377;{{total}}/-</strong> by cheque/DD in favor of <strong>ANGLER Technologies India Pvt Ltd</strong> (or)</p>
          <p>You can also transfer the payment via Online and the Bank details are given below for your kind reference:</p>
          
          <h4 style="margin: 20px 0 5px 0; color: #074388;">Bank Details for Online Payment Transfer:</h4>
          ${getBankDetailsTable()}
          
          <p style="margin-top: 15px; font-weight: bold; color: #b91c1c;">Kindly note that the renewal process should be done at least 20 days before the expiry date.</p>
          <p>Expecting your early action in this regard.</p>
          
          ${getFAQSection()}
        </div>
        <div style="background-color: #f8fafc; padding: 15px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          Regards,<br/><strong>Team Angler</strong><br/>ANGLER Technologies India Pvt. Ltd
        </div>
      </div>
    `
  },
  {
    name: 'Covering Mail — Domain, Server, AMC & G Suite',
    category_code: 'DOMAIN_SERVER_AMC_GSUITE',
    channel: 'EMAIL',
    subject: 'Renewal Reminder: Your domain, Server, AMC & G Suite services are about to expire - {{identifier}}',
    body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #074388; color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Renewal Reminder</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">renewals@angleritech.com | +91-422-2312707</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; line-height: 1.6; font-size: 14px; color: #334155;">
          <p>Dear Mr. {{customer_name}},</p>
          <p>M/s. {{company_name}}</p>
          <p>The domain, server, AMC & G Suite services listed below are due for renewal within next {{days_remaining}} days.</p>
          
          ${getServiceTable('Domain, Server, AMC & G Suite Renewal', 'Domain, Server, AMC & G Suite')}
          
          <p style="margin-top: 20px;">Please find the attached Order Form for Domain, Server, AMC & G Suite Renewal and request you to kindly arrange to send the signed order form for our official records along with payment.</p>
          <p>Kindly renew by paying <strong>&#8377;{{total}}/-</strong> by cheque/DD in favor of <strong>ANGLER Technologies India Pvt Ltd</strong> (or)</p>
          <p>You can also transfer the payment via Online and the Bank details are given below for your kind reference:</p>
          
          <h4 style="margin: 20px 0 5px 0; color: #074388;">Bank Details for Online Payment Transfer:</h4>
          ${getBankDetailsTable()}
          
          <p style="margin-top: 15px; font-weight: bold; color: #b91c1c;">Kindly note that the renewal process should be done at least 20 days before the expiry date.</p>
          <p>Expecting your early action in this regard.</p>
          
          ${getFAQSection()}
        </div>
        <div style="background-color: #f8fafc; padding: 15px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          Regards,<br/><strong>Team Angler</strong><br/>ANGLER Technologies India Pvt. Ltd
        </div>
      </div>
    `
  },
  {
    name: 'Covering Mail — Domain, Server, AMC & SSL',
    category_code: 'DOMAIN_SERVER_AMC_SSL',
    channel: 'EMAIL',
    subject: 'Renewal Reminder: Your domain, Server, AMC & SSL services are about to expire - {{identifier}}',
    body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #074388; color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Renewal Reminder</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">renewals@angleritech.com | +91-422-2312707</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; line-height: 1.6; font-size: 14px; color: #334155;">
          <p>Dear Mr. {{customer_name}},</p>
          <p>M/s. {{company_name}}</p>
          <p>The domain, server, AMC & SSL services listed below are due for renewal within next {{days_remaining}} days.</p>
          
          ${getServiceTable('Domain, Server, AMC & SSL Renewal', 'Domain, Server, AMC & SSL')}
          
          <p style="margin-top: 20px;">Please find the attached Order Form for Domain, Server, AMC & SSL Renewal and request you to kindly arrange to send the signed order form for our official records along with payment.</p>
          <p>Kindly renew by paying <strong>&#8377;{{total}}/-</strong> by cheque/DD in favor of <strong>ANGLER Technologies India Pvt Ltd</strong> (or)</p>
          <p>You can also transfer the payment via Online and the Bank details are given below for your kind reference:</p>
          
          <h4 style="margin: 20px 0 5px 0; color: #074388;">Bank Details for Online Payment Transfer:</h4>
          ${getBankDetailsTable()}
          
          <p style="margin-top: 15px; font-weight: bold; color: #b91c1c;">Kindly note that the renewal process should be done at least 20 days before the expiry date.</p>
          <p>Expecting your early action in this regard.</p>
          
          ${getFAQSection()}
        </div>
        <div style="background-color: #f8fafc; padding: 15px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          Regards,<br/><strong>Team Angler</strong><br/>ANGLER Technologies India Pvt. Ltd
        </div>
      </div>
    `
  },
  {
    name: 'Covering Mail — Service Suspension Notice',
    category_code: 'SUSPENSION',
    channel: 'EMAIL',
    subject: '⚠️ Service Suspended Notice: Action Required - {{identifier}}',
    body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #fca5a5; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #dc2626; color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">⚠️ Service Suspended</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">renewals@angleritech.com | +91-422-2312707</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; line-height: 1.6; font-size: 14px; color: #334155;">
          <p>Dear {{customer_name}},</p>
          <p style="font-size: 16px; font-weight: bold; color: #dc2626;">Your Service is Suspended.</p>
          <p>This is to inform you that your service has now been suspended due to non-payment. The details of the suspended service are given below:</p>
          
          <table width="100%" style="border: 1px solid #fca5a5; border-collapse: collapse; margin: 20px 0; font-size: 13px; color: #334155;">
            <tr bgcolor="#fef2f2"><td style="padding: 10px; border: 1px solid #fca5a5; font-weight: bold;" width="35%">Product/Service</td><td style="padding: 10px; border: 1px solid #fca5a5;">{{service_name}} ({{identifier}})</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #fca5a5; font-weight: bold;">Due Date</td><td style="padding: 10px; border: 1px solid #fca5a5; color: #b91c1c; font-weight: bold;">{{expiry_date}}</td></tr>
            <tr bgcolor="#fef2f2"><td style="padding: 10px; border: 1px solid #fca5a5; font-weight: bold;">Suspension Reason</td><td style="padding: 10px; border: 1px solid #fca5a5; font-weight: bold; color: #b91c1c;">Due to Non Payment</td></tr>
          </table>
          
          <h3 style="color: #dc2626; font-size: 15px; margin-top: 25px;">How do I reactivate my service?</h3>
          <p>In order to get this service reactivated, kindly drop a mail to <a href="mailto:renewals@angleritech.com" style="color: #074388; font-weight: bold; text-decoration: none;">renewals@angleritech.com</a> as soon as possible and confirm payment expected date for renewal.</p>
          
          <p style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; font-size: 13px; color: #b45309; margin-top: 20px;">
            <strong>IMPORTANT:</strong> Domains not renewed even in the grace period enter into the redemption period and you may have to pay an additional up to 10 times redemption cost along with the renewal cost to retrieve your domain.
          </p>
          
          <p style="margin-top: 20px;">If you have any feedback or queries, please let us know by replying to this mail. Your feedback will help us in improving our support system.</p>
          <p>Remember, we are always an email or call away when you need help.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          Regards,<br/><strong>Team Angler</strong><br/>ANGLER Technologies India Pvt. Ltd
        </div>
      </div>
    `
  },
  {
    name: 'Covering Mail — Deactivation Warning Notice',
    category_code: 'DEACTIVATION',
    channel: 'EMAIL',
    subject: '⚠️ WARNING: Your services are about to be deactivated - {{identifier}}',
    body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #1e293b; color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Deactivation Reminder</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">renewals@angleritech.com | +91-422-2312707</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; line-height: 1.6; font-size: 14px; color: #334155;">
          <p>Dear Mr. {{customer_name}},</p>
          <p style="font-size: 16px; font-weight: bold; color: #b91c1c;">Your services are about to be deactivated.</p>
          <p>The services listed below have been suspended and will be deactivated soon. Kindly renew them to avoid permanent deactivation.</p>
          
          ${getServiceTable('Domain Deactivation Warning', 'Domain')}
          
          <h4 style="margin: 25px 0 5px 0; color: #0f766e;">Bank Details for Online Payment Transfer:</h4>
          ${getBankDetailsTable()}
          
          <h4 style="margin: 20px 0 5px 0; color: #0f766e;">Offline Payment:</h4>
          <p>You can make the payment via Cheque or Demand draft in the name of <strong>ANGLER Technologies India Pvt. Ltd</strong>.</p>
          
          ${getFAQSection()}
        </div>
        <div style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          Regards,<br/><strong>Team Angler</strong><br/>ANGLER Technologies India Pvt. Ltd
        </div>
      </div>
    `
  }
];

async function main() {
  console.log('Seeding custom Excel Covering Mail templates into DB...');
  let seededCount = 0;
  for (const tmpl of templates) {
    const ex = await (prisma as any).renewalNotificationTemplate.findFirst({ where: { name: tmpl.name } });
    if (ex) {
      // Overwrite/Update to ensure exact HTML matches what was parsed
      await (prisma as any).renewalNotificationTemplate.update({
        where: { id: ex.id },
        data: {
          category_code: tmpl.category_code,
          subject: tmpl.subject,
          body_html: ensureResponsiveEmailHtml(tmpl.body_html),
          compiled_html: ensureResponsiveEmailHtml(tmpl.body_html),
          variables: JSON.stringify(['customer_name', 'company_name', 'service_name', 'identifier', 'subtotal', 'gst', 'total', 'expiry_date', 'term', 'days_remaining', 'account_manager']),
          is_active: true
        }
      });
      console.log(`  Updated existing template: ${tmpl.name}`);
      seededCount++;
    } else {
      const cr = await (prisma as any).renewalNotificationTemplate.create({
        data: {
          name: tmpl.name,
          category_code: tmpl.category_code,
          channel: tmpl.channel,
          subject: tmpl.subject,
          body_html: ensureResponsiveEmailHtml(tmpl.body_html),
          compiled_html: ensureResponsiveEmailHtml(tmpl.body_html),
          variables: JSON.stringify(['customer_name', 'company_name', 'service_name', 'identifier', 'subtotal', 'gst', 'total', 'expiry_date', 'term', 'days_remaining', 'account_manager']),
          is_active: true
        }
      });
      console.log(`  Seeded new template: ${tmpl.name} [ID: ${cr.id}]`);
      seededCount++;
    }
  }
  console.log(`\nSeeded ${seededCount} covering mail templates successfully.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error seeding templates:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});

import { prisma } from '../src/lib/prisma';
import { ensureResponsiveEmailHtml } from '../src/utils/emailHtmlCompatibility';

const STANDARD_TEMPLATES = [
  {
    name: 'Domain Renewal — 30 Days Notice',
    category_code: 'DOMAIN',
    channel: 'EMAIL',
    subject: 'Action Required: {{domain_url}} renews in 30 days',
    body_html: `
      <table width="600" align="center" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <tr>
          <td bgcolor="#074388" style="padding: 20px; color: #ffffff; font-size: 20px; font-weight: bold;">
            Angler iTech Solutions
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 0;">Domain Renewal Reminder</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Dear {{customer_name}},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              This is a reminder that your domain name <strong>{{domain_url}}</strong> is due for renewal on <strong>{{expiry_date}}</strong> (in 30 days).
            </p>
            <table width="100%" style="background-color: #f8fafc; border-radius: 8px; margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 15px; font-size: 14px; color: #475569;">
                  <strong>Domain:</strong> {{domain_url}}<br/>
                  <strong>Expiry Date:</strong> {{expiry_date}}<br/>
                  <strong>Amount Due:</strong> {{amount_due}}
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Please contact us to confirm your renewal and avoid any service interruptions.
            </p>
            <table align="center" style="margin-top: 25px;">
              <tr>
                <td bgcolor="#074388" style="border-radius: 6px; text-align: center;">
                  <a href="#" style="padding: 10px 20px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">Renew Domain Now</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f1f5f9" style="padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            {{sender_name}} · Your Technology Partner
          </td>
        </tr>
      </table>
    `,
    is_active: true
  },
  {
    name: 'Domain Renewal — 15 Days Notice',
    category_code: 'DOMAIN',
    channel: 'EMAIL',
    subject: '⚠️ {{domain_url}} — 15 Days to Renewal',
    body_html: `
      <table width="600" align="center" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <tr>
          <td bgcolor="#b45309" style="padding: 20px; color: #ffffff; font-size: 20px; font-weight: bold;">
            Angler iTech Solutions
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 0;">Urgent: 15 Days Until Domain Expiry</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Dear {{customer_name}},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Your domain <strong>{{domain_url}}</strong> is expiring in 15 days on <strong>{{expiry_date}}</strong>.
            </p>
            <table width="100%" style="background-color: #fdf8f6; border-radius: 8px; margin: 20px 0; border-collapse: collapse; border: 1px solid #ffedd5;">
              <tr>
                <td style="padding: 15px; font-size: 14px; color: #7c2d12;">
                  <strong>Domain:</strong> {{domain_url}}<br/>
                  <strong>Expiry Date:</strong> {{expiry_date}}<br/>
                  <strong>Amount Due:</strong> {{amount_due}}
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              To ensure your website, email, and related services continue operating without interruption, please proceed with the renewal.
            </p>
            <table align="center" style="margin-top: 25px;">
              <tr>
                <td bgcolor="#b45309" style="border-radius: 6px; text-align: center;">
                  <a href="#" style="padding: 10px 20px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">Renew Domain Now</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f1f5f9" style="padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            {{sender_name}} · Your Technology Partner
          </td>
        </tr>
      </table>
    `,
    is_active: true
  },
  {
    name: 'Domain Suspension Warning',
    category_code: 'DOMAIN',
    channel: 'EMAIL',
    subject: 'URGENT: {{domain_url}} will be suspended',
    body_html: `
      <table width="600" align="center" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <tr>
          <td bgcolor="#dc2626" style="padding: 20px; color: #ffffff; font-size: 20px; font-weight: bold;">
            Angler iTech Solutions
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: bold; color: #b91c1c; margin-top: 0;">IMMEDIATE ACTION REQUIRED: Suspension Warning</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Dear {{customer_name}},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Your domain <strong>{{domain_url}}</strong> has expired or is on the verge of suspension.
            </p>
            <table width="100%" style="background-color: #fef2f2; border-radius: 8px; margin: 20px 0; border-collapse: collapse; border: 1px solid #fee2e2;">
              <tr>
                <td style="padding: 15px; font-size: 14px; color: #991b1b;">
                  <strong>Domain:</strong> {{domain_url}}<br/>
                  <strong>Expiry/Suspension Date:</strong> {{expiry_date}}<br/>
                  <strong>Renewal Amount:</strong> {{amount_due}}
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Failure to renew immediately will result in complete loss of website access, email bounce-backs, and potential release of the domain to the public registry.
            </p>
            <table align="center" style="margin-top: 25px;">
              <tr>
                <td bgcolor="#dc2626" style="border-radius: 6px; text-align: center;">
                  <a href="#" style="padding: 10px 20px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">Renew Domain Immediately</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f1f5f9" style="padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            {{sender_name}} · Your Technology Partner
          </td>
        </tr>
      </table>
    `,
    is_active: true
  },
  {
    name: 'Server Renewal — 30 Days Notice',
    category_code: 'SERVER',
    channel: 'EMAIL',
    subject: 'Server Renewal Reminder — {{identifier}} expires in 30 days',
    body_html: `
      <table width="600" align="center" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <tr>
          <td bgcolor="#074388" style="padding: 20px; color: #ffffff; font-size: 20px; font-weight: bold;">
            Angler iTech Solutions
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 0;">Server / Host VPS Renewal Notice</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Dear {{customer_name}},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              This is a notification that your server hosting plan for <strong>{{domain_url}}</strong> (Server Ref: {{identifier}}) is due for renewal on <strong>{{expiry_date}}</strong>.
            </p>
            <table width="100%" style="background-color: #f8fafc; border-radius: 8px; margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 15px; font-size: 14px; color: #475569;">
                  <strong>Server Asset:</strong> {{identifier}} / {{domain_url}}<br/>
                  <strong>Renewal Date:</strong> {{expiry_date}}<br/>
                  <strong>Renewal Cost:</strong> {{amount_due}}
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Renewing keeps your server performance optimal, backups active, and prevents server downtime.
            </p>
            <table align="center" style="margin-top: 25px;">
              <tr>
                <td bgcolor="#074388" style="border-radius: 6px; text-align: center;">
                  <a href="#" style="padding: 10px 20px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">Pay Server Renewal</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f1f5f9" style="padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            {{sender_name}} · Your Technology Partner
          </td>
        </tr>
      </table>
    `,
    is_active: true
  },
  {
    name: 'SSL Certificate Renewal Notice',
    category_code: 'SSL',
    channel: 'EMAIL',
    subject: '🔒 SSL Certificate Renewal: {{domain_url}}',
    body_html: `
      <table width="600" align="center" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <tr>
          <td bgcolor="#059669" style="padding: 20px; color: #ffffff; font-size: 20px; font-weight: bold;">
            Angler iTech Solutions
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 0;">SSL Certificate Expiry Warning</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Dear {{customer_name}},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              The SSL Certificate ensuring secure connections (HTTPS) on <strong>{{domain_url}}</strong> is expiring on <strong>{{expiry_date}}</strong>.
            </p>
            <table width="100%" style="background-color: #ecfdf5; border-radius: 8px; margin: 20px 0; border-collapse: collapse; border: 1px solid #d1fae5;">
              <tr>
                <td style="padding: 15px; font-size: 14px; color: #065f46;">
                  <strong>Domain:</strong> {{domain_url}}<br/>
                  <strong>Expiry Date:</strong> {{expiry_date}}<br/>
                  <strong>Amount Due:</strong> {{amount_due}}
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              SSL renewals are critical to prevent browsers from showing security warnings ('Your connection is not private') to your users.
            </p>
            <table align="center" style="margin-top: 25px;">
              <tr>
                <td bgcolor="#059669" style="border-radius: 6px; text-align: center;">
                  <a href="#" style="padding: 10px 20px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">Renew SSL Certificate</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f1f5f9" style="padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            {{sender_name}} · Your Technology Partner
          </td>
        </tr>
      </table>
    `,
    is_active: true
  },
  {
    name: 'G-Suite & Email Services Renewal',
    category_code: 'EMAIL',
    channel: 'EMAIL',
    subject: 'Email Services Renewal — {{customer_name}}',
    body_html: `
      <table width="600" align="center" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <tr>
          <td bgcolor="#074388" style="padding: 20px; color: #ffffff; font-size: 20px; font-weight: bold;">
            Angler iTech Solutions
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 0;">Email Workspace Services Renewal</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Dear {{customer_name}},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Your business email/Google Workspace accounts for domain <strong>{{domain_url}}</strong> are scheduled for renewal on <strong>{{expiry_date}}</strong>.
            </p>
            <table width="100%" style="background-color: #f8fafc; border-radius: 8px; margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 15px; font-size: 14px; color: #475569;">
                  <strong>Service:</strong> Business Email Workspace<br/>
                  <strong>Expiry Date:</strong> {{expiry_date}}<br/>
                  <strong>Renewal Cost:</strong> {{amount_due}}
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Please complete renewal to prevent mail service suspension and backup storage locking.
            </p>
            <table align="center" style="margin-top: 25px;">
              <tr>
                <td bgcolor="#074388" style="border-radius: 6px; text-align: center;">
                  <a href="#" style="padding: 10px 20px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">Renew Workspace</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f1f5f9" style="padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            {{sender_name}} · Your Technology Partner
          </td>
        </tr>
      </table>
    `,
    is_active: true
  },
  {
    name: 'Annual Maintenance Contract Renewal',
    category_code: 'AMC',
    channel: 'EMAIL',
    subject: 'AMC Renewal Reminder — Due in 30 Days',
    body_html: `
      <table width="600" align="center" style="border: 1px solid #e2e8f0; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <tr>
          <td bgcolor="#7c3aed" style="padding: 20px; color: #ffffff; font-size: 20px; font-weight: bold;">
            Angler iTech Solutions
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 0;">Annual Maintenance Contract (AMC) Renewal</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Dear {{customer_name}},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              This is to inform you that your AMC services (Contract ID: {{identifier}}) are due for renewal on <strong>{{expiry_date}}</strong>.
            </p>
            <table width="100%" style="background-color: #f5f3ff; border-radius: 8px; margin: 20px 0; border-collapse: collapse; border: 1px solid #ddd6fe;">
              <tr>
                <td style="padding: 15px; font-size: 14px; color: #5b21b6;">
                  <strong>Contract ID:</strong> {{identifier}}<br/>
                  <strong>Renewal Date:</strong> {{expiry_date}}<br/>
                  <strong>AMC Amount:</strong> {{amount_due}}
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Please review the contract details and process the payment to ensure uninterrupted support, SLA commitments, and preventive maintenance visits.
            </p>
            <table align="center" style="margin-top: 25px;">
              <tr>
                <td bgcolor="#7c3aed" style="border-radius: 6px; text-align: center;">
                  <a href="#" style="padding: 10px 20px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">Approve AMC Renewal</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f1f5f9" style="padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            {{sender_name}} · Your Technology Partner
          </td>
        </tr>
      </table>
    `,
    is_active: true
  },
  {
    name: 'Trinetra Renewal Reminder - FMS License',
    category_code: 'SUPPORT',
    channel: 'EMAIL',
    subject: 'Renewal Reminder: Your FMS Software License is about to expire',
    body_html: `
      <div style="max-width: 750px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #ccc; padding: 15px; background: #fff;">
        <table width="100%" style="margin-bottom: 15px;">
          <tr>
            <td>
              <img src="{{logo_url}}" alt="Trinetra" style="max-height: 45px; display: block;" onError="this.style.display='none'" />
              <div style="font-weight: bold; font-size: 18px; color: #002060;">trinetra</div>
              <div style="font-size: 10px; color: #555;">Fleet Management, Mobility & IoT Solutions</div>
            </td>
            <td align="right" style="font-size: 12px; color: #002060;">
              <a href="mailto:renewals@trinetrawireless.com" style="color: #002060; text-decoration: underline;">renewals@trinetrawireless.com</a><br/>
              <strong>+91-422-2321307</strong>
            </td>
          </tr>
        </table>
        <div style="background-color: #0f2942; color: #fff; padding: 12px; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: normal;">Renewal Reminder</h2>
          <h3 style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold;">Your FMS Software License is about to expire.</h3>
        </div>
        <p style="font-size: 12px; color: #333; margin: 5px 0;">Dear Mr. <strong>{{contact_person}}</strong>,</p>
        <p style="font-size: 12px; color: #333; margin: 5px 0;"><strong>M/s. {{company_name}}</strong></p>
        <p style="font-size: 12px; color: #333;">FMS software license details are listed below and the due for renewal within next <strong>{{days_left}} Days</strong>.</p>
        <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; font-size: 11px; text-align: center; border-color: #ccc; margin: 15px 0;">
          <tr bgcolor="#f2f2f2" style="font-weight: bold; color: #333;">
            <th>Service</th>
            <th>Device Id</th>
            <th>No. of Device</th>
            <th>Unit Cost (Rs.)</th>
            <th>Subtotal (Rs.)</th>
            <th>GST @18%</th>
            <th>Total (Rs.)</th>
            <th>Expiry Date</th>
            <th>Term</th>
            <th>Days To Expiry</th>
          </tr>
          <tr>
            <td align="left">{{service_name}}</td>
            <td>{{device_id}}</td>
            <td>{{quantity}}</td>
            <td>{{unit_cost}}</td>
            <td>{{subtotal}}</td>
            <td>{{gst}}</td>
            <td>{{total}}</td>
            <td style="color: red; font-weight: bold;">{{expiry_date}}</td>
            <td>Yearly</td>
            <td style="color: red; font-weight: bold;">{{days_left}} Day(s)</td>
          </tr>
        </table>
        <p style="font-size: 11px; color: #333;">Please find the attached Order Form for Trinetra FMS Software License Renewal and kindly request you to send the order form duly signed along with the payment</p>
        <p style="font-size: 11px; font-weight: bold; text-decoration: underline; margin-top: 15px;">Bank details for online payment transfer:</p>
        <table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; font-size: 11px; border-color: #ccc; margin-bottom: 15px;">
          <tr bgcolor="#d9d9d9"><th colspan="2" style="text-align: center; text-transform: uppercase;">TRINETRA BANK DETAILS</th></tr>
          <tr><td width="30%" bgcolor="#f9f9f9">Company Name</td><td>TRINETRA Wireless Pvt Ltd</td></tr>
          <tr><td bgcolor="#f9f9f9">Name of Bank</td><td>State Bank of India</td></tr>
          <tr><td bgcolor="#f9f9f9">Bank Branch Name</td><td>Red Fields Branch</td></tr>
          <tr><td bgcolor="#f9f9f9">Branch Address</td><td>1114C, Trichy Road, Coimbatore - 641 045. India.</td></tr>
          <tr><td bgcolor="#f9f9f9">IFSC CODE</td><td>SBIN0006577</td></tr>
          <tr><td bgcolor="#f9f9f9">Account Number</td><td>30995705595</td></tr>
        </table>
        <p style="font-size: 11px; font-weight: bold; text-decoration: underline;">Offline payment:</p>
        <p style="font-size: 11px; color: #333;">You can make the payment via Cheque or Demand draft in the name of TRINETRA Wireless Pvt Ltd. Kindly do the needful.</p>
        <p style="font-size: 11px; font-weight: bold; color: #333;">What if I don't renew the services?</p>
        <p style="font-size: 11px; color: #333; margin: 3px 0;"><strong>1</strong> Your Trinetra FMS account will be deactivated automatically and you may not be able to view the application.</p>
        <p style="font-size: 11px; color: #333; margin: 3px 0;"><strong>2</strong> If the software license has not been renewed before the due date, your license will be deactivated and for reactivation additional charges has to be paid.</p>
      </div>
    `,
    is_active: true
  },
  {
    name: 'Trinetra Renewal Deactivation Notice',
    category_code: 'SUPPORT',
    channel: 'EMAIL',
    subject: 'Deactivation Notice: Your services are about to deactivate..',
    body_html: `
      <div style="max-width: 750px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #ccc; padding: 15px; background: #fff;">
        <table width="100%" style="margin-bottom: 15px;">
          <tr>
            <td>
              <img src="{{logo_url}}" alt="Trinetra" style="max-height: 45px; display: block;" onError="this.style.display='none'" />
              <div style="font-weight: bold; font-size: 18px; color: #002060;">trinetra</div>
              <div style="font-size: 10px; color: #555;">Fleet Management, Mobility & IoT Solutions</div>
            </td>
            <td align="right" style="font-size: 12px; color: #002060;">
              <a href="mailto:renewals@trinetrawireless.com" style="color: #002060; text-decoration: underline;">renewals@trinetrawireless.com</a><br/>
              <strong>+91-422-2321307</strong>
            </td>
          </tr>
        </table>
        <div style="background-color: #0f2942; color: #fff; padding: 12px; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: normal;">Deactivation Notice</h2>
          <h3 style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold;">Your services are about to deactivate..</h3>
        </div>
        <p style="font-size: 12px; color: #333; margin: 5px 0;">Dear Mr. <strong>{{contact_person}}</strong>,</p>
        <p style="font-size: 12px; color: #333;">The services listed below will be deactivated soon. Kindly renew them to avoid deactivation</p>
        <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; font-size: 11px; text-align: center; border-color: #ccc; margin: 15px 0;">
          <tr bgcolor="#f2f2f2" style="font-weight: bold; color: #333;">
            <th>Service</th>
            <th>Device Id</th>
            <th>No. of Device</th>
            <th>Unit Cost (Rs.)</th>
            <th>Subtotal (Rs.)</th>
            <th>GST @18%</th>
            <th>Total (Rs.)</th>
            <th>Expiry Date</th>
            <th>Term</th>
            <th>Days To Expiry</th>
          </tr>
          <tr>
            <td align="left">{{service_name}}</td>
            <td>{{device_id}}</td>
            <td>{{quantity}}</td>
            <td>{{unit_cost}}</td>
            <td>{{subtotal}}</td>
            <td>{{gst}}</td>
            <td>{{total}}</td>
            <td style="color: red; font-weight: bold;">{{expiry_date}}</td>
            <td>Yearly</td>
            <td style="color: red; font-weight: bold;">{{days_left}} Day(s)</td>
          </tr>
        </table>
        <p style="font-size: 11px; font-weight: bold; text-decoration: underline; margin-top: 15px;">Bank details for online payment transfer:</p>
        <table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; font-size: 11px; border-color: #ccc; margin-bottom: 15px;">
          <tr bgcolor="#d9d9d9"><th colspan="2" style="text-align: center; text-transform: uppercase;">TRINETRA BANK DETAILS</th></tr>
          <tr><td width="30%" bgcolor="#f9f9f9">Company Name</td><td>TRINETRA Wireless Pvt Ltd</td></tr>
          <tr><td bgcolor="#f9f9f9">Name of Bank</td><td>State Bank of India</td></tr>
          <tr><td bgcolor="#f9f9f9">Bank Branch Name</td><td>Red Fields Branch</td></tr>
          <tr><td bgcolor="#f9f9f9">Branch Address</td><td>1114C, Trichy Road, Coimbatore - 641 045. India.</td></tr>
          <tr><td bgcolor="#f9f9f9">IFSC CODE</td><td>SBIN0006577</td></tr>
          <tr><td bgcolor="#f9f9f9">Account Number</td><td>30995705595</td></tr>
        </table>
        <p style="font-size: 11px; font-weight: bold; text-decoration: underline;">Offline payment:</p>
        <p style="font-size: 11px; color: #333;">You can make the payment via Cheque or Demand draft in the name of TRINETRA Wireless Pvt Ltd. Kindly do the needful.</p>
        <p style="font-size: 11px; font-weight: bold; color: #333;">What if I don't renew the services?</p>
        <p style="font-size: 11px; color: #333; margin: 3px 0;"><strong>1</strong> Your Trinetra account will be deactivated automatically and you may not be able to view the application.</p>
        <p style="font-size: 11px; color: #333; margin: 3px 0;"><strong>2</strong> If the software license has not been renewed before the due date, your license will be deactivated and for reactivation additional charges has to be paid.</p>
      </div>
    `,
    is_active: true
  },
  {
    name: 'Trinetra Renewal Suspension Notice',
    category_code: 'SUPPORT',
    channel: 'EMAIL',
    subject: 'URGENT: Suspension Notice — Your Trinetra GPS software license has been suspended',
    body_html: `
      <div style="max-width: 750px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #ccc; padding: 15px; background: #fff;">
        <table width="100%" style="margin-bottom: 15px;">
          <tr>
            <td>
              <img src="{{logo_url}}" alt="Trinetra" style="max-height: 45px; display: block;" onError="this.style.display='none'" />
              <div style="font-weight: bold; font-size: 18px; color: #002060;">trinetra</div>
              <div style="font-size: 10px; color: #555;">Fleet Management, Mobility & IoT Solutions</div>
            </td>
            <td align="right" style="font-size: 12px; color: #002060;">
              <a href="mailto:renewals@trinetrawireless.com" style="color: #002060; text-decoration: underline;">renewals@trinetrawireless.com</a><br/>
              <strong>+91-422-2321307</strong>
            </td>
          </tr>
        </table>
        <div style="background-color: #0f2942; color: #fff; padding: 12px; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: normal;">Suspension Notice</h2>
          <h3 style="margin: 4px 0 0 0; font-size: 15px; font-weight: bold;">Your Trinetra GPS vehicle tracking software license has been suspended.</h3>
        </div>
        <p style="font-size: 12px; color: #333; margin: 5px 0;">Dear Mr. <strong>{{contact_person}}</strong>,</p>
        <p style="font-size: 12px; color: #333;">This is to inform you that your service has now been suspended.</p>
        <p style="font-size: 12px; color: #333;">The details of the suspended service are as given below:</p>
        <div style="margin: 15px 0; font-size: 12px; line-height: 1.6; color: #333;">
          <strong>Product/Service :</strong> {{service_name}}<br/>
          <strong>Due Date :</strong> {{expiry_date}}<br/>
          <strong>Suspension Reason :</strong> Due to Non Payment
        </div>
        <p style="font-size: 12px; font-weight: bold; color: #333;">How do I reactivate my service?</p>
        <p style="font-size: 11px; color: #333;">In order to get this service reactivated, kindly drop a mail to <a href="mailto:renewals@trinetrawireless.com">renewals@trinetrawireless.com</a> as soon as possible and confirm payment expected date for renewal.</p>
        <p style="font-size: 11px; color: #b91c1c;"><strong>IMPORTANT :</strong> Please note that in case your services are not reactivated, then we will have to remove your data from our system and we will not be responsible for any data loss thereafter.</p>
        <p style="font-size: 11px; color: #555;">If you have any feedback or queries, please let us know by replying to this mail. Your feedback will help us in improving our support system.</p>
        <table width="100%" style="margin-top: 20px;">
          <tr>
            <td width="48%" style="border: 1px solid #333; padding: 10px; text-align: center; font-size: 12px; font-weight: bold;">
              Call: 91-0422-2321307
            </td>
            <td width="4%"></td>
            <td width="48%" style="border: 1px solid #333; padding: 10px; text-align: center; font-size: 12px; font-weight: bold;">
              e-mail: renewals@trinetrawireless.com
            </td>
          </tr>
        </table>
      </div>
    `,
    is_active: true
  },
  {
    name: 'Trinetra Renewal Reminder - iWay License',
    category_code: 'SUPPORT',
    channel: 'EMAIL',
    subject: 'Renewal Reminder: Your Trinetra iWay services are about to expire',
    body_html: `
      <div style="max-width: 750px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #ccc; padding: 15px; background: #fff;">
        <table width="100%" style="margin-bottom: 15px;">
          <tr>
            <td>
              <img src="{{logo_url}}" alt="Trinetra" style="max-height: 45px; display: block;" onError="this.style.display='none'" />
              <div style="font-weight: bold; font-size: 18px; color: #002060;">trinetra</div>
              <div style="font-size: 10px; color: #555;">Fleet Management, Mobility & IoT Solutions</div>
            </td>
            <td align="right" style="font-size: 12px; color: #002060;">
              <a href="mailto:renewals@trinetrawireless.com" style="color: #002060; text-decoration: underline;">renewals@trinetrawireless.com</a><br/>
              <strong>+91-422-2321307</strong>
            </td>
          </tr>
        </table>
        <div style="background-color: #0f2942; color: #fff; padding: 12px; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: normal;">Renewal Reminder</h2>
          <h3 style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold;">Your services are about to expire.</h3>
        </div>
        <p style="font-size: 12px; color: #333; margin: 5px 0;">Dear Mr. <strong>{{contact_person}}</strong>,</p>
        <p style="font-size: 12px; color: #333;">The services listed below are due for renewal within next <strong>45 Days</strong>.</p>
        <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; font-size: 11px; text-align: center; border-color: #ccc; margin: 15px 0;">
          <tr bgcolor="#f2f2f2" style="font-weight: bold; color: #333;">
            <th>Service</th>
            <th>Device Id</th>
            <th>No. of Device</th>
            <th>Unit Cost (Rs.)</th>
            <th>Subtotal (Rs.)</th>
            <th>GST @18%</th>
            <th>Total (Rs.)</th>
            <th>Expiry Date</th>
            <th>Term</th>
            <th>Days To Expiry</th>
          </tr>
          <tr>
            <td align="left">Trinetra iWay Software License Usage Charges for Vehicle Tracking Device</td>
            <td>{{device_id}}</td>
            <td>{{quantity}}</td>
            <td>{{unit_cost}}</td>
            <td>{{subtotal}}</td>
            <td>{{gst}}</td>
            <td>{{total}}</td>
            <td style="color: red; font-weight: bold;">{{expiry_date}}</td>
            <td>Yearly</td>
            <td style="color: red; font-weight: bold;">{{days_left}} Day(s)</td>
          </tr>
        </table>
        <p style="font-size: 11px; color: #333;">Please find the attached Order Form for Trinetra iWay Software License Renewal and kindly request you to send the order form duly signed along with the payment</p>
        <p style="font-size: 11px; color: #333;">The Bank details are given below for your kind reference</p>
        <p style="font-size: 11px; font-weight: bold; text-decoration: underline; margin-top: 15px;">Bank details for online payment transfer:</p>
        <table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; font-size: 11px; border-color: #ccc; margin-bottom: 15px;">
          <tr bgcolor="#d9d9d9"><th colspan="2" style="text-align: center; text-transform: uppercase;">TRINETRA BANK DETAILS</th></tr>
          <tr><td width="30%" bgcolor="#f9f9f9">Company Name</td><td>TRINETRA Wireless Pvt Ltd</td></tr>
          <tr><td bgcolor="#f9f9f9">Name of Bank</td><td>State Bank of India</td></tr>
          <tr><td bgcolor="#f9f9f9">Bank Branch Name</td><td>Red Fields Branch</td></tr>
          <tr><td bgcolor="#f9f9f9">Branch Address</td><td>1114C, Trichy Road, Coimbatore - 641 045. India.</td></tr>
          <tr><td bgcolor="#f9f9f9">IFSC CODE</td><td>SBIN0006577</td></tr>
          <tr><td bgcolor="#f9f9f9">Account Number</td><td>30995705595</td></tr>
        </table>
        <p style="font-size: 11px; font-weight: bold; text-decoration: underline;">Offline payment:</p>
        <p style="font-size: 11px; color: #333;">You can make the payment via Cheque or Demand draft in the name of TRINETRA Wireless Pvt Ltd</p>
        <p style="font-size: 11px; color: #333;">Kindly do the needful.</p>
        <p style="font-size: 11px; font-weight: bold; color: #333;">What if I don't renew the services?</p>
        <p style="font-size: 11px; color: #333; margin: 3px 0;"><strong>1</strong> Your Trinetra iWay account will be deactivated automatically and you may not be able to view the application.</p>
        <p style="font-size: 11px; color: #333; margin: 3px 0;"><strong>2</strong> If the software license has not been renewed before the due date, your license will be deactivated and for reactivation additional charges has to be paid.</p>
      </div>
    `,
    is_active: true
  }
];

async function main() {
  console.log('Seeding standard email templates...');
  let count = 0;
  for (const t of STANDARD_TEMPLATES) {
    const existing = await prisma.renewalNotificationTemplate.findFirst({
      where: { name: t.name }
    });

    if (existing) {
      console.log(`Skipping template "${t.name}" — already exists.`);
      continue;
    }

    await prisma.renewalNotificationTemplate.create({
      data: {
        name: t.name,
        category_code: t.category_code,
        channel: t.channel,
        subject: t.subject,
        body_html: ensureResponsiveEmailHtml(t.body_html),
        is_active: t.is_active
      }
    });
    console.log(`Seeded template: "${t.name}"`);
    count++;
  }
  console.log(`Successfully seeded ${count} email templates.`);
}

main()
  .catch((e) => {
    console.error('Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

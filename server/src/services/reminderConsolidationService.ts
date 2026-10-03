import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';
import { queueNotification } from './notificationOutboxService';

/**
 * Monthly Consolidated Digest Engine
 * Group reminders by ClientCompany + Expiry Month and dispatch a single combined email to all company contacts.
 * Automatically generates and attaches the Order Form PDF for all bundled services!
 */
export async function processConsolidatedMonthlyReminders(): Promise<number> {
  const now = dayjs().endOf('day').toDate();

  // 1. Fetch pending reminders due up to today
  const dueReminders = await (prisma as any).renewalReminder.findMany({
    where: {
      status: 'PENDING',
      due_date: { lte: now }
    },
    include: {
      cycle: {
        include: {
          service_instance: {
            include: {
              renewal_account: {
                include: {
                  client_company: {
                    include: {
                      renewal_contacts: { where: { is_active: true } }
                    }
                  },
                  company: true,
                  account_manager: true,
                  renewal_executive: true,
                }
              },
              service_master: { include: { category: true } },
              provider: true,
            }
          }
        }
      }
    },
    orderBy: { due_date: 'asc' }
  });

  if (dueReminders.length === 0) return 0;

  // 2. Group by client_company_id + expiry_month (e.g. "42_2026-08")
  const groups = new Map<string, any[]>();

  for (const reminder of dueReminders) {
    const cycle = reminder.cycle;
    const svc = cycle?.service_instance;
    const clientCompanyId = svc?.renewal_account?.client_company_id;
    const expiryDate = svc?.expiry_date;

    if (!clientCompanyId || !expiryDate) continue;

    // Combined digest ONLY bundles auto-email policy reminders.
    // Explicit channels (drafts, calls, WhatsApp, in-app) and steps with a
    // user-selected template always follow their own per-step flow.
    const ch = (reminder.channel || '').toUpperCase();
    const isDigestableChannel = ['EMAIL', 'EMAIL_DIRECT', 'BOTH'].includes(ch);
    if (!isDigestableChannel || reminder.template_id) continue;

    const monthKey = `${clientCompanyId}_${dayjs(expiryDate).format('YYYY-MM')}`;
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey)!.push(reminder);
  }

  let processedCount = 0;

  // 3. Process each client company monthly group
  for (const [groupKey, reminders] of groups.entries()) {
    try {
      const primaryReminder = reminders[0];
      const account = primaryReminder.cycle.service_instance.renewal_account;
      const clientCompany = account?.client_company;
      const companyName = clientCompany?.name || account?.client_name || 'Valued Client';
      const contacts = clientCompany?.renewal_contacts || [];

      // TO: Client Company Contacts (External Customers)
      const clientContactEmails = Array.from(new Set(
        contacts.map((c: any) => c.email).filter(Boolean)
      ));

      // CC: Internal Staff (Account Manager & Assigned Executive from Company)
      const internalStaffEmails = Array.from(new Set([
        account?.account_manager?.email,
        account?.renewal_executive?.email
      ].filter(Boolean)));

      if (clientContactEmails.length === 0) {
        // Fallback: if no email contacts registered, skip consolidation and mark due
        for (const r of reminders) {
          await (prisma as any).renewalReminder.update({
            where: { id: r.id },
            data: { status: 'DUE' }
          });
        }
        continue;
      }

      // Collect all service details in this month's digest
      const serviceItems = reminders.map((r: any) => {
        const s = r.cycle.service_instance;
        const amount = Number(s.amount_due || 0);
        return {
          reminder_id: r.id,
          service_master: s.service_master,
          category_name: s.service_master?.category?.name || 'Service',
          service_name: s.service_master?.name || s.identifier || 'Service',
          identifier: s.identifier || '—',
          provider_name: s.provider?.name || '—',
          server_name: s.server_name || '',
          plan_name: s.plan_name || '',
          activation_date: s.activation_date,
          expiry_date: s.expiry_date,
          expiry_date_formatted: dayjs(s.expiry_date).format('DD MMM YYYY'),
          duration_value: s.duration_value || 12,
          duration_unit: s.duration_unit || 'Months',
          amount_due: amount,
        };
      });

      // Deduplicate services by identifier/service_name in the email body
      const uniqueServices = Array.from(
        new Map(serviceItems.map(item => [item.service_name + item.identifier, item])).values()
      );

      const subtotal = uniqueServices.reduce((sum, item) => sum + item.amount_due, 0);
      const gst = Math.round(subtotal * 0.18 * 100) / 100;
      const totalDue = subtotal + gst;
      const expiryMonthLabel = dayjs(primaryReminder.cycle.service_instance.expiry_date).format('MMMM YYYY');

      // Construct High-End HTML Email Digest Table
      const htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #1e40af; padding: 24px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Monthly Renewal Digest – ${expiryMonthLabel}</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Client: <strong>${companyName}</strong></p>
          </div>
          
          <div style="padding: 24px;">
            <p style="font-size: 14px; margin-top: 0;">Dear Team,</p>
            <p style="font-size: 13px; color: #475569; line-height: 1.5;">
              This is your consolidated monthly renewal digest for <strong>${companyName}</strong>. 
              The following <strong>${uniqueServices.length} service(s)</strong> are scheduled for renewal in <strong>${expiryMonthLabel}</strong>.
              <br/><br/>
              <em>📎 Please find the attached official Order Form PDF for complete details, payment terms, and invoice breakdown.</em>
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; text-transform: uppercase; font-size: 10px;">
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Service</th>
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Identifier / Ref</th>
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">Expiry Date</th>
                  <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                ${uniqueServices.map(item => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-weight: 700; color: #0f172a;">
                      ${item.service_name}
                      ${item.plan_name ? `<br/><span style="font-size: 10px; color: #64748b; font-weight: 400;">Plan: ${item.plan_name}</span>` : ''}
                    </td>
                    <td style="padding: 10px; font-family: monospace; color: #334155;">${item.identifier}</td>
                    <td style="padding: 10px; text-align: center; font-weight: 700; color: #2563eb;">${item.expiry_date_formatted}</td>
                    <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: 700;">Rs. ${item.amount_due.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; font-size: 13px; color: #166534; margin-top: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Subtotal:</span>
                <strong style="font-family: monospace;">Rs. ${subtotal.toLocaleString('en-IN')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #15803d;">
                <span>Estimated GST (18%):</span>
                <span style="font-family: monospace;">Rs. ${gst.toLocaleString('en-IN')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; border-top: 1px solid #86efac; padding-top: 8px; margin-top: 8px; color: #14532d;">
                <span>Total Amount Due:</span>
                <strong style="font-family: monospace;">Rs. ${totalDue.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              Please arrange for timely payment to ensure uninterrupted service operations.
            </p>
          </div>

          <div style="background-color: #f8fafc; padding: 16px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
            CRM Renewal System • Consolidated Monthly Digest with Attached Order Form PDF
          </div>
        </div>
      `;

      const subject = `Consolidated Renewal Digest for ${expiryMonthLabel} – ${companyName} (${uniqueServices.length} Services)`;
      const toHeader = clientContactEmails.join(', ');
      const ccHeader = internalStaffEmails.length > 0 ? internalStaffEmails.join(', ') : undefined;

      // ── Auto-generate Order Form PDF for Digest Email Attachment ────────────
      let attachmentPath: string | undefined = undefined;
      try {
        const { generateOrderFormPDF } = await import('../utils/orderFormPdfGenerator');

        const pdfAccount = {
          id: account?.id || 0,
          order_number: account?.order_number || `DIGEST-${dayjs().format('YYYYMM')}`,
          order_date: new Date(),
          client_company: clientCompany || { name: companyName },
          company: account?.company || { name: 'ANGLER Technologies India Pvt Ltd.,' },
          account_manager: account?.account_manager,
          renewal_executive: account?.renewal_executive,
          contacts: contacts.map((c: any) => ({ contact: c })),
          services: uniqueServices.map((s: any) => ({
            service_master: s.service_master || { name: s.service_name, category: { name: s.category_name } },
            identifier: s.identifier !== '—' ? s.identifier : '',
            plan_name: s.plan_name,
            activation_date: s.activation_date,
            expiry_date: s.expiry_date,
            duration_value: s.duration_value,
            duration_unit: s.duration_unit,
            amount_due: s.amount_due,
          })),
        };

        const pdfRes = await generateOrderFormPDF(pdfAccount);
        attachmentPath = pdfRes.filePath;
        console.log(`[ConsolidationEngine] Order Form PDF generated for digest: ${attachmentPath}`);
      } catch (pdfErr) {
        console.error('[ConsolidationEngine] Error generating digest Order Form PDF:', pdfErr);
      }

      // Queue 1 single outbox email addressed TO client contacts, CC internal staff with attached Order Form PDF
      await queueNotification({
        channel: 'EMAIL',
        recipient: toHeader,
        ccRecipients: ccHeader,
        subject,
        renderedBody: htmlBody,
        attachmentPath,
        digestPeriod: dayjs().format('YYYY-MM'),
        clientCompanyId: clientCompany?.id || account?.client_company_id,
      });

      // Mark the primary (earliest) reminder as SENT with CONSOLIDATED_DIGEST tag
      await (prisma as any).renewalReminder.update({
        where: { id: primaryReminder.id },
        data: {
          status: 'SENT',
          action_type: 'CONSOLIDATED_DIGEST',
          completed_at: new Date(),
        }
      });

      // Mark all subsequent reminders in this same month group as COMBINED_SENT
      for (let i = 1; i < reminders.length; i++) {
        const rem = reminders[i];
        await (prisma as any).renewalReminder.update({
          where: { id: rem.id },
          data: {
            status: 'SENT',
            action_type: 'COMBINED_SENT',
            completed_at: new Date(),
          }
        });
      }

      processedCount += reminders.length;
    } catch (err) {
      console.error(`[ConsolidationEngine] Error processing group ${groupKey}:`, err);
    }
  }

  return processedCount;
}

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

export function renderTemplate(template: string, vars: Record<string, string>): string {
  const enriched: Record<string, string> = { ...vars };

  const clientVal = vars.client_name || vars.customer_name || vars.company_name || 'Customer';
  if (!enriched.customer_name) enriched.customer_name = clientVal;
  if (!enriched.client_name) enriched.client_name = clientVal;
  if (!enriched.company_name) enriched.company_name = clientVal;

  const svcVal = vars.service_name || vars.service_title || 'Service';
  if (!enriched.service_name) enriched.service_name = svcVal;
  if (!enriched.service_title) enriched.service_title = svcVal;

  const identVal = vars.identifier || vars.domain_url || '';
  if (!enriched.identifier) enriched.identifier = identVal;
  if (!enriched.domain_url) enriched.domain_url = identVal;

  const daysVal = vars.days_remaining || vars.days_before || vars.days_left || '0';
  if (!enriched.days_remaining) enriched.days_remaining = daysVal;
  if (!enriched.days_before) enriched.days_before = daysVal;
  if (!enriched.days_left) enriched.days_left = daysVal;

  const amtVal = vars.amount_due || vars.subtotal || '0';
  if (!enriched.amount_due) enriched.amount_due = amtVal;
  const numAmt = parseFloat(amtVal.replace(/[^\d.]/g, '')) || 0;
  if (!enriched.subtotal) enriched.subtotal = String(numAmt);
  if (!enriched.gst) enriched.gst = String(Math.round(numAmt * 0.18 * 100) / 100);
  if (!enriched.grand_total) enriched.grand_total = String(Math.round(numAmt * 1.18 * 100) / 100);

  if (!enriched.order_number) enriched.order_number = vars.order_number || '';
  if (!enriched.po_reference) enriched.po_reference = vars.po_reference || '';

  const amVal = vars.account_manager_name || vars.account_manager || 'Account Manager';
  if (!enriched.account_manager_name) enriched.account_manager_name = amVal;
  if (!enriched.account_manager) enriched.account_manager = amVal;

  if (!enriched.provider_name) enriched.provider_name = vars.provider_name || '';

  // Company Bank Account Details Fallbacks
  if (!enriched.bank_account_name) enriched.bank_account_name = vars.bank_account_name || 'TRINETRA Wireless Pvt Ltd';
  if (!enriched.bank_name) enriched.bank_name = vars.bank_name || 'State Bank of India';
  if (!enriched.bank_branch) enriched.bank_branch = vars.bank_branch || 'Red Fields Branch';
  if (!enriched.bank_ifsc) enriched.bank_ifsc = vars.bank_ifsc || 'SBIN0006577';
  if (!enriched.bank_account_no) enriched.bank_account_no = vars.bank_account_no || '30995705595';

  if (!enriched.new_expiry_date && enriched.expiry_date) {
    try {
      const expDate = dayjs(enriched.expiry_date, ['DD-MMM-YYYY', 'YYYY-MM-DD', 'DD MMM YYYY']);
      if (expDate.isValid()) {
        enriched.new_expiry_date = expDate.add(1, 'year').format('DD MMM YYYY');
      }
    } catch {
      enriched.new_expiry_date = enriched.expiry_date;
    }
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => enriched[key] ?? '');
}

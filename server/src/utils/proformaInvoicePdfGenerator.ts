import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';

/**
 * Trinetra Proforma Invoice PDF generator.
 * Layout mirrors the reference: `md files/ref/trinetra performa invoice template.pdf`
 * Logo:            `server/uploads/branding/trinetra_logo.png`
 */

// ── Number to Words (Indian numbering system) ────────────────────────────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ONES[h] + ' Hundred' + (r ? ' and ' : '') : '') + (r ? twoDigits(r) : '');
}

function numberToWords(num: number): string {
  const rupees = Math.round(num);
  if (rupees === 0) return 'Zero Only';
  let n = rupees;
  const parts: string[] = [];
  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  if (crores) parts.push(threeDigits(crores) + ' Crore');
  if (lakhs) parts.push(twoDigits(lakhs) + ' Lakh');
  if (thousands) parts.push(twoDigits(thousands) + ' Thousand');
  if (n) parts.push(threeDigits(n));
  return parts.join(' ') + ' Only';
}

export async function generateProformaInvoicePDF(accountInput: number | any): Promise<{ filePath: string; relativeUrl: string; invoiceNo: string; companyName: string }> {
  let account: any = null;

  if (typeof accountInput === 'number') {
    account = await (prisma as any).renewalAccount.findUnique({
      where: { id: accountInput },
      include: {
        client_company: {
          include: {
            renewal_contacts: { where: { is_active: true } }
          }
        },
        company: true,
        account_manager: true,
        services: {
          where: { is_active: true },
          include: {
            service_master: true,
            customer_contact: true,
          }
        }
      }
    });

    if (!account) {
      throw new Error(`Renewal Account #${accountInput} not found`);
    }
  } else {
    account = accountInput;
  }

  // ── Brand profile (same resolution as orderFormPdfGenerator) ─────────────
  const parentCompanyId = account.company_id || account.company?.id || null;
  let brandProfile: any = null;
  if (parentCompanyId) {
    brandProfile = await (prisma as any).renewalBrandProfile.findFirst({
      where: { company_id: parentCompanyId, is_active: true },
      orderBy: { is_default: 'desc' }
    });
  }
  if (!brandProfile) {
    brandProfile = await (prisma as any).renewalBrandProfile.findFirst({
      where: { is_default: true, is_active: true }
    });
  }

  const companyName = brandProfile?.company_name || account.company?.name || 'TRINETRA Wireless Pvt Ltd';
  const companyShortName = companyName.split(' ')[0] || 'TRINETRA';
  const primaryColor = brandProfile?.primary_color || '#1E3A8A';

  const bank = {
    accountName: brandProfile?.bank_account_name || companyName,
    name: brandProfile?.bank_name || 'State Bank of India',
    branch: brandProfile?.bank_branch || 'Red Fields Branch',
    branchAddress: brandProfile?.bank_branch_address || '1114C, Trichy Road, Coimbatore - 641 045. India.',
    ifsc: brandProfile?.bank_ifsc || 'SBIN0006577',
    accountNo: brandProfile?.bank_account_no || '30995705595',
  };

  // ── Customer / contact ────────────────────────────────────────────────────
  const primaryContact = account.client_company?.renewal_contacts?.find((c: any) => c.is_primary) ||
    account.client_company?.renewal_contacts?.[0] || {};

  const clientName = account.client_company?.name || 'Valued Customer';
  const customerAddress = primaryContact.address || account.client_company?.address || '';
  const customerCityPin = primaryContact.city_pincode || account.client_company?.city_pincode || '';
  const customerGstNo = primaryContact.gst_no || account.client_company?.gst_no || '';

  // ── Invoice metadata ──────────────────────────────────────────────────────
  const services: any[] = account.services || [];
  const activDates = services.map(s => s.activation_date).filter(Boolean);
  const expiryDates = services.map(s => s.expiry_date).filter(Boolean);
  const periodStart = activDates.length ? new Date(Math.min(...activDates.map((d: any) => new Date(d).getTime()))) : new Date();
  const periodEnd = expiryDates.length ? new Date(Math.max(...expiryDates.map((d: any) => new Date(d).getTime()))) : dayjs(periodStart).add(1, 'year').subtract(1, 'day').toDate();

  const invoiceDate = new Date();
  const paymentDueDate = dayjs(invoiceDate).add(20, 'day').toDate();
  const fyStartYear = dayjs(periodStart).month() >= 3 ? dayjs(periodStart).year() : dayjs(periodStart).year() - 1;
  const fyLabel = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
  const invoiceNo = `PRO/${companyShortName.toUpperCase()}/${String(account.id || 0).padStart(3, '0')}/${fyLabel}`;

  const orderNo = account.order_number || `RN-${(account.id || 0).toString().padStart(6, '0')}`;
  const orderDate = account.order_date ? dayjs(account.order_date).format('DD.MM.YYYY') : dayjs(account.created_at || new Date()).format('DD.MM.YYYY');

  // ── Line items (per service instance) ─────────────────────────────────────
  const items = services.map((svc: any) => {
    const qty = Math.max(1, Number(svc.quantity || 1));
    const months = Number(svc.duration_value || 12);
    const amount = Number(svc.amount_due || 0);
    const unitCost = Number(svc.unit_price || 0) || (qty * months > 0 ? Math.round(amount / (qty * months)) : amount);
    const descParts = [svc.service_master?.name || 'Service'];
    if (svc.identifier) descParts.push(`[${svc.identifier}]`);
    return {
      description: descParts.join(' '),
      sacCode: '998319',
      qty,
      unitCost,
      months,
      amount,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const cgst = Math.round(subtotal * 0.09);
  const sgst = Math.round(subtotal * 0.09);
  const grandTotal = subtotal + cgst + sgst;

  // ── Output file ───────────────────────────────────────────────────────────
  const uploadsDir = path.join(process.cwd(), 'uploads', 'order_forms');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const fileName = `${companyShortName.toUpperCase()}_Proforma_Invoice_${invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
  const filePath = path.join(uploadsDir, fileName);
  const relativeUrl = `/uploads/order_forms/${fileName}`;

  const logoPath = path.join(process.cwd(), 'uploads', 'branding', 'trinetra_logo.png');
  const logoExists = fs.existsSync(logoPath);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 25 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const borderColor = '#64748b';
    const L = 25, R = 570, W = 545;
    const fmt = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 0 });

    // ── Header: logo + company name + title ─────────────────────────────────
    if (logoExists) {
      doc.image(logoPath, L, 25, { width: 120 });
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor)
        .text(companyName, L + 130, 38, { width: 285 });
    } else {
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor).text(companyName, L, 35);
    }
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a')
      .text('PROFORMA INVOICE', 430, 25, { width: 140, align: 'right' });

    let y = 75;

    // Row: Invoice No & Date (left) | right box: Billing Period / Payment Due
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
      .text('Proforma Invoice No. & Date', L, y);
    doc.font('Helvetica').text(`: ${invoiceNo} dated ${dayjs(invoiceDate).format('DD.MM.YYYY')}`, L + 135, y);

    doc.font('Helvetica-Bold').fontSize(8.5)
      .text('Billing Period', 420, y);
    doc.font('Helvetica').fontSize(8.5)
      .text(`${dayjs(periodStart).format('DD-MMM-YYYY')} to ${dayjs(periodEnd).format('DD-MMM-YYYY')}`, 420, y + 11, { width: 150 });
    doc.font('Helvetica-Bold').fontSize(8.5)
      .text('Payment Due Date', 420, y + 26);
    doc.font('Helvetica').text(`: ${dayjs(paymentDueDate).format('DD-MMM-YYYY')}`, 495, y + 26);
    y += 45;

    // ── Invoiced To + Order details (2 columns like reference) ──────────────
    doc.rect(L, y, 350, 100).stroke(borderColor);
    doc.rect(L + 350, y, 195, 100).stroke(borderColor);

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('Invoiced To:', L + 5, y + 5);
    doc.font('Helvetica-Bold').fontSize(8.5).text(`M/s. ${clientName},`, L + 5, y + 18, { width: 340 });
    if (customerAddress) {
      doc.font('Helvetica').fontSize(8.5).text(customerAddress, L + 5, y + 30, { width: 340 });
    }
    if (customerCityPin) {
      doc.font('Helvetica').text(customerCityPin, L + 5, y + 42, { width: 340 });
    }
    if (primaryContact.name) {
      doc.font('Helvetica').text(`Kind Attn: Mr. ${primaryContact.name}`, L + 5, y + 56, { width: 340 });
    }
    if (customerGstNo) {
      doc.font('Helvetica').text(`GST No : ${customerGstNo}`, L + 5, y + 68, { width: 340 });
    }

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
      .text('Customer Order No. & Date', L + 355, y + 5, { width: 185 });
    doc.font('Helvetica').fontSize(8.5).text(`${orderNo} dated ${orderDate}`, L + 355, y + 18, { width: 185 });
    if (account.po_reference) {
      doc.font('Helvetica').fontSize(8.5).text(account.po_reference, L + 355, y + 30, { width: 185 });
    }

    y += 108;

    // ── Items table ─────────────────────────────────────────────────────────
    const col = { sno: { x: L, w: 25 }, desc: { x: L + 25, w: 225 }, sac: { x: L + 250, w: 45 }, qty: { x: L + 295, w: 45 }, unit: { x: L + 340, w: 70 }, months: { x: L + 410, w: 50 }, amount: { x: L + 460, w: 85 } };
    const cols = Object.values(col);

    const drawRow = (rowY: number, h: number) => {
      doc.rect(L, rowY, W, h).stroke(borderColor);
      for (let i = 1; i < cols.length; i++) {
        doc.moveTo(cols[i].x, rowY).lineTo(cols[i].x, rowY + h).stroke(borderColor);
      }
    };

    const headerH = 26;
    doc.rect(L, y, W, headerH).fillAndStroke('#d1d5db', borderColor);
    for (let i = 1; i < cols.length; i++) {
      doc.moveTo(cols[i].x, y).lineTo(cols[i].x, y + headerH).stroke(borderColor);
    }
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
    doc.text('Sno', col.sno.x, y + 5, { width: col.sno.w, align: 'center' });
    doc.text('Item Description', col.desc.x, y + 9, { width: col.desc.w, align: 'center' });
    doc.text('SAC Code', col.sac.x, y + 5, { width: col.sac.w, align: 'center' });
    doc.text('No. of Devices', col.qty.x, y + 5, { width: col.qty.w, align: 'center' });
    doc.text('Unit Cost (Rs.)', col.unit.x, y + 5, { width: col.unit.w, align: 'center' });
    doc.text('No. of months', col.months.x, y + 5, { width: col.months.w, align: 'center' });
    doc.text('Amount (Rs.)', col.amount.x, y + 5, { width: col.amount.w, align: 'center' });
    y += headerH;

    if (items.length === 0) {
      drawRow(y, 20);
      doc.font('Helvetica').fontSize(8.5).fillColor('#64748b')
        .text('No services', col.desc.x, y + 6, { width: col.desc.w, align: 'center' });
      y += 20;
    } else {
      items.forEach((item, idx) => {
        doc.font('Helvetica').fontSize(8);
        const descH = doc.heightOfString(item.description, { width: col.desc.w - 8 });
        const rowH = Math.max(20, descH + 10);
        drawRow(y, rowH);

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
          .text(String(idx + 1), col.sno.x, y + 6, { width: col.sno.w, align: 'center' });
        doc.font('Helvetica').fontSize(8).text(item.description, col.desc.x + 4, y + 5, { width: col.desc.w - 8 });
        doc.font('Helvetica').fontSize(8.5).text(item.sacCode, col.sac.x, y + 6, { width: col.sac.w, align: 'center' });
        doc.text(String(item.qty), col.qty.x, y + 6, { width: col.qty.w, align: 'center' });
        doc.text(fmt(item.unitCost), col.unit.x, y + 6, { width: col.unit.w, align: 'center' });
        doc.text(String(item.months), col.months.x, y + 6, { width: col.months.w, align: 'center' });
        doc.font('Helvetica-Bold').text(fmt(item.amount), col.amount.x, y + 6, { width: col.amount.w - 6, align: 'right' });
        y += rowH;
      });
    }

    // Totals
    const totalRow = (label: string, value: number, h = 18, bold = true, fill: string | null = null) => {
      if (fill) {
        doc.rect(L, y, W, h).fillAndStroke(fill, borderColor);
      } else {
        drawRow(y, h);
      }
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
        .text(label, col.unit.x, y + 4, { width: col.unit.w + col.months.w - 8, align: 'right' });
      doc.text(fmt(value), col.amount.x, y + 4, { width: col.amount.w - 6, align: 'right' });
      y += h;
    };

    totalRow('TOTAL AMOUNT', subtotal);
    totalRow('CGST @ 9%', cgst);
    totalRow('SGST @ 9%', sgst);
    totalRow('Grand Total', grandTotal, 20, true, '#dbeafe');

    y += 6;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
      .text(`Amount in Words : ${numberToWords(grandTotal)}`, L, y, { width: W });
    y += 16;

    // ── Bank details table ──────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(8.5).text('Bank details for online payment transfer:', L, y);
    y += 12;

    const bankRows: [string, string][] = [
      ['Company Name', bank.accountName],
      ['Name of Bank', bank.name],
      ['Bank Branch Name', bank.branch],
      ['Branch Address', bank.branchAddress],
      ['IFSC CODE', bank.ifsc],
      ['Account Number', bank.accountNo],
      ['Payment Terms', '100% in Advance'],
    ];
    bankRows.forEach(([label, val]) => {
      doc.rect(L, y, 150, 16).stroke(borderColor);
      doc.rect(L + 150, y, 395, 16).stroke(borderColor);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(label, L + 4, y + 4);
      doc.font('Helvetica').fontSize(8.5).text(val, L + 155, y + 4, { width: 385 });
      y += 16;
    });
    y += 8;

    // ── Terms & Conditions ──────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).text('Terms & Conditions', L, y);
    doc.font('Helvetica').fontSize(8).text('E. & O.E.', 420, y + 1, { width: 150, align: 'right' });
    y += 12;

    const terms = [
      `1. Payment to be made by A/C Payee Cheque / Banker's Cheque / DD in favour of ${companyName} & Payable at Coimbatore`,
      '2. Payment terms as per order form; otherwise interest at 24% p.a. will be charged',
      '3. TDS deduction is applicable only for Tax Invoice and not for Proforma Invoice',
      '4. GST should not be claimed against proforma invoice',
      '5. All disputes are subject to Coimbatore Jurisdiction',
    ];
    doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
    terms.forEach(t => {
      const paraH = doc.heightOfString(t, { width: W });
      doc.text(t, L, y, { width: W });
      y += paraH + 2;
    });
    y += 6;
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#0f172a')
      .text('This is a system generated Proforma Invoice and requires no signature', L, y, { width: W, align: 'center' });

    // ── Footer ──────────────────────────────────────────────────────────────
    const footY = 775;
    if (logoExists) {
      doc.image(logoPath, L, footY, { width: 90 });
    }
    doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor)
      .text(companyName, logoExists ? L + 100 : L, footY + 5, { width: 300 });

    doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
      .text('Address : #1245 (Old No. 1144) Trichy Road, Coimbatore - 641 045, India', 300, footY + 4, { width: 270, align: 'right' })
      .text('Tel : +91 422 3192939 / 2321307   Fax : +91 422 2313936', 300, footY + 15, { width: 270, align: 'right' })
      .text('CIN : U74999TZ2009PTC015679   GST No. 33AADCT3199B1ZJ', 300, footY + 26, { width: 270, align: 'right' })
      .text('PAN No. AADCT3199B   I.E.Code No. 3209019495', 300, footY + 37, { width: 270, align: 'right' });

    doc.end();

    stream.on('finish', () => {
      resolve({ filePath, relativeUrl, invoiceNo, companyName });
    });
    stream.on('error', (err) => {
      reject(err);
    });
  });
}

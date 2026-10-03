import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';

export function calculateRenewalPeriod(
  expiryDate: Date | string | null | undefined,
  activationDate: Date | string | null | undefined,
  durationValue: number,
  durationUnit: string,
) {
  const start = expiryDate ? dayjs(expiryDate) : (activationDate ? dayjs(activationDate) : null);
  if (!start || !start.isValid()) return { from: null, to: null, label: '—' };
  const normalizedUnit = String(durationUnit || 'months').toLowerCase();
  const end = normalizedUnit.startsWith('year') || normalizedUnit === 'y'
    ? start.add(durationValue, 'year')
    : start.add(durationValue, 'month');
  return {
    from: start.toDate(),
    to: end.toDate(),
    label: `${start.format('DD-MMM-YYYY')} to ${end.format('DD-MMM-YYYY')}`,
  };
}

export async function generateOrderFormPDF(accountInput: number | any): Promise<{ filePath: string; relativeUrl: string }> {
  let account: any = null;

  if (typeof accountInput === 'number') {
    // 1. Fetch full Renewal Account details from DB
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
        renewal_executive: true,
        contacts: { include: { contact: true } },
        services: {
          where: { is_active: true },
          include: {
            service_master: { include: { category: true } },
            provider: true,
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

  // ── Dynamic Branding — resolve from RenewalBrandProfile linked to parent company
  const parentCompanyId = account.company_id || account.company?.id || null;
  let brandProfile: any = null;
  if (parentCompanyId) {
    brandProfile = await (prisma as any).renewalBrandProfile.findFirst({
      where: { company_id: parentCompanyId, is_active: true },
      orderBy: { is_default: 'desc' }
    });
  }
  if (!brandProfile) {
    // Fallback: find the system default profile
    brandProfile = await (prisma as any).renewalBrandProfile.findFirst({
      where: { is_default: true, is_active: true }
    });
  }

  // Company identity — prefer brand profile, then account.company, then ANGLER defaults
  const companyName = brandProfile?.company_name || account.company?.name || 'ANGLER Technologies India Pvt Ltd.,';
  const companyShortName = companyName.split(' ')[0] || 'ANGLER';
  const companyDomain = brandProfile?.website_url || account.company?.website || 'www.angleritech.com';
  const companyEmail = brandProfile?.sender_email || account.company?.email || 'support@angleritech.com';
  const primaryColor = brandProfile?.primary_color || '#1e3a8a';

  // Determine Primary Contact details
  const primaryContact = account.contacts?.[0]?.contact ||
    account.client_company?.renewal_contacts?.find((c: any) => c.is_primary) ||
    account.client_company?.renewal_contacts?.[0] || {};

  const clientName = account.client_company?.name || 'Valued Customer';
  const contactName = primaryContact.name || 'N/A';
  const contactDesignation = primaryContact.designation || 'Director / Management';
  const contactEmail = primaryContact.email || 'N/A';
  const contactPhone = primaryContact.phone || primaryContact.mobile || 'N/A';
  const contactMobile = primaryContact.mobile || primaryContact.phone || 'N/A';
  const address = primaryContact.address || 'Coimbatore, Tamil Nadu';
  const cityPin = primaryContact.city_pincode || 'Coimbatore - 641 045';

  const orderNo = account.order_number || `RN-${(account.id || 0).toString().padStart(6, '0')}`;
  const orderDate = account.order_date ? dayjs(account.order_date).format('DD-MMM-YY') : dayjs(account.created_at).format('DD-MMM-YY');
  const mktgRef = account.po_reference || `RN/HO/${dayjs().format('YY')}-${dayjs().add(1, 'year').format('YY')}/`;
  const mktgSbu = account.company?.name || 'HO Renewals';
  const mktgExec = account.account_manager ? `${account.account_manager.first_name} ${account.account_manager.last_name || ''}`.trim() : 'Admin';
  const techSbu = account.company?.name || 'HO Technical';
  const techExec = account.renewal_executive ? `${account.renewal_executive.first_name} ${account.renewal_executive.last_name || ''}`.trim() : 'Admin';

  // Output Directory setup
  const uploadsDir = path.join(process.cwd(), 'uploads', 'order_forms');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `${companyShortName.toUpperCase()}_Order_Form_${orderNo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
  const filePath = path.join(uploadsDir, fileName);
  const relativeUrl = `/uploads/order_forms/${fileName}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 25 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const borderColor = '#64748b';  // Clean Grid Border

    // Helper for Indian Currency Formatting (numbers only for table rows)
    const formatNumber = (val: number) => {
      return val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    // ── Header Bar ──────────────────────────────────────────────────────────
    doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(`${companyShortName} Customer Contract`, 25, 20);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1d4ed8').text(companyDomain, 480, 20, { align: 'right' });


    // ── Title Box ───────────────────────────────────────────────────────────
    const formTitle = companyName.toUpperCase().includes('ORDER FORM') 
      ? companyName.toUpperCase() 
      : `${companyName.toUpperCase()} ORDER FORM`;

    doc.rect(25, 32, 545, 26).fillAndStroke('#e2e8f0', borderColor);
    doc.fontSize(13).fillColor(primaryColor).font('Helvetica-Bold')
      .text(formTitle, 25, 38, { width: 545, align: 'center' });

    // ── Metadata Tables (Customer vs Company Info) ───────────────────────────
    const startY = 62;
    const tableWidth = 545;
    const col1Width = 350;
    const col2Width = 195;

    // Dynamically calculate Customer Address height to prevent clipping if long
    doc.fontSize(8.5).font('Helvetica');
    const addressHeight = Math.max(16, doc.heightOfString(address, { width: 225 }));
    const boxHeight = Math.max(145, Math.ceil(addressHeight + 130));

    // Outer Rectangles
    doc.rect(25, startY, col1Width, boxHeight).stroke(borderColor);
    doc.rect(25 + col1Width, startY, col2Width, boxHeight).stroke(borderColor);

    // Right Box Header
    doc.rect(25 + col1Width, startY, col2Width, 20).fillAndStroke('#d1d5db', borderColor);
    doc.fontSize(9).fillColor('#0f172a').font('Helvetica-Bold')
      .text(`To be filled by ${companyShortName} Only`, 25 + col1Width, startY + 5, { width: col2Width, align: 'center' });

    // Left Table Rows (Customer Details with Dynamic Address Y-Tracking)
    let currY = startY + 6;

    const renderLeftRow = (label: string, val: string) => {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(label, 30, currY, { width: 95 });
      const valHeight = doc.heightOfString(`: ${val}`, { width: 225 });
      doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(`: ${val}`, 125, currY, { width: 225 });
      currY += Math.max(16, valHeight + 2);
    };

    renderLeftRow('Customer Name', clientName);
    renderLeftRow('Address', address);
    renderLeftRow('City & Pin Code', cityPin);
    renderLeftRow('Phone No', contactPhone);
    renderLeftRow('Mobile No', contactMobile);
    renderLeftRow('Email Id', contactEmail);
    renderLeftRow('Contact Person', contactName);
    renderLeftRow('Designation', contactDesignation);

    // Right Table Rows (Company Info)
    let rightY = startY + 24;
    const rightFields = [
      ['Order #', orderNo],
      ['Order Date', orderDate],
      ['Marketing Ref.', mktgRef],
      ['Mktg SBU', mktgSbu],
      ['Mktg Executive', mktgExec],
      ['Tech SBU', techSbu],
      ['Tech Vertical', techExec],
    ];

    rightFields.forEach(([label, val]) => {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(label, 25 + col1Width + 8, rightY, { width: 85 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e40af').text(`: ${val}`, 25 + col1Width + 90, rightY, { width: 98 });
      rightY += 16.5;
    });

    // ── Services Table Header (Matching Image 1 Stacked Header) ─────────────
    let tableY = startY + boxHeight + 8;

    const colX = {
      feature: 25,
      desc: 155,
      duration: 290,
      period: 340,
      amount: 470,
    };
    const colW = {
      feature: 130,
      desc: 135,
      duration: 50,
      period: 130,
      amount: 100,
    };

    const headerHeight = 28;
    doc.rect(25, tableY, tableWidth, headerHeight).fillAndStroke('#d1d5db', borderColor);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');

    // Vertical Divider Lines in Header
    doc.moveTo(colX.desc, tableY).lineTo(colX.desc, tableY + headerHeight).stroke(borderColor);
    doc.moveTo(colX.duration, tableY).lineTo(colX.duration, tableY + headerHeight).stroke(borderColor);
    doc.moveTo(colX.period, tableY).lineTo(colX.period, tableY + headerHeight).stroke(borderColor);
    doc.moveTo(colX.amount, tableY).lineTo(colX.amount, tableY + headerHeight).stroke(borderColor);

    // Header Text
    doc.text('Feature', colX.feature, tableY + 9, { width: colW.feature, align: 'center' });
    doc.text('Description', colX.desc, tableY + 9, { width: colW.desc, align: 'center' });
    doc.text('Duration', colX.duration, tableY + 9, { width: colW.duration, align: 'center' });
    doc.text('Period', colX.period, tableY + 9, { width: colW.period, align: 'center' });

    // Stacked Amount Header (Amount on Top, In Rs. on Bottom)
    doc.text('Amount', colX.amount, tableY + 4, { width: colW.amount, align: 'center' });
    doc.fontSize(8).font('Helvetica-Bold').text('In Rs.', colX.amount, tableY + 16, { width: colW.amount, align: 'center' });

    tableY += headerHeight;

    // Services Rows & Total Calculation
    let subtotal = 0;
    let mainCategoryName = 'Service';

    (account.services || []).forEach((svc: any, idx: number) => {
      const amt = Number(svc.amount_due || 0);
      subtotal += amt;

      if (idx === 0 && svc.service_master?.category?.name) {
        mainCategoryName = svc.service_master.category.name;
      }

      // Clean Duration Formatting (e.g. 12 Months -> 1 Year, 1 Months -> 1 Month)
      const durationVal = Number(svc.duration_value || svc.duration || 1);
      const durationUnitRaw = (svc.duration_unit || 'Months').toString().toLowerCase();
      let durationStr = '';
      if (durationVal === 12 && (durationUnitRaw.startsWith('month') || durationUnitRaw === 'm')) {
        durationStr = '1 Year';
      } else if (durationVal === 1 && (durationUnitRaw.startsWith('year') || durationUnitRaw === 'y')) {
        durationStr = '1 Year';
      } else if (durationUnitRaw.startsWith('year') || durationUnitRaw === 'y') {
        durationStr = `${durationVal} ${durationVal === 1 ? 'Year' : 'Years'}`;
      } else {
        durationStr = `${durationVal} ${durationVal === 1 ? 'Month' : 'Months'}`;
      }

      // A renewal order starts at the service's current expiry and runs for the
      // configured service duration. Fall back to activation only when an
      // expiry is unavailable (for draft/registration previews).
      const periodStr = calculateRenewalPeriod(
        svc.expiry_date,
        svc.activation_date,
        durationVal,
        durationUnitRaw,
      ).label;

      const featureName = `${idx + 1}. ${svc.service_master?.name || 'Service'}`;

      // Description logic: identifier + " - " + plan if both exist
      let descStr = 'Standard Service';
      if (svc.identifier && svc.plan_name) {
        descStr = `${svc.identifier} - ${svc.plan_name}`;
      } else if (svc.identifier) {
        descStr = svc.identifier;
      } else if (svc.plan_name) {
        descStr = svc.plan_name;
      }
      if (svc.order_number) {
        descStr = `${descStr} · Order ${svc.order_number}`;
      }

      const rowHeight = 22;

      // Draw Row Box & Vertical Column Lines
      doc.rect(25, tableY, tableWidth, rowHeight).stroke(borderColor);
      doc.moveTo(colX.desc, tableY).lineTo(colX.desc, tableY + rowHeight).stroke(borderColor);
      doc.moveTo(colX.duration, tableY).lineTo(colX.duration, tableY + rowHeight).stroke(borderColor);
      doc.moveTo(colX.period, tableY).lineTo(colX.period, tableY + rowHeight).stroke(borderColor);
      doc.moveTo(colX.amount, tableY).lineTo(colX.amount, tableY + rowHeight).stroke(borderColor);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
        .text(featureName, colX.feature + 6, tableY + 5, { width: colW.feature - 10 });

      doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b')
        .text(descStr, colX.desc + 6, tableY + 5, { width: colW.desc - 10 });

      doc.text(durationStr, colX.duration, tableY + 5, { width: colW.duration, align: 'center' });
      doc.text(periodStr, colX.period, tableY + 5, { width: colW.period, align: 'center' });
      doc.font('Helvetica-Bold').text(formatNumber(amt), colX.amount, tableY + 5, { width: colW.amount - 10, align: 'right' });

      tableY += rowHeight;
    });

    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    // Subtotal Row
    doc.rect(25, tableY, tableWidth, 18).stroke(borderColor);
    doc.moveTo(colX.amount, tableY).lineTo(colX.amount, tableY + 18).stroke(borderColor);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
      .text('Total', colX.period - 40, tableY + 4, { width: colW.period + 30, align: 'right' });
    doc.text(formatNumber(subtotal), colX.amount, tableY + 4, { width: colW.amount - 10, align: 'right' });
    tableY += 18;

    // GST Row
    doc.rect(25, tableY, tableWidth, 18).stroke(borderColor);
    doc.moveTo(colX.amount, tableY).lineTo(colX.amount, tableY + 18).stroke(borderColor);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
      .text('GST / Service Tax @ 18%', colX.period - 60, tableY + 4, { width: colW.period + 50, align: 'right' });
    doc.text(formatNumber(taxAmount), colX.amount, tableY + 4, { width: colW.amount - 10, align: 'right' });
    tableY += 18;

    // Grand Total Row
    doc.rect(25, tableY, tableWidth, 20).fillAndStroke('#dbeafe', borderColor);
    doc.moveTo(colX.amount, tableY).lineTo(colX.amount, tableY + 20).stroke(borderColor);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1e40af')
      .text('Grand Total', colX.period - 40, tableY + 5, { width: colW.period + 30, align: 'right' });
    doc.text(formatNumber(grandTotal), colX.amount, tableY + 5, { width: colW.amount - 10, align: 'right' });
    tableY += 24;

    // ── Payment Terms Box (Matching Image 1) ────────────────────────────────
    const pLabelWidth = 150;
    const pValueWidth = 395;

    doc.rect(25, tableY, tableWidth, 54).stroke(borderColor);

    // Row 1: PAYMENT TERMS | Service Cost / Domain Cost
    doc.rect(25, tableY, pLabelWidth, 18).fillAndStroke('#d1d5db', borderColor);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('PAYMENT TERMS', 30, tableY + 4);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
      .text(`${mainCategoryName} Cost / Service Charge`, 25 + pLabelWidth, tableY + 4, { width: pValueWidth, align: 'center' });

    // Row 2: Payment % | 100% in Advance
    doc.rect(25, tableY + 18, pLabelWidth, 18).fillAndStroke('#d1d5db', borderColor);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('Payment %', 30, tableY + 22);
    doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b')
      .text('100% in Advance', 25 + pLabelWidth, tableY + 22, { width: pValueWidth, align: 'center' });

    // Row 3: Total Value in Rs. | Amount
    doc.rect(25, tableY + 36, pLabelWidth, 18).fillAndStroke('#d1d5db', borderColor);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('Total Value in Rs.', 30, tableY + 40);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#15803d')
      .text(formatNumber(grandTotal), 25 + pLabelWidth, tableY + 40, { width: pValueWidth, align: 'center' });

    tableY += 60;

    // ── Terms & Conditions ──────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Terms and conditions :', 25, tableY);
    tableY += 12;

    const terms = [
      `1. This order form is as an authorisation from the said client retaining the services of ${companyName} for domain name registration, displaying the client's information on the Internet, hosting, designing, software application development and remitting foreign exchange for the same as applicable.`,
      `2. Pricing may vary according to the clients demand for extra or special requirements or features, for which a separate order form will have to be issued. Also, prices may vary based on local currency fluctuations and ${companyShortName} has the right to revise recurring pricing yearly depending on change in Domain registration / US server costs.`,
      `3. Strict adherence to payment structure will enable ${companyShortName} to provide prompt and effective service. Delayed payment or non-payment of payment charges / dues will lead to project stoppage / automatic account deactivation.`,
      '4. Service Tax / GST is applicable and is charged accordingly in the order form. Sales Tax and other taxes at present are nil, if the Government imposes such direct / indirect taxes then same will be applicable over & above quoted price vide our invoice or supplementary invoice and to be paid for by client retrospectively.',
      `5. ${companyShortName} will utilize its best efforts to maintain acceptable performance of services contracted for the various Packages, but ${companyShortName} makes absolutely no warranties whatsoever, express or implied, including warranty of merchantability or fitness for a particular purpose. ${companyShortName} cannot guarantee continuous service, service at any particular time, or integrity of data stored or transmitted via its system or via the Internet.`,
      `6. All payments are to be made in the form of Cheque / Demand Draft - account payee in favour of ${companyName}. All payments are non-refundable. All disputes are subject to Coimbatore Jurisdiction only.`,
    ];

    doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
    terms.forEach(t => {
      const paraHeight = doc.heightOfString(t, { width: 545, align: 'justify' });
      doc.text(t, 25, tableY, { width: 545, align: 'justify' });
      tableY += paraHeight + 3;
    });

    tableY += 10;

    // ── Authorised Signatories (Matching Selected Company Entity) ────────────
    const sigColWidth = 272.5;
    const sigBoxHeight = 65; // Ample signing height (50pt blank + 15pt text)

    // Outer Signature Box
    doc.rect(25, tableY, sigColWidth, sigBoxHeight).stroke(borderColor);
    doc.rect(25 + sigColWidth, tableY, sigColWidth, sigBoxHeight).stroke(borderColor);

    // Bottom Shaded Title Bar for Signatures
    const sigTitleY = tableY + 38;
    doc.rect(25, sigTitleY, sigColWidth, 27).fillAndStroke('#e2e8f0', borderColor);
    doc.rect(25 + sigColWidth, sigTitleY, sigColWidth, 27).fillAndStroke('#e2e8f0', borderColor);

    // Left Signature Label
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155')
      .text('Authorised Signatory', 25, sigTitleY + 3, { width: sigColWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor)
      .text(`For ${companyName}`, 25, sigTitleY + 14, { width: sigColWidth, align: 'center' });

    // Right Signature Label
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155')
      .text('Authorised Signatory', 25 + sigColWidth, sigTitleY + 3, { width: sigColWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor)
      .text('For Customer', 25 + sigColWidth, sigTitleY + 14, { width: sigColWidth, align: 'center' });

    tableY += sigBoxHeight + 12;

    // ── Footer (Dynamic Company Entity Header & Addresses) ──────────────────
    doc.fontSize(13).font('Helvetica-Bold').fillColor(primaryColor)
      .text(`${companyName}`, 25, tableY);

    tableY += 18;
    doc.moveTo(25, tableY).lineTo(570, tableY).stroke('#94a3b8');
    tableY += 6;

    const footLeftX = 25;
    const footRightX = 300;

    // Vertical Divider Line in Footer
    doc.moveTo(290, tableY).lineTo(290, tableY + 42).stroke('#cbd5e1');

    // Left Column Address & Operations
    doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
      .text('#1247 (Old # 1144) Trichy Road,', footLeftX, tableY)
      .text('Coimbatore - 641 045, India', footLeftX, tableY + 10)
      .text('Operations @ USA, CA, UK, UAE, IN, SG, HK, AU', footLeftX, tableY + 20);

    doc.fillColor('#1d4ed8').font('Helvetica-Bold')
      .text(companyEmail, footLeftX, tableY + 30, { underline: true });

    // Right Column Contact Details
    doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
      .text('Tel : +91-422-2312707, 2313938', footRightX, tableY)
      .text('Fax : +91-422-2313936', footRightX, tableY + 10)
      .text(`Visit us at : ${companyDomain}`, footRightX, tableY + 20);

    // Page Numbering
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b')
      .text('Pg. 1/1', 480, tableY + 30, { width: 90, align: 'right' });

    doc.end();

    stream.on('finish', () => {
      resolve({ filePath, relativeUrl });
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

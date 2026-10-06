import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { renderTemplate } from '../utils/templateRenderer';
import { ensureResponsiveEmailHtml } from '../utils/emailHtmlCompatibility';

export const TOKEN_REGISTRY = [
  // Customer
  { key: 'customer_name',         label: 'Customer Name',         category: 'Customer',  sample: 'M/s. XYZ Ltd' },
  { key: 'customer_address',      label: 'Customer Address',      category: 'Customer',  sample: '1144 Trichy Road, Ramanathapuram' },
  { key: 'customer_city_pincode', label: 'City & Pin Code',       category: 'Customer',  sample: 'Coimbatore - 641 045' },
  { key: 'customer_phone',        label: 'Phone No',              category: 'Customer',  sample: '91-422-2313938' },
  { key: 'customer_mobile',       label: 'Mobile No',             category: 'Customer',  sample: '9361663946' },
  { key: 'customer_email',        label: 'Email Id',              category: 'Customer',  sample: 'info@angleritech.com' },
  { key: 'contact_person',        label: 'Contact Person',        category: 'Customer',  sample: 'Mr. XYZ' },
  { key: 'contact_designation',   label: 'Designation',           category: 'Customer',  sample: 'Executive Director' },
  // Order & ANGLER Internal
  { key: 'order_number',          label: 'Order #',               category: 'Order',     sample: '216675' },
  { key: 'order_date',            label: 'Order Date',            category: 'Order',     sample: '24-Nov-2026' },
  { key: 'marketing_ref',         label: 'Marketing Ref',         category: 'Order',     sample: 'RN/HO/26-27/' },
  { key: 'mktg_sbu',              label: 'Mktg SBU',              category: 'Order',     sample: 'HO Renewals' },
  { key: 'mktg_executive',        label: 'Mktg Executive',        category: 'Order',     sample: 'Admin' },
  { key: 'tech_sbu',              label: 'Tech SBU',              category: 'Order',     sample: 'Admin' },
  { key: 'tech_vertical',         label: 'Tech Vertical',         category: 'Order',     sample: 'Admin' },
  // Service
  { key: 'service_title',         label: 'Service Name',          category: 'Service',   sample: 'Domain Name Renewal' },
  { key: 'service_category',      label: 'Service Category',      category: 'Service',   sample: 'Domain' },
  { key: 'domain_url',            label: 'Domain / Description',  category: 'Service',   sample: 'www.xyz.com' },
  { key: 'duration_period',       label: 'Period / Dates',        category: 'Service',   sample: '28th Nov 2026 - 27th Nov 2027' },
  { key: 'provider_name',         label: 'Provider',              category: 'Service',   sample: 'GoDaddy' },
  // Renewal
  { key: 'expiry_date',           label: 'Expiry Date',           category: 'Renewal',   sample: '27 Nov 2027', computed: true },
  { key: 'days_remaining',        label: 'Days Remaining',        category: 'Renewal',   sample: '30', computed: true },
  // Financial
  { key: 'amount_due',            label: 'Amount Due',            category: 'Financial', sample: '₹850', computed: true },
  { key: 'subtotal',              label: 'Subtotal Amount',       category: 'Financial', sample: '₹850', computed: true },
  { key: 'tax_percentage',        label: 'Tax %',                 category: 'Financial', sample: '18%', computed: true },
  { key: 'tax_amount',            label: 'Tax Amount',            category: 'Financial', sample: '₹153', computed: true },
  { key: 'grand_total',           label: 'Grand Total Amount',    category: 'Financial', sample: '₹1,003', computed: true },
  { key: 'payment_terms_label',   label: 'Payment Terms Label',   category: 'Financial', sample: 'Domain Cost' },
  { key: 'payment_percentage',    label: 'Payment Percentage',    category: 'Financial', sample: '100% in Advance' },
  // Brand
  { key: 'sender_name',           label: 'Sender Name',           category: 'Brand',     sample: 'ANGLER Technologies India Pvt Ltd' },
  { key: 'company_address',       label: 'Company Address',       category: 'Brand',     sample: '#1247 (Old # 1144) Trichy Road, Coimbatore - 641 045' },
  // Proforma Invoice
  { key: 'invoice_no',            label: 'Proforma Invoice No.',    category: 'Invoice',   sample: 'PRO/TRINETRA/079/26-27' },
  { key: 'invoice_date',          label: 'Invoice Date',            category: 'Invoice',   sample: '04.09.2026' },
  { key: 'billing_period_start',  label: 'Billing Period Start',    category: 'Invoice',   sample: '25-Sep-2026' },
  { key: 'billing_period_end',    label: 'Billing Period End',      category: 'Invoice',   sample: '24-Sep-2027' },
  { key: 'payment_due_date',      label: 'Payment Due Date',        category: 'Invoice',   sample: '24-Sep-2026' },
  { key: 'customer_gst_no',       label: 'Customer GST No.',        category: 'Invoice',   sample: '33AAACL0534B1ZD' },
  { key: 'customer_order_no',     label: 'Customer Order No.',      category: 'Invoice',   sample: 'DOM/2023046' },
  { key: 'po_reference',          label: 'PO Reference',            category: 'Invoice',   sample: 'LRL\\W\\64\\2324' },
  { key: 'items_rows',            label: 'Invoice Item Rows',       category: 'Invoice',   sample: '<tr>…</tr>', computed: true },
  { key: 'total_amount',          label: 'Total Amount',            category: 'Invoice',   sample: '29,760', computed: true },
  { key: 'cgst_amount',           label: 'CGST @ 9%',               category: 'Invoice',   sample: '2,678', computed: true },
  { key: 'sgst_amount',           label: 'SGST @ 9%',               category: 'Invoice',   sample: '2,678', computed: true },
  { key: 'amount_in_words',       label: 'Amount in Words',         category: 'Invoice',   sample: 'Thirty Five Thousand …', computed: true },
  { key: 'bank_account_name',     label: 'Bank Account Name',       category: 'Invoice',   sample: 'TRINETRA Wireless Pvt Ltd' },
  { key: 'bank_name',             label: 'Bank Name',               category: 'Invoice',   sample: 'State Bank of India' },
  { key: 'bank_branch',           label: 'Bank Branch',             category: 'Invoice',   sample: 'Red Fields Branch' },
  { key: 'bank_branch_address',   label: 'Branch Address',          category: 'Invoice',   sample: '1114C, Trichy Road, Coimbatore - 641 045' },
  { key: 'bank_ifsc',             label: 'IFSC Code',               category: 'Invoice',   sample: 'SBIN0006577' },
  { key: 'bank_account_no',       label: 'Account Number',          category: 'Invoice',   sample: '30995705595' },
  { key: 'logo_url',              label: 'Company Logo URL',        category: 'Brand',     sample: '/uploads/branding/trinetra_logo.png' },
];

// GET /api/renewal-templates/tokens
export const listTokens = (_req: Request, res: Response) => {
  res.json({ success: true, data: TOKEN_REGISTRY });
};

// GET /api/renewal-templates
export const listTemplates = async (req: Request, res: Response) => {
  try {
    const { channel, category_code, search } = req.query as any;
    const where: any = { is_active: true };
    if (channel) where.channel = channel;
    if (category_code) where.category_code = category_code;
    if (search) where.name = { contains: search };

    const templates = await (prisma as any).renewalNotificationTemplate.findMany({
      where,
      select: {
        id: true, name: true, channel: true, category_code: true,
        subject: true, is_active: true, created_at: true, updated_at: true,
        brand_profile: { select: { id: true, profile_name: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: templates });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/renewal-templates/:id/builder  (includes editor_json — NOT in list)
export const getTemplateBuilder = async (req: Request, res: Response) => {
  try {
    const template = await (prisma as any).renewalNotificationTemplate.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { brand_profile: true },
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    let parsedEditorJson = template.editor_json;
    if (typeof parsedEditorJson === 'string') {
      try {
        parsedEditorJson = JSON.parse(parsedEditorJson);
      } catch {
        // keep string
      }
    }
    res.json({ success: true, data: { ...template, editor_json: parsedEditorJson } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/renewal-templates/:id/builder  (save GrapesJS project + compiled HTML)
export const saveTemplateBuilder = async (req: Request, res: Response) => {
  try {
    const { editor_json, compiled_html, subject, brand_profile_id } = req.body;
    if (!editor_json && !compiled_html) {
      return res.status(400).json({ success: false, message: 'editor_json or compiled_html required' });
    }

    const editorJsonStr = editor_json
      ? (typeof editor_json === 'string' ? editor_json : JSON.stringify(editor_json))
      : undefined;

    const updated = await (prisma as any).renewalNotificationTemplate.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(editorJsonStr !== undefined && { editor_json: editorJsonStr }),
        ...(compiled_html && { compiled_html, body_html: compiled_html }),
        ...(subject && { subject }),
        ...(brand_profile_id !== undefined && { brand_profile_id }),
      },
    });
    res.json({ success: true, data: { id: updated.id, name: updated.name, updated_at: updated.updated_at } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-templates/:id/builder/preview  (render with sample data)
export const previewTemplate = async (req: Request, res: Response) => {
  try {
    const template = await (prisma as any).renewalNotificationTemplate.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { compiled_html: true, body_html: true, brand_profile: true },
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const html = template.compiled_html || template.body_html;
    const sampleData: Record<string, string> = {};
    TOKEN_REGISTRY.forEach(t => { sampleData[t.key] = t.sample; });

    const rendered = ensureResponsiveEmailHtml(renderTemplate(html, sampleData));
    res.json({ success: true, data: { html: rendered } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/renewal-templates  (create blank or from starter)
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { name, channel = 'EMAIL', category_code, subject, brand_profile_id } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const created = await (prisma as any).renewalNotificationTemplate.create({
      data: {
        name, channel, category_code: category_code ?? null, subject: subject ?? name,
        body_html: '<p>Edit this template in the visual builder.</p>',
        brand_profile_id: brand_profile_id ?? null,
      },
    });
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/renewal-templates/:id  (soft-delete)
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    await (prisma as any).renewalNotificationTemplate.update({
      where: { id: parseInt(req.params.id) },
      data: { is_active: false },
    });
    res.json({ success: true, message: 'Template deactivated' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};



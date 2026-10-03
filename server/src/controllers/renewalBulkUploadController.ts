import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { generateBulkUploadTemplate, processBulkUpload, previewBulkUpload, TemplateType } from '../services/renewalBulkUploadService';

async function getCompanyName(companyId: number): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true }
  });
  return company?.name || 'Company';
}

async function resolveParentCompanyId(type: TemplateType, providedCompanyId?: number): Promise<number | undefined> {
  if (providedCompanyId) return providedCompanyId;

  const companyName = type === 'TRINETRA_V2' ? 'Trinetra' : 'ANGLER';
  const company = await prisma.company.findFirst({
    where: {
      name: { contains: companyName },
      is_active: true
    },
    select: { id: true }
  });

  return company?.id;
}

function getUploadedWorkbookBuffer(req: Request): Buffer | null {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return null;
  if (file.buffer?.length) return file.buffer;
  if (file.path && fs.existsSync(file.path)) return fs.readFileSync(file.path);
  return null;
}

/**
 * GET /api/renewals/bulk-upload/template
 * Downloads dynamic Excel template with live master dropdowns
 */
export const downloadTemplate = async (req: Request, res: Response) => {
  try {
    const type = (req.query.type as TemplateType) || 'FULL_RENEWAL';
    const parentCompanyId = req.query.parentCompanyId ? parseInt(String(req.query.parentCompanyId)) : undefined;
    const templateVersion = req.query.version as string;
    const buffer = await generateBulkUploadTemplate(type, parentCompanyId, templateVersion);

    const parentCompanyName = parentCompanyId ? await getCompanyName(parentCompanyId) : 'ANGLER';
    const filename = type === 'TRINETRA_V2'
      ? `TRINETRA_V2_Renewal_Bulk_Import_Template.xlsx`
      : (type === 'FULL_RENEWAL'
        ? `${parentCompanyName}_V2_Renewal_Bulk_Import_Template.xlsx`
        : `${parentCompanyName}_Masters_Bulk_Import_Template.xlsx`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('[downloadTemplate Error]:', err);
    res.status(500).json({ message: 'Error generating bulk upload template', detail: err.message });
  }
};

/**
 * POST /api/renewals/bulk-upload/preview
 * Parses and validates uploaded Excel file without writing to DB
 */
export const previewUpload = async (req: Request, res: Response) => {
  try {
    const fileBuffer = getUploadedWorkbookBuffer(req);
    if (!fileBuffer) {
      return res.status(400).json({ message: 'Excel file (.xlsx) is required' });
    }

    const previewResult = await previewBulkUpload(fileBuffer);
    res.status(200).json(previewResult);
  } catch (err: any) {
    console.error('[previewUpload Error]:', err);
    res.status(500).json({ message: 'Error previewing bulk upload file', detail: err.message });
  }
};

/**
 * POST /api/renewals/bulk-upload/process
 * Validates and imports uploaded Excel file
 */
export const processUpload = async (req: Request, res: Response) => {
  try {
    const fileBuffer = getUploadedWorkbookBuffer(req);
    if (!fileBuffer) {
      return res.status(400).json({ message: 'Excel file (.xlsx) is required' });
    }

    const originalName = (req.file as Express.Multer.File | undefined)?.originalname || '';
    const requestedType = req.body?.type as TemplateType | undefined;
    const type = requestedType || (/trinetra/i.test(originalName) ? 'TRINETRA_V2' : 'FULL_RENEWAL');
    const userId = (req as any).user?.id || 1;
    const providedParentCompanyId = req.body?.parentCompanyId ? parseInt(String(req.body.parentCompanyId)) : undefined;
    const parentCompanyId = await resolveParentCompanyId(type, providedParentCompanyId);

    const result = await processBulkUpload(fileBuffer, type, userId, parentCompanyId);

    if (!result.success) {
      return res.status(400).json({
        message: 'Validation failed on Excel rows',
        result
      });
    }

    res.status(200).json({
      message: 'Bulk renewal import completed successfully',
      result
    });
  } catch (err: any) {
    console.error('[processUpload Error]:', err);
    res.status(500).json({ message: 'Error processing bulk upload', detail: err.message });
  }
};

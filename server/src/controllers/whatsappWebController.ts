import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  initWhatsappSession,
  logoutWhatsappSession,
  sendWhatsappMessage,
} from '../services/whatsappWebBridgeService';

/**
 * List all WhatsApp Web sessions
 */
export const getSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await (prisma as any).whatsappWebSession.findMany({
      where: { is_active: true },
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WhatsApp sessions',
      error: err.message,
    });
  }
};

/**
 * Dynamically create a new WhatsApp Web Gateway Account (e.g., Trinetra or new company)
 */
export const createSession = async (req: Request, res: Response) => {
  try {
    const { session_name, brand_key, phone_number, company_id, is_default } = req.body;

    if (!session_name || !brand_key) {
      return res.status(400).json({
        success: false,
        message: 'session_name and brand_key are required',
      });
    }

    const normalizedBrandKey = String(brand_key).trim().toUpperCase().replace(/\s+/g, '_');

    // Check unique constraint
    const existing = await (prisma as any).whatsappWebSession.findUnique({
      where: { brand_key: normalizedBrandKey },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A session with brand key "${normalizedBrandKey}" already exists.`,
      });
    }

    if (is_default) {
      // Unset previous defaults
      await (prisma as any).whatsappWebSession.updateMany({
        where: { is_default: true },
        data: { is_default: false },
      });
    }

    const session = await (prisma as any).whatsappWebSession.create({
      data: {
        session_name: session_name.trim(),
        brand_key: normalizedBrandKey,
        phone_number: phone_number ? String(phone_number).trim() : null,
        company_id: company_id ? parseInt(String(company_id)) : null,
        is_default: Boolean(is_default),
        status: 'DISCONNECTED',
      },
    });

    res.status(201).json({
      success: true,
      message: 'WhatsApp Gateway Account created successfully',
      data: session,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create WhatsApp session',
      error: err.message,
    });
  }
};

/**
 * Initialize / Connect session (Triggers Baileys QR generation)
 */
export const connectSession = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const session = await (prisma as any).whatsappWebSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Trigger async init
    initWhatsappSession(id).catch((err) =>
      console.error(`[WhatsAppController] Error connecting session #${id}:`, err)
    );

    res.json({
      success: true,
      message: 'Initializing connection... QR code will be generated shortly.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to initiate connection',
      error: err.message,
    });
  }
};

/**
 * Get single session status and QR code base64
 */
export const getSessionQR = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const session = await (prisma as any).whatsappWebSession.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get session status',
      error: err.message,
    });
  }
};

/**
 * Set session as global default gateway
 */
export const setDefaultSession = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await (prisma as any).whatsappWebSession.updateMany({
      data: { is_default: false },
    });

    const updated = await (prisma as any).whatsappWebSession.update({
      where: { id },
      data: { is_default: true },
    });

    res.json({
      success: true,
      message: `Set "${updated.session_name}" as default WhatsApp Gateway`,
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to set default session',
      error: err.message,
    });
  }
};

/**
 * Disconnect and log out session
 */
export const disconnectSession = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await logoutWhatsappSession(id);

    res.json({
      success: true,
      message: 'Session disconnected and logged out successfully',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect session',
      error: err.message,
    });
  }
};

/**
 * Send a manual test WhatsApp message
 */
export const testSendMessage = async (req: Request, res: Response) => {
  try {
    const { phone_number, message, brand_key, company_id } = req.body;

    if (!phone_number || !message) {
      return res.status(400).json({
        success: false,
        message: 'phone_number and message are required',
      });
    }

    const result = await sendWhatsappMessage({
      recipientPhone: phone_number,
      messageText: message,
      brandKey: brand_key,
      companyId: company_id ? parseInt(String(company_id)) : undefined,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to send test WhatsApp message',
      });
    }

    res.json({
      success: true,
      message: 'Test WhatsApp message sent successfully!',
      message_id: result.messageId,
      sent_via_phone: result.sessionPhone,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Error sending test message',
      error: err.message,
    });
  }
};

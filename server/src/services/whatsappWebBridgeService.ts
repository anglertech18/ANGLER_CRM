import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';

// Map of active Baileys socket instances keyed by brand_key
const activeSockets = new Map<string, WASocket>();
// Map of pending QR codes keyed by brand_key
const qrCache = new Map<string, string>();
// Map of consecutive reconnect attempt counts per brand_key for exponential backoff
const reconnectAttemptsMap = new Map<string, number>();

const SESSIONS_BASE_DIR = path.join(process.cwd(), 'whatsapp-sessions');

if (!fs.existsSync(SESSIONS_BASE_DIR)) {
  fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
}

/**
 * Format raw phone number into E.164 WhatsApp JID (e.g. 918098002714@s.whatsapp.net)
 */
export function formatToWhatsappJid(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  // Default to India country code 91 if 10 digits
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Initialize or reconnect a WhatsApp Web Session for a given brand_key (e.g. ANGLER_PRIMARY)
 */
export async function initWhatsappSession(sessionDbId: number): Promise<void> {
  const sessionRecord = await (prisma as any).whatsappWebSession.findUnique({
    where: { id: sessionDbId },
  });

  if (!sessionRecord || !sessionRecord.is_active) {
    throw new Error(`WhatsApp session record #${sessionDbId} not found or inactive`);
  }

  const brandKey = sessionRecord.brand_key;

  // Close existing socket if reconnecting
  if (activeSockets.has(brandKey)) {
    try {
      const existing = activeSockets.get(brandKey);
      existing?.end(undefined);
      activeSockets.delete(brandKey);
    } catch (e) {
      console.warn(`[WhatsAppWeb] Error closing existing socket for ${brandKey}:`, e);
    }
  }

  const sessionFolder = path.join(SESSIONS_BASE_DIR, brandKey);
  if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

  // Update DB status to CONNECTING
  await (prisma as any).whatsappWebSession.update({
    where: { id: sessionDbId },
    data: { status: 'CONNECTING', error_message: null },
  });

  try {
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as any }));

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Angler CRM', 'Chrome', '1.0.0'],
    });

    activeSockets.set(brandKey, socket);

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrBase64 = await QRCode.toDataURL(qr);
          qrCache.set(brandKey, qrBase64);

          await (prisma as any).whatsappWebSession.update({
            where: { id: sessionDbId },
            data: {
              status: 'SCAN_QR',
              qr_code_base64: qrBase64,
            },
          });
          console.log(`[WhatsAppWeb] QR code generated for ${brandKey} (${sessionRecord.session_name})`);
        } catch (qrErr) {
          console.error(`[WhatsAppWeb] Failed to render QR code for ${brandKey}:`, qrErr);
        }
      }

      if (connection === 'open') {
        reconnectAttemptsMap.delete(brandKey);
        qrCache.delete(brandKey);
        const myJid = socket.user?.id || '';
        const phone = myJid.split(':')[0] || myJid.split('@')[0] || sessionRecord.phone_number;

        await (prisma as any).whatsappWebSession.update({
          where: { id: sessionDbId },
          data: {
            status: 'CONNECTED',
            qr_code_base64: null,
            phone_number: phone,
            connected_at: new Date(),
            last_active_at: new Date(),
            error_message: null,
          },
        });

        console.log(`[WhatsAppWeb] Session ${brandKey} CONNECTED successfully! Phone: ${phone}`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        const currentAttempts = (reconnectAttemptsMap.get(brandKey) || 0) + 1;
        reconnectAttemptsMap.set(brandKey, currentAttempts);

        // Exponential backoff: 4s, 8s, 16s, max 30s
        const backoffMs = Math.min(30000, 2000 * Math.pow(2, currentAttempts));

        console.warn(`[WhatsAppWeb] Session ${brandKey} closed. Reason code: ${statusCode}. Reconnect attempt #${currentAttempts} scheduled in ${backoffMs}ms`);

        if (shouldReconnect) {
          await (prisma as any).whatsappWebSession.update({
            where: { id: sessionDbId },
            data: {
              status: 'CONNECTING',
              error_message: `Phone connection temporarily interrupted. Reconnecting (attempt #${currentAttempts}) in ${Math.round(backoffMs / 1000)}s...`,
            },
          });
          setTimeout(() => initWhatsappSession(sessionDbId), backoffMs);
        } else {
          // Logged out from phone
          reconnectAttemptsMap.delete(brandKey);
          activeSockets.delete(brandKey);
          qrCache.delete(brandKey);

          await (prisma as any).whatsappWebSession.update({
            where: { id: sessionDbId },
            data: {
              status: 'DISCONNECTED',
              qr_code_base64: null,
              error_message: 'Logged out from physical phone. Click "Generate QR Code" to pair again.',
            },
          });

          // Send in-app alert notification to admin users
          await notifyAdminsSessionDisconnected(sessionRecord.session_name);
        }
      }
    });

  } catch (err: any) {
    console.error(`[WhatsAppWeb] Error initializing session ${brandKey}:`, err);
    await (prisma as any).whatsappWebSession.update({
      where: { id: sessionDbId },
      data: {
        status: 'DISCONNECTED',
        error_message: 'Unable to start WhatsApp Gateway. Please check your network connection and click "Generate QR Code".',
      },
    });
  }
}

/**
 * Send a WhatsApp text message via specified company/session
 */
export async function sendWhatsappMessage(params: {
  companyId?: number;
  brandKey?: string;
  recipientPhone: string;
  messageText: string;
}): Promise<{ success: boolean; messageId?: string; sessionPhone?: string; error?: string }> {
  let targetSession: any = null;

  if (params.brandKey) {
    targetSession = await (prisma as any).whatsappWebSession.findUnique({
      where: { brand_key: params.brandKey },
    });
  } else if (params.companyId) {
    targetSession = await (prisma as any).whatsappWebSession.findFirst({
      where: { company_id: params.companyId, is_active: true, status: 'CONNECTED' },
    });
  }

  // Fallback to default session if company mapping not connected
  if (!targetSession || targetSession.status !== 'CONNECTED') {
    targetSession = await (prisma as any).whatsappWebSession.findFirst({
      where: { is_default: true, is_active: true, status: 'CONNECTED' },
    });
  }

  // Fallback to ANY connected session if default is not connected
  if (!targetSession || targetSession.status !== 'CONNECTED') {
    targetSession = await (prisma as any).whatsappWebSession.findFirst({
      where: { is_active: true, status: 'CONNECTED' },
    });
  }

  if (!targetSession) {
    return {
      success: false,
      error: 'WhatsApp Gateway is not connected. Please open Settings -> WhatsApp Gateway and pair your phone.',
    };
  }

  const socket = activeSockets.get(targetSession.brand_key);
  if (!socket) {
    return {
      success: false,
      error: `WhatsApp connection for "${targetSession.session_name}" is currently offline. Please ensure your physical phone is turned on and connected to internet.`,
    };
  }

  const jid = formatToWhatsappJid(params.recipientPhone);
  if (!jid || jid === '@s.whatsapp.net') {
    return {
      success: false,
      error: `Invalid or missing recipient phone number (${params.recipientPhone || 'empty'}). Please update the customer contact details.`,
    };
  }

  try {
    const sentMsg = await socket.sendMessage(jid, { text: params.messageText });

    // Update last_active_at timestamp
    await (prisma as any).whatsappWebSession.update({
      where: { id: targetSession.id },
      data: { last_active_at: new Date() },
    });

    return {
      success: true,
      messageId: sentMsg?.key?.id ?? undefined,
      sessionPhone: targetSession.phone_number ?? undefined,
    };
  } catch (err: any) {
    console.error(`[WhatsAppWeb] Failed to send message to ${jid} via ${targetSession.brand_key}:`, err);
    return {
      success: false,
      error: 'Failed to deliver message to WhatsApp. Please verify the contact phone number and check that your phone is online.',
    };
  }
}

/**
 * Disconnect and logout session
 */
export async function logoutWhatsappSession(sessionDbId: number): Promise<void> {
  const sessionRecord = await (prisma as any).whatsappWebSession.findUnique({
    where: { id: sessionDbId },
  });

  if (!sessionRecord) return;

  const brandKey = sessionRecord.brand_key;
  const socket = activeSockets.get(brandKey);
  if (socket) {
    try {
      await socket.logout();
      socket.end(undefined);
    } catch (e) {
      console.warn(`[WhatsAppWeb] Error during socket logout for ${brandKey}:`, e);
    }
    activeSockets.delete(brandKey);
  }
  qrCache.delete(brandKey);

  // Clear session folder
  const sessionFolder = path.join(SESSIONS_BASE_DIR, brandKey);
  if (fs.existsSync(sessionFolder)) {
    fs.rmSync(sessionFolder, { recursive: true, force: true });
  }

  await (prisma as any).whatsappWebSession.update({
    where: { id: sessionDbId },
    data: {
      status: 'DISCONNECTED',
      qr_code_base64: null,
      error_message: 'Logged out by admin',
    },
  });
}

/**
 * Auto-initialize existing active sessions on server startup
 */
export async function bootWhatsappSessions(): Promise<void> {
  try {
    // Ensure default Angler session exists in DB
    let anglerSession = await (prisma as any).whatsappWebSession.findUnique({
      where: { brand_key: 'ANGLER_PRIMARY' },
    });

    if (!anglerSession) {
      // Find Angler company if exists
      const anglerCompany = await (prisma as any).company.findFirst({
        where: { name: { contains: 'Angler' } },
      });

      anglerSession = await (prisma as any).whatsappWebSession.create({
        data: {
          session_name: 'Angler Main (8098002714)',
          brand_key: 'ANGLER_PRIMARY',
          phone_number: '8098002714',
          company_id: anglerCompany?.id ?? null,
          is_default: true,
          status: 'DISCONNECTED',
        },
      });
      console.log('[WhatsAppWeb] Seeded default Angler WhatsApp session (ANGLER_PRIMARY)');
    }

    // Auto-connect connected/saved sessions
    const sessions = await (prisma as any).whatsappWebSession.findMany({
      where: { is_active: true },
    });

    for (const s of sessions) {
      const sessionFolder = path.join(SESSIONS_BASE_DIR, s.brand_key);
      if (fs.existsSync(sessionFolder) && fs.readdirSync(sessionFolder).length > 0) {
        console.log(`[WhatsAppWeb] Auto-restoring WhatsApp session for ${s.session_name}...`);
        initWhatsappSession(s.id).catch((err) =>
          console.error(`[WhatsAppWeb] Error restoring session ${s.session_name}:`, err)
        );
      }
    }
  } catch (err) {
    console.error('[WhatsAppWeb] Error booting WhatsApp sessions:', err);
  }
}

/**
 * Send in-app notification to CEOs and Sales Managers when session drops
 */
async function notifyAdminsSessionDisconnected(sessionName: string): Promise<void> {
  try {
    const adminUsers = await (prisma as any).user.findMany({
      where: { role: { in: ['CEO', 'SalesManager'] }, is_active: true },
      select: { id: true },
    });

    for (const u of adminUsers) {
      await (prisma as any).applicationNotification.create({
        data: {
          user_id: u.id,
          type: 'SYSTEM_ALERT',
          title: 'WhatsApp Gateway Disconnected',
          body: `WhatsApp session "${sessionName}" lost connection. Please scan QR code in CRM Settings -> WhatsApp Gateway.`,
          link: '/settings/whatsapp-gateway',
        },
      });
    }
  } catch (err) {
    console.error('[WhatsAppWeb] Failed to create disconnection alert:', err);
  }
}

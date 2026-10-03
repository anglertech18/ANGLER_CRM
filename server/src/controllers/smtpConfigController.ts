import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const uid = (req: Request) => (req as any).user?.id as number;

// AES-256-CBC Encryption settings
const ALGORITHM = 'aes-256-cbc';
const SMTP_ENCRYPT_KEY = process.env.SMTP_ENCRYPT_KEY;
if (!SMTP_ENCRYPT_KEY) {
  console.error('[SMTP] SMTP_ENCRYPT_KEY environment variable is required for password encryption');
}
const ENCRYPT_KEY = (SMTP_ENCRYPT_KEY || '').padEnd(32, '0').slice(0, 32);
const IV_LENGTH = 16;

function encryptPassword(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPT_KEY), iv);
  let encrypted = cipher.update(plain);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPassword(encrypted: string): string {
  try {
    if (!encrypted) return '';
    if (!encrypted.includes(':')) return encrypted; // Plaintext fallback
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPT_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.warn('[SMTP] Password decrypt failed, using raw string:', (err as any)?.message);
    return encrypted;
  }
}

// GET /api/smtp-config
export const getSmtpConfig = async (req: Request, res: Response) => {
  try {
    const config = await (prisma as any).smtpConfig.findFirst({
      where: { is_active: 1 },
    });

    if (!config) {
      return res.json({ success: true, data: null });
    }

    // Mask password
    const { password_enc, ...rest } = config;
    res.json({
      success: true,
      data: {
        ...rest,
        password: '••••••••',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/smtp-config
export const saveSmtpConfig = async (req: Request, res: Response) => {
  try {
    const { host, port, secure, username, password, from_email, from_name, reply_to } = req.body;
    if (!host || !username || !password || !from_email) {
      return res.status(400).json({ success: false, message: 'host, username, password, and from_email are required' });
    }

    const encryptedPassword = encryptPassword(password);
    const existing = await (prisma as any).smtpConfig.findFirst({
      where: { is_active: 1 },
    });

    let saved;
    if (existing) {
      saved = await (prisma as any).smtpConfig.update({
        where: { id: existing.id },
        data: {
          host,
          port: parseInt(port) || 587,
          secure: secure ? 1 : 0,
          username,
          password_enc: password === '••••••••' ? existing.password_enc : encryptedPassword,
          from_email,
          from_name: from_name || 'Angler iTech Solutions',
          reply_to: reply_to || null,
        },
      });
    } else {
      saved = await (prisma as any).smtpConfig.create({
        data: {
          host,
          port: parseInt(port) || 587,
          secure: secure ? 1 : 0,
          username,
          password_enc: encryptedPassword,
          from_email,
          from_name: from_name || 'Angler iTech Solutions',
          reply_to: reply_to || null,
          is_active: 1,
        },
      });
    }

    const { password_enc, ...rest } = saved;
    res.json({
      success: true,
      data: {
        ...rest,
        password: '••••••••',
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/smtp-config/test
export const testSmtpConfig = async (req: Request, res: Response) => {
  try {
    const config = await (prisma as any).smtpConfig.findFirst({
      where: { is_active: 1 },
    });

    if (!config) {
      return res.status(404).json({ success: false, message: 'SMTP Configuration not found' });
    }

    const password = decryptPassword(config.password_enc);
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure === 1,
      auth: {
        user: config.username,
        pass: password,
      },
      tls: process.env.NODE_ENV !== 'production' ? {
        rejectUnauthorized: false
      } : undefined
    });

    try {
      await transporter.verify();
      
      // Update tested status
      await (prisma as any).smtpConfig.update({
        where: { id: config.id },
        data: {
          tested_at: new Date(),
          test_result: 'Connection successful',
        },
      });

      res.json({ success: true, message: 'Connection successful' });
    } catch (verifyErr: any) {
      await (prisma as any).smtpConfig.update({
        where: { id: config.id },
        data: {
          tested_at: new Date(),
          test_result: verifyErr.message,
        },
      });
      res.status(400).json({ success: false, message: verifyErr.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// For internal outbox service use (decrypted)
export const getActiveSmtpConfigDecrypted = async () => {
  try {
    const config = await (prisma as any).smtpConfig.findFirst({
      where: { is_active: 1 },
    });
    if (config) {
      const password = decryptPassword(config.password_enc);
      return {
        host: config.host,
        port: config.port,
        secure: config.secure === 1,
        username: config.username,
        password,
        from_email: config.from_email,
        from_name: config.from_name,
        reply_to: config.reply_to || undefined,
      };
    }
  } catch (err) {
    console.error('[getActiveSmtpConfigDecrypted] Failed to load SMTP config from DB:', err);
  }

  // Fallback to process.env SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      username: process.env.SMTP_USER,
      password: process.env.SMTP_PASS || '',
      from_email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      from_name: process.env.SMTP_FROM_NAME || 'ANGLER Technologies',
      reply_to: undefined,
    };
  }

  return null;
};

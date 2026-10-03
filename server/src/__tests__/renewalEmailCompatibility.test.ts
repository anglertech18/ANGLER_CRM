import fs from 'fs';
import path from 'path';
import { ensureResponsiveEmailHtml } from '../utils/emailHtmlCompatibility';

describe('renewal email HTML compatibility', () => {
  it('adds responsive and Outlook-safe document fallbacks without changing copy', () => {
    const result = ensureResponsiveEmailHtml('<p>Original renewal copy</p>');

    expect(result).toContain('<!doctype html>');
    expect(result).toContain('name="viewport"');
    expect(result).toContain('@media only screen and (max-width: 620px)');
    expect(result).toContain('<!--[if mso]>');
    expect(result).toContain('role="presentation"');
    expect(result).toContain('width="100%"');
    expect(result).toContain('style="width:100%;max-width:750px;');
    expect(result).toContain('Original renewal copy');
  });

  it('removes unsupported layout reliance and unsafe image/link behavior', () => {
    const result = ensureResponsiveEmailHtml(
      '<div style="display:flex"><img src="logo.png" alt="Logo" onError="alert(1)"><a href="#">Renew</a></div>',
    );

    expect(result).not.toMatch(/display\s*:\s*(?:flex|grid)/i);
    expect(result).not.toMatch(/\son(?:error|load|click)\s*=/i);
    expect(result).not.toContain('href="#"');
    expect(result).toContain('alt="Logo"');
    expect(result).toContain('max-width: 100%');
  });

  it('is idempotent when preview and delivery both apply compatibility', () => {
    const once = ensureResponsiveEmailHtml('<p>Renewal</p>');
    expect(ensureResponsiveEmailHtml(once)).toBe(once);
  });

  it('routes every renewal email source through the shared compatibility layer', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const sources = [
      'prisma/seed-email-templates.ts',
      'prisma/seed-excel-templates.ts',
      'src/scripts/seedTrinetraOrderFormsAndFollowups.ts',
      'src/controllers/renewalTemplateBuilderController.ts',
      'src/services/renewalFollowUpChannelActionService.ts',
      'src/cron/renewalReminderCron.ts',
    ];

    for (const source of sources) {
      const content = fs.readFileSync(path.join(projectRoot, source), 'utf8');
      expect(content).toContain('ensureResponsiveEmailHtml');
    }
  });
});

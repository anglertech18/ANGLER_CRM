const EMAIL_DOCUMENT_MARKER = 'data-renewal-email="responsive"';

/**
 * Wrap renewal email fragments in a conservative, table-based email document.
 * Inline sizing remains the primary fallback for Outlook; the media query only
 * enhances small-screen clients that support it.
 */
export function ensureResponsiveEmailHtml(fragment: string): string {
  const html = (fragment || '')
    .trim()
    // Scriptable attributes are not useful in mail clients and are commonly stripped.
    .replace(/\s+on(?:error|load|click)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    // Outlook does not implement flex/grid email layout. Preserve readable flow.
    .replace(/display\s*:\s*(?:flex|inline-flex|grid|inline-grid)\s*;?/gi, 'display:block;')
    // A hash-only CTA is inert and can trigger link-safety checks.
    .replace(/href\s*=\s*(["'])#\1/gi, 'href="mailto:renewals@angleritech.com"');
  if (!html || html.includes(EMAIL_DOCUMENT_MARKER)) return html;

  return `<!doctype html>
<html lang="en" ${EMAIL_DOCUMENT_MARKER}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Renewal notification</title>
  <!--[if mso]>
  <xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <![endif]-->
  <style>
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; background: #f4f6f8; }
    table { border-spacing: 0; }
    img { border: 0; display: block; height: auto; max-width: 100%; }
    a { color: inherit; }
    @media only screen and (max-width: 620px) {
      .renewal-email-shell { width: 100% !important; max-width: 100% !important; }
      .renewal-email-content { padding: 12px !important; }
      .renewal-email-content table { width: 100% !important; max-width: 100% !important; }
      .renewal-email-content td, .renewal-email-content th { overflow-wrap: anywhere; }
      .renewal-email-content img { max-width: 100% !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f4f6f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f4f6f8;">
    <tr>
      <td align="center" style="padding:16px 8px;">
        <!--[if mso]><table role="presentation" width="750" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="renewal-email-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:750px;border-collapse:collapse;background-color:#ffffff;">
          <tr><td class="renewal-email-content" style="padding:0;">${html}</td></tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const POP_PRIMARY_COLOR = "#0f172a";
const POP_ACCENT_COLOR = "#f97316";

export type SignInEmailTemplateOptions = {
  url: string;
  host: string;
  expiresInMinutes: number;
};

export function renderSignInEmailHtml({ url, host, expiresInMinutes }: SignInEmailTemplateOptions) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sign in to POP LMS</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;color:${POP_PRIMARY_COLOR};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;padding:24px 0;">
      <tbody>
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
              <tbody>
                <tr>
                  <td style="text-align:center;">
                    <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:24px;">
                      <span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background-color:${POP_PRIMARY_COLOR};color:#ffffff;font-weight:700;font-size:20px;">POP</span>
                      <span style="font-weight:700;font-size:18px;letter-spacing:0.01em;color:${POP_PRIMARY_COLOR};">Initiative</span>
                    </div>
                    <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:${POP_PRIMARY_COLOR};">Your magic link is ready</h1>
                    <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#475569;">Use the secure button below to access your POP LMS account on <strong>${host}</strong>. This link will expire in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.</p>
                    <a href="${url}" style="display:inline-block;padding:14px 28px;border-radius:9999px;background:${POP_ACCENT_COLOR};color:#ffffff;font-weight:600;font-size:16px;text-decoration:none;">Sign in to POP LMS</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:32px;font-size:14px;line-height:1.5;color:#64748b;text-align:left;">
                    <p style="margin:0 0 12px;">If the button doesn’t work, copy and paste this link into your browser:</p>
                    <p style="margin:0 0 24px;word-break:break-all;"><a href="${url}" style="color:${POP_ACCENT_COLOR};text-decoration:none;">${url}</a></p>
                    <p style="margin:0;color:#94a3b8;font-size:12px;">You received this email because someone attempted to sign in to POP LMS with this address. If this wasn’t you, you can safely ignore it.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

export function renderSignInEmailText({ url, host, expiresInMinutes }: SignInEmailTemplateOptions) {
  return `Sign in to POP LMS on ${host}\n\nUse the secure link below. It expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.\n${url}\n\nIf you didn’t request this email, you can ignore it.`;
}

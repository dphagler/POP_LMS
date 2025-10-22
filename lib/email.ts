import { renderSignInEmailHtml, renderSignInEmailText } from "./email-templates/sign-in-magic-link";
import { env } from "./env";
import { createLogger } from "./logger";

const logger = createLogger({ component: "email" });

type ResendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
};

async function sendResendEmail(payload: ResendEmailPayload) {
  if (!env.RESEND_API_KEY) {
    logger.info({
      event: "email.resend_missing_key",
      message: "Resend API key missing; skipping email send."
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Failed to send email via Resend: ${message || response.statusText}`);
  }
}

export async function sendInviteEmail(email: string, inviteLink: string) {
  const fromAddress = env.AUTH_EMAIL_FROM ?? "POP LMS <team@resend.dev>";

  await sendResendEmail({
    from: fromAddress,
    to: [email],
    subject: "You're invited to the POP LMS",
    html: `<p>You've been invited to the POP LMS. Join here: <a href="${inviteLink}">Accept invite</a></p>`
  });
}

type SendSignInEmailOptions = {
  email: string;
  url: string;
  host: string;
  subject: string;
  expiresInMinutes: number;
};

export async function sendSignInEmail({ email, url, host, subject, expiresInMinutes }: SendSignInEmailOptions) {
  const fromAddress = env.AUTH_EMAIL_FROM;

  if (!fromAddress) {
    throw new Error("Missing AUTH_EMAIL_FROM environment variable.");
  }

  const html = renderSignInEmailHtml({ url, host, expiresInMinutes });
  const text = renderSignInEmailText({ url, host, expiresInMinutes });

  await sendResendEmail({
    from: fromAddress,
    to: [email],
    subject,
    html,
    text
  });
}

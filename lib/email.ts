import { ImportStatus } from "@prisma/client";

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
  subject?: string;
};

export async function sendSignInEmail(email: string, url: string, options: SendSignInEmailOptions = {}) {
  const fromAddress = env.AUTH_EMAIL_FROM;

  if (!fromAddress || !env.RESEND_API_KEY) {
    throw new Error("Email sign-in is not configured.");
  }

  let host = "POP LMS";
  try {
    host = new URL(url).host;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn({
      event: "email.magic_link.invalid_url",
      message: `Failed to parse magic link URL: ${errorMessage}`,
    });
  }

  const expiresInMinutes = Math.max(1, Math.floor(env.AUTH_EMAIL_TOKEN_MAX_AGE / 60));
  const html = renderSignInEmailHtml({ url, host, expiresInMinutes });
  const text = renderSignInEmailText({ url, host, expiresInMinutes });

  const subject = options.subject ?? env.AUTH_EMAIL_SUBJECT ?? "Sign in to POP LMS";

  await sendResendEmail({
    from: fromAddress,
    to: [email],
    subject,
    html,
    text
  });
}

type SendImportResultsEmailOptions = {
  to: string[];
  orgName: string;
  resultsUrl: string;
  status: ImportStatus;
  processedCount: number;
  successCount: number;
  errorCount: number;
  fileName: string;
};

function describeStatus(status: ImportStatus) {
  switch (status) {
    case ImportStatus.succeeded:
      return "completed successfully";
    case ImportStatus.failed:
      return "failed";
    case ImportStatus.cancelled:
      return "was cancelled";
    case ImportStatus.running:
      return "is still running";
    case ImportStatus.queued:
    default:
      return "is queued";
  }
}

export async function sendImportResultsEmail({
  to,
  orgName,
  resultsUrl,
  status,
  processedCount,
  successCount,
  errorCount,
  fileName
}: SendImportResultsEmailOptions) {
  const uniqueRecipients = Array.from(new Set(to.map((email) => email.trim()).filter((email) => email.length > 0)));

  if (uniqueRecipients.length === 0) {
    logger.info({
      event: "email.import_results.skipped",
      message: "No recipients provided; skipping import results email."
    });
    return;
  }

  const fromAddress = env.AUTH_EMAIL_FROM ?? "POP LMS <team@resend.dev>";
  const statusDescription = describeStatus(status);
  const subject = `${orgName} CSV import ${statusDescription}`;

  const html = `
    <p>Hello,</p>
    <p>Your CSV import for <strong>${orgName}</strong> ${statusDescription}.</p>
    <p><strong>File:</strong> ${fileName}</p>
    <ul>
      <li>Processed rows: ${processedCount}</li>
      <li>Successful rows: ${successCount}</li>
      <li>Rows with errors: ${errorCount}</li>
    </ul>
    <p><a href="${resultsUrl}">View the full results report</a> for detailed row-by-row information.</p>
    <p>Thanks,<br/>The POP LMS Team</p>
  `;

  const text = [
    "Hello,",
    "",
    `Your CSV import for ${orgName} ${statusDescription}.`,
    `File: ${fileName}`,
    "",
    `Processed rows: ${processedCount}`,
    `Successful rows: ${successCount}`,
    `Rows with errors: ${errorCount}`,
    "",
    `View the full results report: ${resultsUrl}`,
    "",
    "Thanks,",
    "The POP LMS Team"
  ].join("\n");

  await sendResendEmail({
    from: fromAddress,
    to: uniqueRecipients,
    subject,
    html,
    text
  });
}

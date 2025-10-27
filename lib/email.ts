import nodemailer from "nodemailer";
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

async function sendMaildevEmail(payload: ResendEmailPayload) {
  const mailOptions = {
    from: payload.from,
    to: payload.to.join(", "),
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  } satisfies nodemailer.SendMailOptions;

  const host = process.env.MAILDEV_HOST ?? "127.0.0.1";
  const parsedPort = Number.parseInt(process.env.MAILDEV_PORT ?? "", 10);
  const port = Number.isNaN(parsedPort) ? 1025 : parsedPort;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: false,
  });

  const info = await transport.sendMail(mailOptions);

  logger.info({
    event: "email.maildev_delivered",
    host,
    port,
    messageId: info.messageId,
    to: payload.to,
    subject: payload.subject,
  });
}

async function sendEtherealEmail(payload: ResendEmailPayload) {
  const mailOptions = {
    from: payload.from,
    to: payload.to.join(", "),
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  } satisfies nodemailer.SendMailOptions;

  const testAccount = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const info = await transport.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  logger.info({
    event: "email.ethereal_delivered",
    messageId: info.messageId,
    to: payload.to,
    subject: payload.subject,
    previewUrl: previewUrl ?? undefined,
  });
}

async function sendEmail(payload: ResendEmailPayload) {
  if (env.RESEND_API_KEY) {
    await sendResendEmail(payload);
    return;
  }

  try {
    await sendMaildevEmail(payload);
    return;
  } catch (error) {
    logger.warn({
      event: "email.maildev_failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await sendEtherealEmail(payload);
  } catch (error) {
    throw new Error(
      `Unable to send email using fallback transports: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function sendInviteEmail(email: string, inviteLink: string) {
  const fromAddress = env.EMAIL_FROM ?? "POP LMS <team@resend.dev>";

  await sendEmail({
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
  const fromAddress = env.EMAIL_FROM;

  if (!fromAddress) {
    throw new Error("Missing EMAIL_FROM environment variable.");
  }

  const html = renderSignInEmailHtml({ url, host, expiresInMinutes });
  const text = renderSignInEmailText({ url, host, expiresInMinutes });

  await sendEmail({
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

  const fromAddress = env.EMAIL_FROM ?? "POP LMS <team@resend.dev>";
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

  await sendEmail({
    from: fromAddress,
    to: uniqueRecipients,
    subject,
    html,
    text
  });
}

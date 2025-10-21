import { env } from "./env";

export async function sendInviteEmail(email: string, inviteLink: string) {
  if (!env.RESEND_API_KEY) {
    console.info("Resend API key missing; skipping email send.");
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: "POP LMS <team@resend.dev>",
      to: [email],
      subject: "You're invited to the POP LMS",
      html: `<p>You've been invited to the POP LMS. Join here: <a href="${inviteLink}">Accept invite</a></p>`
    })
  });
}
